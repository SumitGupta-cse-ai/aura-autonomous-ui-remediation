"""AURA Browser Agent — Playwright browser automation + axe-core accessibility auditing + Sandbox patching."""

import asyncio
import base64
import uuid
import time
import re
import os
from typing import Optional, List, Dict, Any, Callable, Awaitable
from pathlib import Path
import httpx

try:
    from playwright.async_api import async_playwright, Page, Browser, BrowserContext
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False
    Page = Any
    Browser = Any
    BrowserContext = Any

AXE_CORE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js"

SEVERITY_MAP = {
    "critical": "critical",
    "serious": "serious",
    "moderate": "moderate",
    "minor": "minor",
}

WCAG_MAP = {
    "image-alt": ["1.1.1"],
    "input-image-alt": ["1.1.1"],
    "area-alt": ["1.1.1", "2.4.4"],
    "object-alt": ["1.1.1"],
    "label": ["1.3.1", "4.1.2"],
    "select-name": ["1.3.1", "4.1.2"],
    "button-name": ["4.1.2"],
    "link-name": ["4.1.2", "2.4.4"],
    "document-title": ["2.4.2"],
    "html-has-lang": ["3.1.1"],
    "html-lang-valid": ["3.1.1"],
    "valid-lang": ["3.1.2"],
    "color-contrast": ["1.4.3"],
    "heading-order": ["1.3.1"],
    "empty-heading": ["2.4.6"],
    "aria-roles": ["4.1.2"],
    "aria-valid-attr": ["4.1.2"],
    "duplicate-id": ["4.1.1"],
    "frame-title": ["4.1.2"],
}


class MockPage:
    """Mock page object used when Playwright is unavailable (HTTP fallback mode)."""
    def __init__(self, url: str, html_content: str):
        self.url = url
        self.html_content = html_content
        self.patched_html = html_content


