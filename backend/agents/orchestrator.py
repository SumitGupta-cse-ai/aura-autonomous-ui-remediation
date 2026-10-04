"""AURA Agent Orchestrator — Controls the OBSERVE → REASON → ACT → VERIFY loop."""

import asyncio
import time
import uuid
import os
import difflib
from datetime import datetime
from typing import List, Dict, Any, Optional, Callable, Awaitable

from models.schemas import (
    AccessibilityIssue, TimelineEvent, TimelineEventType, IssueAnalysis,
    FixPlan, VerificationResult, VerificationStatus, IssueSeverity,
    IssueStatus, ScanStatus, ScanSummary, ScanData,
)
from agents.browser_agent import BrowserAgent
from agents.analysis_agent import AnalysisAgent
from agents.vision_agent import VisionAgent
from agents.fix_planner import FixPlannerAgent
from agents.verification_agent import VerificationAgent
from core.patch_compiler import compile_patch
from core.safety_validator import validate_fix_plan

MAX_FIX_ATTEMPTS = 3


class Orchestrator:
    """Main agent orchestrator — controls the full scan/fix/verify lifecycle."""

    def __init__(self):
        self.browser_agent = BrowserAgent()
        self.analysis_agent = AnalysisAgent()
        self.vision_agent = VisionAgent()
        self.fix_planner = FixPlannerAgent()
        self.verification_agent = VerificationAgent()

        self._scans: Dict[str, ScanData] = {}
        self._event_callbacks: Dict[str, List[Callable]] = {}
        self._pages: Dict[str, Any] = {}
        self._contexts: Dict[str, Any] = {}
        self._before_issues: Dict[str, List[Dict]] = {}
        self._scan_semaphore = asyncio.Semaphore(2)

    async def start(self):
        await self.browser_agent.start()

    async def stop(self):
        for ctx in self._contexts.values():
            try:
                await ctx.close()
            except Exception:
                pass
        await self.browser_agent.stop()

    def register_event_callback(self, scan_id: str, callback: Callable):
        if scan_id not in self._event_callbacks:
            self._event_callbacks[scan_id] = []
        self._event_callbacks[scan_id].append(callback)

    def unregister_event_callbacks(self, scan_id: str):
        self._event_callbacks.pop(scan_id, None)

    async def _emit_event(self, scan_id: str, event_type: TimelineEventType,
                          message: str, details: str = None, duration_ms: int = None):
        event = TimelineEvent(
            event_type=event_type,
            message=message,
            details=details,
            duration_ms=duration_ms,
        )

        if scan_id in self._scans:
            self._scans[scan_id].timeline.append(event)

        for cb in self._event_callbacks.get(scan_id, []):
            try:
                if asyncio.iscoroutinefunction(cb):
                    await cb(event)
                else:
                    cb(event)
            except Exception as e:
                print(f"[Orchestrator] Event callback error: {e}")

    def get_scan(self, scan_id: str) -> Optional[ScanData]:
        return self._scans.get(scan_id)

    def get_all_scans(self) -> List[ScanData]:
        return list(self._scans.values())

    async def run_scan(self, scan_id: str, url: str):
        scan = ScanData(
            scan_id=scan_id,
            url=url,
            status=ScanStatus.PENDING,
            created_at=datetime.utcnow().isoformat(),
        )
        self._scans[scan_id] = scan

        try:
            scan.status = ScanStatus.SCANNING
            await self._emit_event(scan_id, TimelineEventType.ACTION, "Scan started", f"Target: {url}")
            await self._emit_event(scan_id, TimelineEventType.INFO, "URL validated")

            # LRU eviction: close oldest contexts if more than 4 are open to save RAM
            while len(self._contexts) > 4:
                old_id = next(iter(self._contexts))
                old_ctx = self._contexts.pop(old_id, None)
                if old_ctx and hasattr(old_ctx, "close"):
                    try:
                        await old_ctx.close()
                    except Exception:
                        pass
                self._pages.pop(old_id, None)

            t0 = time.time()
            scan_mode = "Playwright" if not self.browser_agent.use_fallback else "HTTP fallback"
            await self._emit_event(scan_id, TimelineEventType.ACTION, f"Browser launched ({scan_mode})")

            async with self._scan_semaphore:
                context = await self.browser_agent.create_context()
                self._contexts[scan_id] = context

                try:
                    page = await self.browser_agent.load_page(url, context)
                except RuntimeError as e:
                    scan.status = ScanStatus.ERROR
                    await self._emit_event(scan_id, TimelineEventType.ERROR,
                                           f"Failed to load page: {str(e)}",
                                           "Check that the URL is accessible and the server is running")
                    return

                self._pages[scan_id] = page
                load_ms = int((time.time() - t0) * 1000)

                # Detect if page content was actually loaded
                html = getattr(page, "patched_html", "") or getattr(page, "html_content", "")
                if not html or len(html.strip()) < 20:
                    scan.status = ScanStatus.ERROR
                    await self._emit_event(scan_id, TimelineEventType.ERROR,
                                           "Page returned empty or minimal content",
                                           "This may indicate bot protection, authentication, or the page requires JavaScript rendering")
                    return

            await self._emit_event(scan_id, TimelineEventType.SUCCESS,
                                   f"Page loaded ({len(html):,} bytes)",
                                   f"Took {load_ms}ms",
                                   duration_ms=load_ms)

            screenshot = await self.browser_agent.take_screenshot(page)
            scan.screenshot = screenshot
            await self._emit_event(scan_id, TimelineEventType.INFO, "Screenshot captured")

            scan.status = ScanStatus.AUDITING
            await self._emit_event(scan_id, TimelineEventType.ACTION, "Accessibility audit started", "Running axe-core analysis")

            t0 = time.time()
            raw_issues = await self.browser_agent.run_axe_audit(page)
            audit_ms = int((time.time() - t0) * 1000)

            await self._emit_event(scan_id, TimelineEventType.SUCCESS,
                                   f"Audit completed — {len(raw_issues)} issues detected",
                                   f"axe-core analysis took {audit_ms}ms",
                                   duration_ms=audit_ms)

            self._before_issues[scan_id] = raw_issues

            issues = []
            for raw in raw_issues:
                issue = AccessibilityIssue(
                    id=raw["id"],
                    rule_id=raw["rule_id"],
                    rule_description=raw.get("rule_description", ""),
                    wcag_criteria=raw.get("wcag_criteria", []),
                    severity=IssueSeverity(raw["severity"]),
                    axe_impact=raw.get("axe_impact", ""),
                    element_selector=raw.get("element_selector", ""),
                    element_html=raw.get("element_html", ""),
                    description=raw.get("description", ""),
                    help_url=raw.get("help_url", ""),
                    before_screenshot=screenshot,
                )
                issues.append(issue)
            scan.issues = issues
            scan.summary = self._compute_summary(issues)

            scan.status = ScanStatus.ANALYZING
            await self._emit_event(scan_id, TimelineEventType.ACTION, "AI analysis started", f"Analyzing {len(issues)} issues")

            async def _analyze_issue_task(iss: AccessibilityIssue):
                try:
                    dom_context = await self.browser_agent.get_element_context(page, iss.element_selector)
                    iss.element_context = str(dom_context)[:500]

                    analysis = await self.analysis_agent.analyze_issue(
                        rule_id=iss.rule_id,
                        description=iss.description,
                        severity=iss.severity.value,
                        element_html=iss.element_html,
                        selector=iss.element_selector,
                        dom_context=dom_context,
                        wcag_criteria=iss.wcag_criteria,
                    )
                    iss.analysis = analysis
                except Exception as e:
                    print(f"[Orchestrator] Analysis failed for {iss.id}: {e}")

            # Analyze all issues concurrently in parallel
            await asyncio.gather(*[_analyze_issue_task(iss) for iss in issues])

            await self._emit_event(scan_id, TimelineEventType.SUCCESS, f"Analysis completed for {len(issues)} issues")

            scan.summary = self._compute_summary(issues)
            scan.status = ScanStatus.COMPLETE
            scan.completed_at = datetime.utcnow().isoformat()

            await self._emit_event(scan_id, TimelineEventType.SUCCESS,
                                   "Scan complete",
                                   f"Found {scan.summary.total_issues} issues: "
                                   f"{scan.summary.critical} critical, "
                                   f"{scan.summary.serious} serious, "
                                   f"{scan.summary.moderate} moderate, "
                                   f"{scan.summary.minor} minor")

        except Exception as e:
            scan.status = ScanStatus.ERROR
            await self._emit_event(scan_id, TimelineEventType.ERROR, f"Scan failed: {str(e)}")
            raise

    async def fix_issue(self, scan_id: str, issue_id: str) -> Dict[str, Any]:
        scan = self._scans.get(scan_id)
        if not scan:
            return {"success": False, "error": "Scan not found"}

        issue = next((i for i in scan.issues if i.id == issue_id), None)
        if not issue:
            return {"success": False, "error": "Issue not found"}

        page = self._pages.get(scan_id)
        if not page:
            return {"success": False, "error": "Browser page not available"}

        issue.status = IssueStatus.FIXING
        await self._emit_event(scan_id, TimelineEventType.ACTION,
                               f"Fix started for issue: {issue.rule_id}",
                               f"Selector: {issue.element_selector}")

        for attempt in range(1, MAX_FIX_ATTEMPTS + 1):
            await self._emit_event(scan_id, TimelineEventType.INFO, f"Fix attempt {attempt}/{MAX_FIX_ATTEMPTS}")

            try:
                result = await self._attempt_fix(scan_id, issue, page, attempt)
                if result["success"]:
                    return result
                if attempt < MAX_FIX_ATTEMPTS:
                    await self._emit_event(scan_id, TimelineEventType.WARNING,
                                           f"Fix attempt {attempt} failed, retrying...",
                                           result.get("error", ""))
            except Exception as e:
                await self._emit_event(scan_id, TimelineEventType.ERROR, f"Fix attempt {attempt} error: {str(e)}")

        issue.status = IssueStatus.FAILED
        await self._emit_event(scan_id, TimelineEventType.ERROR,
                               f"Fix failed after {MAX_FIX_ATTEMPTS} attempts: {issue.rule_id}",
                               "NOT VERIFIED — all attempts exhausted")
        scan.summary = self._compute_summary(scan.issues)
        return {"success": False, "issue_id": issue_id, "error": "All fix attempts failed"}

    async def _attempt_fix(self, scan_id: str, issue: AccessibilityIssue, page, attempt: int) -> Dict[str, Any]:
        dom_context = await self.browser_agent.get_element_context(page, issue.element_selector)

        vision_result = None
        if issue.rule_id in ("image-alt", "input-image-alt"):
            await self._emit_event(scan_id, TimelineEventType.ACTION, "Vision analysis started for image")
            img_src = await self.browser_agent.get_image_src(page, issue.element_selector)
            vision_result = await self.vision_agent.analyze_image(image_url=img_src, page_context=dom_context)
            await self._emit_event(scan_id, TimelineEventType.SUCCESS, "Vision analysis completed", f"Alt text: {vision_result.get('alt_text', 'N/A')}")

        await self._emit_event(scan_id, TimelineEventType.ACTION, "Generating fix plan")

        fix_plan = await self.fix_planner.create_fix_plan(
            issue_id=issue.id,
            rule_id=issue.rule_id,
            description=issue.description,
            selector=issue.element_selector,
            element_html=issue.element_html,
            analysis=issue.analysis.model_dump() if issue.analysis else {},
            dom_context=dom_context,
            vision_result=vision_result,
        )

        if not fix_plan:
            issue.status = IssueStatus.NEEDS_REVIEW
            await self._emit_event(scan_id, TimelineEventType.WARNING, "Could not generate fix plan — needs human review")
            scan = self._scans[scan_id]
            scan.summary = self._compute_summary(scan.issues)
            return {"success": False, "error": "No fix plan generated"}

        issue.fix_plan = fix_plan
        await self._emit_event(scan_id, TimelineEventType.SUCCESS,
                               f"Fix plan generated: {fix_plan.strategy}",
                               f"Target: {fix_plan.target.get('selector', '')}")

        is_valid, errors = validate_fix_plan(fix_plan)
        if not is_valid:
            issue.status = IssueStatus.FAILED
            error_msg = "; ".join(errors)
            await self._emit_event(scan_id, TimelineEventType.ERROR, "Patch rejected by safety validator", error_msg)
            scan = self._scans[scan_id]
            scan.summary = self._compute_summary(scan.issues)
            return {"success": False, "error": f"Safety validation failed: {error_msg}"}

        await self._emit_event(scan_id, TimelineEventType.SUCCESS, "Patch validated by safety engine")

        patch_result = compile_patch(fix_plan)
        if not patch_result.success:
            await self._emit_event(scan_id, TimelineEventType.ERROR, "Patch compilation failed", patch_result.error)
            return {"success": False, "error": patch_result.error}

        before_screenshot = await self.browser_agent.take_screenshot(page)
        issue.before_screenshot = before_screenshot

        # Save state before this specific fix attempt so rollback preserves previously verified fixes
        previous_patched_html = getattr(page, "patched_html", getattr(page, "html_content", ""))

        await self._emit_event(scan_id, TimelineEventType.ACTION, "Applying patch in sandbox", "SANDBOX PREVIEW — original site unchanged")

        apply_result = await self.browser_agent.apply_patch(page, patch_result.patch_js, fix_plan, scan_id=scan_id)
        if not apply_result.get("success", False):
            await self._emit_event(scan_id, TimelineEventType.ERROR, "Patch application failed", apply_result.get("error", "Unknown error"))
            return {"success": False, "error": "Patch application failed"}

        # Store original and patched HTML for diff
        issue.original_html_snippet = apply_result.get("original_html", "")[:5000]
        issue.patched_html_snippet = apply_result.get("patched_html", "")[:5000]

        # Generate DOM diff
        if issue.original_html_snippet and issue.patched_html_snippet:
            diff_lines = list(difflib.unified_diff(
                issue.original_html_snippet.splitlines(keepends=True),
                issue.patched_html_snippet.splitlines(keepends=True),
                fromfile="original.html",
                tofile="patched.html",
                lineterm="",
            ))
            issue.dom_diff = "\n".join(diff_lines)[:3000]

        await self._emit_event(scan_id, TimelineEventType.SUCCESS, "Sandbox patch applied")
        await asyncio.sleep(0.3)

        after_screenshot = await self.browser_agent.take_screenshot(page, is_patched=True)
        issue.after_screenshot = after_screenshot

        await self._emit_event(scan_id, TimelineEventType.ACTION, "Re-audit started", "Running axe-core on patched page")

        t0 = time.time()
        after_issues = await self.browser_agent.run_axe_audit(page)
        reaudit_ms = int((time.time() - t0) * 1000)

        await self._emit_event(scan_id, TimelineEventType.SUCCESS,
                               f"Re-audit completed — {len(after_issues)} issues remaining",
                               f"Took {reaudit_ms}ms",
                               duration_ms=reaudit_ms)

        before_issues = self._before_issues.get(scan_id, [])
        verification = self.verification_agent.verify_fix(
            issue_rule_id=issue.rule_id,
            issue_selector=issue.element_selector,
            before_issues=before_issues,
            after_issues=after_issues,
            attempt=attempt,
        )
        issue.verification = verification

        if verification.status == VerificationStatus.VERIFIED:
            issue.status = IssueStatus.FIXED
            render_url = os.getenv("RENDER_EXTERNAL_URL")
            app_url = os.getenv("APP_URL") or os.getenv("BACKEND_URL")
            base_url = render_url.rstrip("/") if render_url else app_url.rstrip("/") if app_url else f"http://localhost:{os.getenv('PORT', '8000')}"
            scan = self._scans[scan_id]
            scan.sandbox_url = f"{base_url}/sandbox/{scan_id}"
            await self._emit_event(scan_id, TimelineEventType.SUCCESS,
                                   f"Fix VERIFIED ✓ — {issue.rule_id}",
                                   verification.details)
            self._before_issues[scan_id] = after_issues
            scan.summary = self._compute_summary(scan.issues)
            return {
                "success": True,
                "issue_id": issue.id,
                "verification": verification.model_dump(),
                "patch_applied": True,
            }

        elif verification.status == VerificationStatus.REGRESSION_DETECTED:
            # ROLLBACK: restore previous_patched_html to preserve previously verified fixes!
            page.patched_html = previous_patched_html
            await self._emit_event(scan_id, TimelineEventType.WARNING, "Regression detected — rolling back patch")
            await self.browser_agent.apply_rollback(page, patch_result.rollback_js)
            issue.status = IssueStatus.ROLLED_BACK
            await self._emit_event(scan_id, TimelineEventType.INFO, "Patch rolled back — changes reverted")
            scan = self._scans[scan_id]
            scan.summary = self._compute_summary(scan.issues)
            return {"success": False, "error": "Regression detected, patch rolled back"}

        else:
            # ROLLBACK: restore previous_patched_html to preserve previously verified fixes!
            page.patched_html = previous_patched_html
            await self.browser_agent.apply_rollback(page, patch_result.rollback_js)
            await self._emit_event(scan_id, TimelineEventType.WARNING,
                                   f"Verification failed — attempt {attempt}",
                                   verification.details)
            return {"success": False, "error": verification.details}

    async def fix_all_issues(self, scan_id: str) -> List[Dict[str, Any]]:
        scan = self._scans.get(scan_id)
        if not scan:
            return [{"success": False, "error": "Scan not found"}]

        results = []
        fixable = [
            i for i in scan.issues
            if i.status == IssueStatus.UNRESOLVED
            and (i.analysis is None or i.analysis.is_auto_remediable)
        ]

        await self._emit_event(scan_id, TimelineEventType.ACTION, f"Auto-fixing {len(fixable)} issues")

        for issue in fixable:
            result = await self.fix_issue(scan_id, issue.id)
            results.append(result)
            await asyncio.sleep(0.3)

        fixed_count = sum(1 for r in results if r.get("success"))
        await self._emit_event(scan_id, TimelineEventType.SUCCESS,
                               f"Auto-fix complete: {fixed_count}/{len(fixable)} verified")

        return results

    def generate_report(self, scan_id: str) -> Optional[Dict[str, Any]]:
        scan = self._scans.get(scan_id)
        if not scan:
            return None

        wcag_mappings = {}
        for issue in scan.issues:
            for wc in issue.wcag_criteria:
                if wc not in wcag_mappings:
                    wcag_mappings[wc] = []
                wcag_mappings[wc].append(issue.rule_id)

        fixes_applied = []
        for issue in scan.issues:
            if issue.fix_plan and issue.verification:
                fixes_applied.append({
                    "issue_id": issue.id,
                    "rule": issue.rule_id,
                    "strategy": issue.fix_plan.strategy,
                    "verification_status": issue.verification.status.value,
                })

        summary = self._compute_summary(scan.issues)

        return {
            "scan_id": scan.scan_id,
            "url": scan.url,
            "scan_timestamp": scan.created_at,
            "total_issues": summary.total_issues,
            "issues_by_severity": {
                "critical": summary.critical,
                "serious": summary.serious,
                "moderate": summary.moderate,
                "minor": summary.minor,
            },
            "issues_fixed": summary.fixed,
            "issues_unresolved": summary.unresolved,
            "issues_needs_review": summary.needs_review,
            "wcag_mappings": wcag_mappings,
            "fixes_applied": fixes_applied,
            "limitations": [
                "Automated testing covers a subset of WCAG criteria",
                "AI-generated fixes should be reviewed by a human",
                "Visual analysis confidence varies by image complexity",
                "Dynamic content loaded after initial page load may not be fully tested",
            ],
        }

    def _compute_summary(self, issues: List[AccessibilityIssue]) -> ScanSummary:
        return ScanSummary(
            total_issues=len(issues),
            critical=sum(1 for i in issues if i.severity == IssueSeverity.CRITICAL),
            serious=sum(1 for i in issues if i.severity == IssueSeverity.SERIOUS),
            moderate=sum(1 for i in issues if i.severity == IssueSeverity.MODERATE),
            minor=sum(1 for i in issues if i.severity == IssueSeverity.MINOR),
            fixed=sum(1 for i in issues if i.status == IssueStatus.FIXED),
            unresolved=sum(1 for i in issues if i.status == IssueStatus.UNRESOLVED),
            needs_review=sum(1 for i in issues if i.status == IssueStatus.NEEDS_REVIEW),
        )
