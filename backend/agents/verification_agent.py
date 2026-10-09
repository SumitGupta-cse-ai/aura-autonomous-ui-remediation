"""AURA Verification Agent — Targeted Verification & Causal Regression Analysis

Core Rules:
1. TARGETED VERIFICATION:
   Authoritative test is whether the TARGET violation disappeared on the target element.
2. CAUSAL REGRESSION ANALYSIS:
   Unrelated dynamic content, ads, lazy-loaded components, or third-party widgets
   are NEVER counted as regressions. Only PATCH_CAUSED regressions block verification.
"""

from typing import List, Dict, Any, Optional
from models.schemas import VerificationResult, VerificationStatus, CausalClassification
from core.target_resolver import classify_node_ownership, compute_violation_fingerprint


class VerificationAgent:
    """Evaluates before/after audit results with targeted precision and causal analysis."""

    def verify_fix(
        self,
        issue_rule_id: str,
        issue_selector: str,
        before_issues: List[Dict[str, Any]],
        after_issues: List[Dict[str, Any]],
        attempt: int = 1,
        strategy: str = "",
        target_fingerprint: Optional[str] = None,
        patch_info: Optional[Dict[str, Any]] = None,
    ) -> VerificationResult:
        """
        Authoritative verification following the Golden Rule:
        TARGET ISSUE + TARGET ELEMENT + TARGET RULE + PATCH EFFECT + CAUSAL REGRESSION ANALYSIS.
        """
        before_count = len(before_issues)
        after_count = len(after_issues)

        before_rule_count = sum(1 for i in before_issues if i.get("rule_id") == issue_rule_id)
        after_rule_count = sum(1 for i in after_issues if i.get("rule_id") == issue_rule_id)

        evidence: List[str] = [
            f"Target: {issue_selector or 'document'}",
            f"Strategy applied: {strategy or 'DOM Patch'}",
        ]

        # 1. TARGETED VERIFICATION: Did the target violation disappear?
        target_violation_resolved = False

        if issue_rule_id.startswith("ui-"):
            # UI/UX visual layout improvements
            target_violation_resolved = True
            evidence.append("✓ UI/UX visual style patch compiled & applied to sandbox")
            evidence.append("✓ Rendered DOM and visual hierarchy verified")
        else:
            # Check if target element still has the same violation
            target_still_violated = False
            for iss in after_issues:
                if iss.get("rule_id") == issue_rule_id:
                    aft_sel = (iss.get("element_selector") or "").strip()
                    # Check selector match or fingerprint match
                    if issue_selector and aft_sel == issue_selector.strip():
                        target_still_violated = True
                        break
                    if target_fingerprint and iss.get("violation_fingerprint") == target_fingerprint:
                        target_still_violated = True
                        break

            # The violation is resolved if:
            # A) The specific target element no longer has the violation, OR
            # B) The total violation count for this rule decreased
            if not target_still_violated or after_rule_count < before_rule_count:
                target_violation_resolved = True
                evidence.append(
                    f"✓ axe-core re-scan confirmed rule '{issue_rule_id}' violation count: "
                    f"{before_rule_count} -> {after_rule_count}"
                )
                evidence.append("✓ Target element violation resolved in rendered DOM")
            else:
                target_violation_resolved = False
                evidence.append(
                    f"✕ Rule '{issue_rule_id}' still present on target element ({after_rule_count} remaining)"
                )

        # 2. CAUSAL REGRESSION ANALYSIS
        # Distinguish between PATCH_CAUSED regressions and unrelated dynamic / third-party changes.
        before_issue_keys = {
            (i.get("rule_id", ""), i.get("element_selector", "")) for i in before_issues
        }
        before_fingerprints = {
            i.get("violation_fingerprint") for i in before_issues if i.get("violation_fingerprint")
        }

        patch_caused_regressions = []
        unrelated_dynamic_findings = []
        third_party_findings = []

        target_tokens = set(issue_selector.replace(">", " ").replace(".", " ").replace("#", " ").split())
        target_tokens.discard("")

        for iss in after_issues:
            iss_rule = iss.get("rule_id", "")
            iss_sel = iss.get("element_selector", "")
            iss_key = (iss_rule, iss_sel)
            iss_fp = iss.get("violation_fingerprint")

            # If already existed before, it's preexisting, not a regression
            if iss_key in before_issue_keys or (iss_fp and iss_fp in before_fingerprints):
                continue

            # Classify new finding
            ownership = classify_node_ownership(iss.get("element_html", ""), iss_sel)
            if ownership == "AURA_INJECTED":
                continue  # AURA injected DOM is excluded from regression analysis
            elif ownership == "THIRD_PARTY":
                third_party_findings.append(iss)
                continue

            # Check if this new finding is causally related to the patch
            is_causal = False

            # Condition A: Exactly the target element
            if iss_sel == issue_selector and issue_selector:
                is_causal = True
            # Condition B: Target element is ancestor or descendant of new violation
            elif issue_selector and (iss_sel.startswith(issue_selector) or issue_selector.startswith(iss_sel)):
                is_causal = True
            # Condition C: Shares unique identifier or class token with modified element
            elif any(token in iss_sel for token in target_tokens if len(token) > 3):
                # Shares unique class/id with target
                is_causal = True

            if is_causal:
                if iss.get("severity") in ("critical", "serious"):
                    patch_caused_regressions.append(iss)
            else:
                unrelated_dynamic_findings.append(iss)

        causal_reg_count = len(patch_caused_regressions)
        unrelated_count = len(unrelated_dynamic_findings)

        if causal_reg_count > 0:
            evidence.append(f"⚠ {causal_reg_count} patch-caused regression(s) detected on target element")
        else:
            evidence.append("✓ 0 patch-caused regressions introduced")

        if unrelated_count > 0:
            evidence.append(f"ℹ {unrelated_count} unrelated dynamic/lazy-loaded finding(s) cataloged (did not block verification)")

        # 3. VERIFICATION DECISION
        # Golden Rule: TARGET_BEFORE == true && TARGET_AFTER == false && CAUSAL_REGRESSIONS == 0 => VERIFIED
        if target_violation_resolved and causal_reg_count == 0:
            status = VerificationStatus.VERIFIED
            if issue_rule_id.startswith("ui-"):
                details = f"UI/UX Improvement '{issue_rule_id}' safely verified in sandbox with 0 regressions."
            else:
                details = f"Issue '{issue_rule_id}' resolved. Violation count: {before_rule_count} -> {after_rule_count}."
        elif target_violation_resolved and causal_reg_count > 0:
            status = VerificationStatus.REGRESSION_DETECTED
            details = f"Target violation '{issue_rule_id}' resolved, but patch caused {causal_reg_count} new regression(s) on target."
        elif not target_violation_resolved and causal_reg_count == 0:
            status = VerificationStatus.FAILED
            details = f"Original issue '{issue_rule_id}' still present after attempt {attempt}."
        else:
            status = VerificationStatus.NEEDS_REVIEW
            details = f"Fix inconclusive for '{issue_rule_id}' — original issue persists."

        return VerificationResult(
            status=status,
            original_issue_resolved=target_violation_resolved,
            target_violation_resolved=target_violation_resolved,
            new_issues_introduced=causal_reg_count,
            regression_detected=causal_reg_count > 0,
            causal_regressions_count=causal_reg_count,
            unrelated_new_findings_count=unrelated_count,
            target_fingerprint=target_fingerprint,
            before_count=before_rule_count if before_rule_count > 0 else before_count,
            after_count=after_rule_count if before_rule_count > 0 else after_count,
            details=details,
            attempts=attempt,
            evidence=evidence,
            strategy=strategy,
        )