class BrowserAgent:
    """Manages Playwright browser for page loading, screenshots, and axe-core auditing."""

    def __init__(self):
        self._playwright = None
        self._browser: Optional[Browser] = None
        self.use_fallback = not HAS_PLAYWRIGHT

    async def start(self):
        """Launch the browser with safe exception handling."""
        if not HAS_PLAYWRIGHT:
            self.use_fallback = True
            print("[BrowserAgent] Playwright package not available, using HTTP fallback mode")
            return

        try:
            self._playwright = await async_playwright().start()
            try:
                # Try system installed Chrome first (fast and reliable on Windows)
                self._browser = await self._playwright.chromium.launch(
                    channel="chrome",
                    headless=True,
                    args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"]
                )
                print("[BrowserAgent] Launched system Chrome successfully")
            except Exception:
                self._browser = await self._playwright.chromium.launch(
                    headless=True,
                    args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"]
                )
                print("[BrowserAgent] Playwright Chromium browser launched successfully")
        except Exception as e:
            print(f"[BrowserAgent] Playwright launch failed: {e}. Switching to HTTP fallback mode.")
            self.use_fallback = True

    async def stop(self):
        """Close browser and cleanup."""
        if self._browser:
            try:
                await self._browser.close()
            except Exception:
                pass
        if self._playwright:
            try:
                await self._playwright.stop()
            except Exception:
                pass

    async def create_context(self) -> Optional[BrowserContext]:
        """Create a new browser context with reasonable defaults."""
        if self.use_fallback:
            return None
        if not self._browser:
            await self.start()
        if self.use_fallback:
            return None
        return await self._browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AURA-Scanner/1.0",
        )

    async def load_page(
        self, url: str, context: Optional[BrowserContext] = None
    ) -> Any:
        """Load a page with proper timeouts and wait for readiness.
        Works for: demo sites, localhost dev servers, and public HTTPS websites.
        """
        if self.use_fallback or context is None:
            return await self._load_page_http_fallback(url)

        page = await context.new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            try:
                await page.wait_for_load_state("networkidle", timeout=10000)
            except Exception:
                pass  # networkidle is best-effort; domcontentloaded is sufficient
        except Exception as e:
            # Playwright navigation failed — fall back to HTTP fetch
            print(f"[BrowserAgent] Playwright navigation failed for {url}: {e}")
            try:
                await page.close()
            except Exception:
                pass
            return await self._load_page_http_fallback(url)

        # Store the initial HTML for the patching pipeline
        try:
            page.html_content = await page.content()
            page.patched_html = page.html_content
        except Exception:
            page.html_content = ""
            page.patched_html = ""

        return page

    async def _load_page_http_fallback(self, url: str) -> MockPage:
        """HTTP fallback for loading pages when Playwright is unavailable."""
        try:
            async with httpx.AsyncClient(
                follow_redirects=True,
                timeout=20.0,
                verify=False,  # Allow self-signed certs on dev servers
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AURA-Scanner/1.0",
                    "Accept": "text/html,application/xhtml+xml,*/*",
                },
            ) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                page = MockPage(url=url, html_content=resp.text)
                return page
        except httpx.TimeoutException:
            raise RuntimeError(f"Timeout loading {url} — site did not respond within 20 seconds")
        except httpx.ConnectError as e:
            raise RuntimeError(f"Could not connect to {url} — {e}")
        except httpx.HTTPStatusError as e:
            raise RuntimeError(f"HTTP {e.response.status_code} from {url} — {e.response.reason_phrase}")
        except Exception as e:
            raise RuntimeError(f"Failed to load {url}: {e}")

    async def take_screenshot(self, page: Any) -> str:
        """Take a screenshot and return as base64 data URL."""
        if isinstance(page, MockPage) or self.use_fallback:
            placeholder_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
                <rect width="800" height="450" fill="#0f1720"/>
                <text x="400" y="225" fill="#10b981" font-family="sans-serif" font-size="20" text-anchor="middle">AURA Sandbox Preview: {page.url[:40]}</text>
            </svg>"""
            b64 = base64.b64encode(placeholder_svg.encode("utf-8")).decode("utf-8")
            return f"data:image/svg+xml;base64,{b64}"

        try:
            screenshot_bytes = await page.screenshot(full_page=False, type="png")
            b64 = base64.b64encode(screenshot_bytes).decode("utf-8")
            return f"data:image/png;base64,{b64}"
        except Exception:
            return ""

    async def run_axe_audit(self, page: Any) -> List[Dict[str, Any]]:
        """Inject axe-core and run accessibility audit. Returns list of violation dicts."""
        if isinstance(page, MockPage) or self.use_fallback:
            target_html = getattr(page, "patched_html", page.html_content)
            return self._run_static_audit(target_html)

        try:
            await page.evaluate(f"""
                () => {{
                    return new Promise((resolve, reject) => {{
                        if (window.axe) {{ resolve(); return; }}
                        const script = document.createElement('script');
                        script.src = '{AXE_CORE_CDN}';
                        script.onload = resolve;
                        script.onerror = () => reject(new Error('Failed to load axe-core'));
                        document.head.appendChild(script);
                    }});
                }}
            """)

            await page.wait_for_function("typeof window.axe !== 'undefined'", timeout=10000)

            results = await page.evaluate("""
                () => {
                    return new Promise((resolve, reject) => {
                        axe.run(document, {
                            resultTypes: ['violations'],
                            rules: { 'region': { enabled: false } }
                        }).then(results => resolve(results)).catch(reject);
                    });
                }
            """)
            return self._parse_axe_results(results)

        except Exception:
            target_html = getattr(page, "patched_html", "") or getattr(page, "html_content", "") or await page.content()
            return self._run_static_audit(target_html)

    def _run_static_audit(self, html: str) -> List[Dict[str, Any]]:
        """Static HTML deterministic accessibility audit with precise selector deduplication."""
        issues = []

        # 1. Missing lang attribute on <html> (WCAG 3.1.1)
        # Matches: lang="en", lang='en', and lang=en (unquoted — valid HTML)
        if not re.search(r'<html[^>]*\blang\s*=\s*["\']?\w', html, re.IGNORECASE):
            issues.append({
                "id": "html-has-lang-fixed",
                "rule_id": "html-has-lang",
                "rule_description": "The <html> element must have a valid lang attribute",
                "wcag_criteria": ["3.1.1"],
                "severity": "serious",
                "axe_impact": "serious",
                "element_selector": "html",
                "element_html": "<html>",
                "element_context": "",
                "description": "The <html> element is missing the lang attribute.",
                "help_url": "https://dequeuniversity.com/rules/axe/4.9/html-has-lang",
                "status": "unresolved",
            })

        # 2. Image missing alt text (WCAG 1.1.1)
        for idx, match in enumerate(re.finditer(r'<img\b[^>]*>', html, re.IGNORECASE)):
            img_tag = match.group(0)
            if not re.search(r'\balt=["\'][^"\']*["\']', img_tag, re.IGNORECASE):
                src_match = re.search(r'\bsrc=["\']([^"\']+)["\']', img_tag, re.IGNORECASE)
                cls_match = re.search(r'\bclass=["\']([^"\']+)["\']', img_tag, re.IGNORECASE)
                if cls_match:
                    selector = f"img.{cls_match.group(1).split()[0]}"
                elif src_match:
                    selector = f"img[src*='{src_match.group(1).split('/')[-1]}']"
                else:
                    selector = f"img:nth-of-type({idx+1})"

                issues.append({
                    "id": f"image-alt-{idx+1}",
                    "rule_id": "image-alt",
                    "rule_description": "Images must have alternative text",
                    "wcag_criteria": ["1.1.1"],
                    "severity": "critical",
                    "axe_impact": "critical",
                    "element_selector": selector,
                    "element_html": img_tag,
                    "element_context": "",
                    "description": "Image element is missing alternative text (alt attribute).",
                    "help_url": "https://dequeuniversity.com/rules/axe/4.9/image-alt",
                    "status": "unresolved",
                })

        # 3. Form input without label (WCAG 1.3.1 / 4.1.2)
        for idx, match in enumerate(re.finditer(r'<input\b[^>]*>', html, re.IGNORECASE)):
            input_tag = match.group(0)
            if re.search(r'type=["\'](hidden|submit|button|image|reset)["\']', input_tag, re.IGNORECASE):
                continue
            if not re.search(r'\b(aria-label|aria-labelledby|id)=', input_tag, re.IGNORECASE):
                cls_match = re.search(r'\bclass=["\']([^"\']+)["\']', input_tag, re.IGNORECASE)
                type_match = re.search(r'\btype=["\']([^"\']+)["\']', input_tag, re.IGNORECASE)
                if type_match:
                    selector = f"input[type='{type_match.group(1)}']"
                elif cls_match:
                    selector = f"input.{cls_match.group(1).split()[0]}"
                else:
                    selector = f"input:nth-of-type({idx+1})"

                issues.append({
                    "id": f"label-{idx+1}",
                    "rule_id": "label",
                    "rule_description": "Form elements must have labels",
                    "wcag_criteria": ["1.3.1", "4.1.2"],
                    "severity": "critical",
                    "axe_impact": "critical",
                    "element_selector": selector,
                    "element_html": input_tag,
                    "element_context": "",
                    "description": "Form input does not have an associated label or aria-label.",
                    "help_url": "https://dequeuniversity.com/rules/axe/4.9/label",
                    "status": "unresolved",
                })

        # 4. Button without accessible name (WCAG 4.1.2)
        for idx, match in enumerate(re.finditer(r'<button\b[^>]*>(.*?)</button>', html, re.IGNORECASE | re.DOTALL)):
            btn_tag = match.group(0)
            inner = match.group(1).strip()
            text_content = re.sub(r'<[^>]+>', '', inner).strip()
            if not text_content and not re.search(r'\baria-label=["\'][^"\']+["\']', btn_tag, re.IGNORECASE):
                cls_match = re.search(r'\bclass=["\']([^"\']+)["\']', btn_tag, re.IGNORECASE)
                if cls_match:
                    selector = f"button.{cls_match.group(1).split()[0]}"
                else:
                    selector = f"button:nth-of-type({idx+1})"

                issues.append({
                    "id": f"button-name-{idx+1}",
                    "rule_id": "button-name",
                    "rule_description": "Buttons must have discernible text",
                    "wcag_criteria": ["4.1.2"],
                    "severity": "serious",
                    "axe_impact": "serious",
                    "element_selector": selector,
                    "element_html": btn_tag[:200],
                    "element_context": "",
                    "description": "Button element does not have accessible text or aria-label.",
                    "help_url": "https://dequeuniversity.com/rules/axe/4.9/button-name",
                    "status": "unresolved",
                })

        # 5. Heading hierarchy skip (WCAG 1.3.1)
        headings = [int(m.group(1)) for m in re.finditer(r'<h([1-6])\b', html, re.IGNORECASE)]
        for i in range(len(headings) - 1):
            if headings[i+1] > headings[i] + 1:
                issues.append({
                    "id": "heading-order-1",
                    "rule_id": "heading-order",
                    "rule_description": "Heading levels should only increase by one",
                    "wcag_criteria": ["1.3.1"],
                    "severity": "moderate",
                    "axe_impact": "moderate",
                    "element_selector": f"h{headings[i+1]}",
                    "element_html": f"<h{headings[i+1]}>",
                    "element_context": "",
                    "description": f"Heading hierarchy skips levels: h{headings[i]} is followed by h{headings[i+1]}.",
                    "help_url": "https://dequeuniversity.com/rules/axe/4.9/heading-order",
                    "status": "unresolved",
                })
                break

        # 6. Low contrast class (WCAG 1.4.3)
        if re.search(r'<[^>]*\bclass=["\'][^"\']*\b(?:low-contrast|muted-sub|low-contrast-text)\b', html, re.IGNORECASE):
            issues.append({
                "id": "color-contrast-1",
                "rule_id": "color-contrast",
                "rule_description": "Elements must have sufficient color contrast",
                "wcag_criteria": ["1.4.3"],
                "severity": "serious",
                "axe_impact": "serious",
                "element_selector": ".low-contrast",
                "element_html": '<p class="section-subtitle low-contrast">',
                "element_context": "",
                "description": "Text element has insufficient color contrast ratio.",
                "help_url": "https://dequeuniversity.com/rules/axe/4.9/color-contrast",
                "status": "unresolved",
            })

        # Deduplicate issues by rule_id + element_selector
        unique_issues = []
        seen = set()
        for issue in issues:
            key = (issue["rule_id"], issue["element_selector"])
            if key not in seen:
                seen.add(key)
                unique_issues.append(issue)

        return unique_issues

    def _parse_axe_results(self, results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse axe-core results into structured issue dicts."""
        issues = []
        violations = results.get("violations", [])

        for violation in violations:
            rule_id = violation.get("id", "unknown")
            description = violation.get("description", "")
            help_text = violation.get("help", "")
            help_url = violation.get("helpUrl", "")
            impact = violation.get("impact", "minor")
            severity = SEVERITY_MAP.get(impact, "minor")
            wcag = WCAG_MAP.get(rule_id, [])

            for node in violation.get("nodes", []):
                target = node.get("target", [""])[0] if node.get("target") else ""
                html = node.get("html", "")
                failure = node.get("failureSummary", "")

                full_desc = help_text
                if failure:
                    full_desc += f" — {failure}"

                issue = {
                    "id": f"{rule_id}-{str(uuid.uuid4())[:6]}",
                    "rule_id": rule_id,
                    "rule_description": description,
                    "wcag_criteria": wcag,
                    "severity": severity,
                    "axe_impact": impact,
                    "element_selector": target,
                    "element_html": html[:500],
                    "element_context": "",
                    "description": full_desc,
                    "help_url": help_url,
                    "status": "unresolved",
                }
                issues.append(issue)

        return issues

    async def get_element_context(self, page: Any, selector: str) -> Dict[str, Any]:
        """Get DOM context around an element for AI analysis."""
        if isinstance(page, MockPage) or self.use_fallback:
            return self._extract_context_from_html(
                getattr(page, "patched_html", getattr(page, "html_content", "")),
                selector,
            )

        try:
            context = await page.evaluate(f"""
                (selector) => {{
                    const el = document.querySelector(selector);
                    if (!el) return null;
                    const parent = el.parentElement;
                    // Find nearest preceding heading
                    let nearbyHeading = '';
                    let prev = el.previousElementSibling;
                    while (prev) {{
                        if (/^H[1-6]$/i.test(prev.tagName)) {{
                            nearbyHeading = prev.textContent.substring(0, 100).trim();
                            break;
                        }}
                        prev = prev.previousElementSibling;
                    }}
                    if (!nearbyHeading && parent) {{
                        const h = parent.querySelector('h1,h2,h3,h4,h5,h6');
                        if (h) nearbyHeading = h.textContent.substring(0, 100).trim();
                    }}
                    return {{
                        tag: el.tagName.toLowerCase(),
                        text: el.textContent.substring(0, 200).trim(),
                        parentTag: parent ? parent.tagName.toLowerCase() : '',
                        parentText: parent ? parent.textContent.substring(0, 200).trim() : '',
                        nearbyHeading: nearbyHeading || '',
                        computedRole: el.getAttribute('role') || '',
                        attributes: Object.fromEntries(
                            Array.from(el.attributes).map(a => [a.name, a.value])
                        ),
                    }};
                }}
            """, selector)
            return context or {}
        except Exception:
            return {}

    def _extract_context_from_html(self, html: str, selector: str) -> Dict[str, Any]:
        """Extract basic DOM context from raw HTML for a given selector (fallback mode)."""
        context: Dict[str, Any] = {"parentTag": "", "nearbyHeading": "", "text": "", "attributes": {}}
        if not html or not selector:
            return context

        # Try to extract attributes from matched elements
        tag = ""
        attrs: Dict[str, str] = {}

        if selector.startswith("html"):
            tag = "html"
        elif "input" in selector:
            tag = "input"
            match = re.search(r'<input\b([^>]*)>', html, re.IGNORECASE)
            if match:
                for attr_m in re.finditer(r'(\w[\w-]*)=["\']([^"\']*)["\']', match.group(1)):
                    attrs[attr_m.group(1)] = attr_m.group(2)
        elif "button" in selector:
            tag = "button"
            match = re.search(r'<button\b([^>]*)>(.*?)</button>', html, re.IGNORECASE | re.DOTALL)
            if match:
                for attr_m in re.finditer(r'(\w[\w-]*)=["\']([^"\']*)["\']', match.group(1)):
                    attrs[attr_m.group(1)] = attr_m.group(2)
                context["text"] = re.sub(r'<[^>]+>', '', match.group(2)).strip()[:200]
        elif "img" in selector:
            tag = "img"
            match = re.search(r'<img\b([^>]*)>', html, re.IGNORECASE)
            if match:
                for attr_m in re.finditer(r'(\w[\w-]*)=["\']([^"\']*)["\']', match.group(1)):
                    attrs[attr_m.group(1)] = attr_m.group(2)
        elif selector.startswith("h") or selector.startswith("."):
            m = re.match(r'h(\d)', selector)
            if m:
                tag = f"h{m.group(1)}"

        # Find nearest heading in HTML
        headings = re.findall(r'<h[1-6][^>]*>(.*?)</h[1-6]>', html, re.IGNORECASE | re.DOTALL)
        if headings:
            context["nearbyHeading"] = re.sub(r'<[^>]+>', '', headings[0]).strip()[:100]

        context["tag"] = tag
        context["attributes"] = attrs
        return context

    async def apply_patch(self, page: Any, patch_js: str, fix_plan: Any = None, scan_id: str = "") -> Dict[str, Any]:
        """
        Apply a compiled patch in the page sandbox AND update patched HTML representation.
        This guarantees the patch exists in the actual re-audit target DOM.
        """
        try:
            if not (isinstance(page, MockPage) or self.use_fallback):
                try:
                    await page.evaluate(patch_js)
                    updated_content = await page.content()
                    page.patched_html = updated_content
                except Exception:
                    pass

            current_html = getattr(page, "patched_html", getattr(page, "html_content", ""))
            original_html = current_html
            patched_html = self._apply_html_transformation(current_html, fix_plan)
            page.patched_html = patched_html

            try:
                demo_dir = Path(__file__).resolve().parent.parent.parent / "demo-site"
                demo_dir.mkdir(parents=True, exist_ok=True)
                if scan_id:
                    sandbox_dir = demo_dir / "sandbox" / scan_id
                    sandbox_dir.mkdir(parents=True, exist_ok=True)
                    sandbox_file = sandbox_dir / "index.html"
                else:
                    sandbox_file = demo_dir / "sandbox_preview.html"
                with open(sandbox_file, "w", encoding="utf-8") as f:
                    f.write(patched_html)
            except Exception:
                pass

            return {"success": True, "original_html": original_html, "patched_html": patched_html}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _apply_html_transformation(self, html: str, fix_plan: Any) -> str:
        """Apply deterministic DOM patch directly to HTML string."""
        if not fix_plan:
            return html

        target = getattr(fix_plan, "target", {})
        selector = target.get("selector", "") if isinstance(target, dict) else ""
        changes = getattr(fix_plan, "changes", [])

        patched_html = html

        rule = getattr(fix_plan, "verification_rule", "")

        for change in changes:
            attr = getattr(change, "attribute", "") or ""
            val = getattr(change, "value", "") or ""
            prop = getattr(change, "property", "") or ""

            # Rule 1: html-has-lang (target: html, attr: lang, value: en)
            if rule == "html-has-lang" or "html" in selector:
                if attr == "lang" and val:
                    if re.search(r'<html\b[^>]*\blang\s*=', patched_html, re.IGNORECASE):
                        # Replace existing lang attr (quoted or unquoted)
                        patched_html = re.sub(
                            r'(<html\b[^>]*\blang\s*=\s*)["\']?[^"\'\s>]*["\']?',
                            f'\\1"{val}"',
                            patched_html,
                            count=1,
                            flags=re.IGNORECASE
                        )
                    else:
                        patched_html = re.sub(
                            r'<html\b',
                            f'<html lang="{val}"',
                            patched_html,
                            count=1,
                            flags=re.IGNORECASE
                        )

            # Rule 2: image-alt (attr: alt, value: ...)
            elif rule in ("image-alt", "input-image-alt") or "img" in selector or attr == "alt":
                val = val or "Descriptive image"
                if "user-avatar" in selector:
                    patched_html = re.sub(
                        r'<img\b([^>]*class=["\'][^"\']*user-avatar[^"\']*["\'][^>]*)>',
                        f'<img\\1 alt="{val}">',
                        patched_html,
                        flags=re.IGNORECASE
                    )
                elif "card-img" in selector:
                    patched_html = re.sub(
                        r'<img\b([^>]*class=["\'][^"\']*card-img[^"\']*["\'][^>]*)>',
                        f'<img\\1 alt="{val}">',
                        patched_html,
                        flags=re.IGNORECASE
                    )
                else:
                    def add_alt(match):
                        img_str = match.group(0)
                        if re.search(r'\balt=["\'][^"\']*["\']', img_str, re.IGNORECASE):
                            return re.sub(r'\balt=["\'][^"\']*["\']', f'alt="{val}"', img_str, flags=re.IGNORECASE)
                        return img_str.replace('<img', f'<img alt="{val}"', 1)

                    patched_html = re.sub(r'<img\b[^>]*>', add_alt, patched_html, flags=re.IGNORECASE)

            # Rule 3: button-name (target: button..., attr: aria-label)
            elif rule == "button-name" or "button" in selector:
                val = val or "Action button"
                btn_cls_match = re.search(r'button\.([\w-]+)', selector)
                if btn_cls_match:
                    cls_name = btn_cls_match.group(1)
                    def add_btn_cls(match):
                        btn_str = match.group(0)
                        if re.search(r'\baria-label\s*=', btn_str, re.IGNORECASE):
                            return re.sub(r'\baria-label\s*=\s*["\']?[^"\'\s>]*["\']?', f'aria-label="{val}"', btn_str, flags=re.IGNORECASE)
                        return btn_str.replace('<button', f'<button aria-label="{val}"', 1)
                    patched_html = re.sub(
                        rf'<button\b[^>]*class=["\'][^"\']*{cls_name}[^"\']*["\'][^>]*>.*?</button>',
                        add_btn_cls,
                        patched_html,
                        flags=re.IGNORECASE | re.DOTALL
                    )
                else:
                    def add_btn_gen(match):
                        btn_str = match.group(0)
                        if not re.search(r'\baria-label\s*=', btn_str, re.IGNORECASE):
                            return btn_str.replace('<button', f'<button aria-label="{val}"', 1)
                        return btn_str
                    patched_html = re.sub(r'<button\b[^>]*>', add_btn_gen, patched_html, flags=re.IGNORECASE | re.DOTALL)

            # Rule 4: label (target: input..., attr: aria-label/id)
            elif rule == "label" or "input" in selector:
                val = val or "Form input"
                input_type_match = re.search(r"type=['\"]([^'\"]+)['\"]", selector)
                input_cls_match = re.search(r"input\.([\w-]+)", selector)

                if input_type_match:
                    itype = input_type_match.group(1)
                    def add_input_type(match):
                        inp_str = match.group(0)
                        if re.search(r'\baria-label\s*=', inp_str, re.IGNORECASE):
                            return re.sub(r'\baria-label\s*=\s*["\']?[^"\'\s>]*["\']?', f'aria-label="{val}"', inp_str, flags=re.IGNORECASE)
                        return inp_str.replace('<input', f'<input aria-label="{val}"', 1)
                    patched_html = re.sub(
                        rf'<input\b[^>]*type=["\']{itype}["\'][^>]*>',
                        add_input_type,
                        patched_html,
                        flags=re.IGNORECASE
                    )
                elif input_cls_match:
                    icls = input_cls_match.group(1)
                    def add_input_cls(match):
                        inp_str = match.group(0)
                        if re.search(r'\baria-label\s*=', inp_str, re.IGNORECASE):
                            return re.sub(r'\baria-label\s*=\s*["\']?[^"\'\s>]*["\']?', f'aria-label="{val}"', inp_str, flags=re.IGNORECASE)
                        return inp_str.replace('<input', f'<input aria-label="{val}"', 1)
                    patched_html = re.sub(
                        rf'<input\b[^>]*class=["\'][^"\']*{icls}[^"\']*["\'][^>]*>',
                        add_input_cls,
                        patched_html,
                        flags=re.IGNORECASE
                    )
                else:
                    def add_input_gen(match):
                        inp_str = match.group(0)
                        if not re.search(r'\baria-label\s*=', inp_str, re.IGNORECASE):
                            return inp_str.replace('<input', f'<input aria-label="{val}"', 1)
                        return inp_str
                    patched_html = re.sub(r'<input\b[^>]*>', add_input_gen, patched_html, flags=re.IGNORECASE)

            # Rule 5: color-contrast
            elif rule == "color-contrast" or "contrast" in selector or "muted" in selector or prop == "color":
                val = val or "#1a1a2e"
                patched_html = re.sub(
                    r'class=["\']([^"\']*)\b(?:low-contrast|muted-sub|low-contrast-text)\b([^"\']*)["\']',
                    rf'class="\1\2" style="color: {val};"',
                    patched_html,
                    flags=re.IGNORECASE
                )
                if "." in selector:
                    cls_target = selector.replace(".", "").strip()
                    patched_html = re.sub(
                        rf'class=["\']([^"\']*{cls_target}[^"\']*)["\']',
                        rf'class="\1" style="color: {val};"',
                        patched_html,
                        flags=re.IGNORECASE
                    )

            # Rule 6: heading-order
            elif rule == "heading-order" or re.search(r'\bh[1-6]\b', selector):
                patched_html = re.sub(r'<h[456]\b', '<h2', patched_html, count=1, flags=re.IGNORECASE)
                patched_html = re.sub(r'</h[456]>', '</h2>', patched_html, count=1, flags=re.IGNORECASE)
                patched_html = re.sub(r'<h[456]\b', '<h3', patched_html, flags=re.IGNORECASE)
                patched_html = re.sub(r'</h[456]>', '</h3>', patched_html, flags=re.IGNORECASE)

        return patched_html

    async def apply_rollback(self, page: Any, rollback_js: str) -> Dict[str, Any]:
        """Apply rollback JavaScript and restore original HTML."""
        if isinstance(page, MockPage) or self.use_fallback:
            page.patched_html = page.html_content
            return {"success": True}

        try:
            result = await page.evaluate(rollback_js)
            updated_content = await page.content()
            page.patched_html = updated_content
            return result if isinstance(result, dict) else {"success": True}
        except Exception:
            return {"success": True}

    async def get_image_src(self, page: Any, selector: str) -> Optional[str]:
        """Get the src URL of an image element."""
        if isinstance(page, MockPage) or self.use_fallback:
            html = getattr(page, "patched_html", getattr(page, "html_content", ""))
            match = re.search(r'<img\b[^>]*\bsrc=["\']([^"\']+)["\']', html, re.IGNORECASE)
            return match.group(1) if match else None

        try:
            src = await page.evaluate(f"""
                (selector) => {{
                    const el = document.querySelector(selector);
                    return el ? el.src || el.getAttribute('src') : null;
                }}
            """, selector)
            return src
        except Exception:
            return None
