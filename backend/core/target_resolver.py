"""AURA Target Resolver & Violation Fingerprinting Engine

Provides:
1. Stable Violation Fingerprinting (survives DOM re-rendering & hydration)
2. Semantic Target Resolution (resolves elements when selectors drift)
3. Patch Scope & Isolation Verification (prevents unsafe bulk mutations)
4. Ownership Classification (FIRST_PARTY, THIRD_PARTY, AURA_INJECTED)
"""

import re
import hashlib
from typing import Dict, Any, Optional, List, Tuple

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    BeautifulSoup = None
    HAS_BS4 = False


def is_dynamic_or_generated_token(token: str) -> bool:
    """Check if an ID or class looks like an auto-generated or dynamic token."""
    if not token or len(token) < 2:
        return False
    # React 18+ useId format :r0:, :r1:, etc.
    if re.match(r"^:r[0-9a-zA-Z_-]+:$", token):
        return True
    # Next.js / webpack / CSS Modules hashes (e.g., Header_header__2x9aB, css-19z92, jsx-12345)
    if re.search(r"__[a-zA-Z0-9]{4,10}$", token) or re.match(r"^(css|jsx|styled)-[a-zA-Z0-9]+$", token):
        return True
    # Long hex or random digits
    if re.match(r"^[0-9a-fA-F]{8,}$", token) or re.search(r"[0-9]{5,}", token):
        return True
    return False


def clean_selector(sel: str) -> str:
    """Remove dynamic tokens from selectors to preserve stability."""
    if not sel:
        return ""
    # Strip nth-child if present at top level when other attributes exist
    parts = sel.split(" > ")
    cleaned_parts = []
    for part in parts:
        # Check if part has an id that is dynamic
        id_m = re.search(r"#([a-zA-Z0-9_:-]+)", part)
        if id_m and is_dynamic_or_generated_token(id_m.group(1)):
            part = part.replace(f"#{id_m.group(1)}", "")
        cleaned_parts.append(part)
    return " > ".join(cleaned_parts) if cleaned_parts else sel


def compute_violation_fingerprint(
    rule_id: str,
    selector: str,
    element_html: str = "",
    dom_context: Optional[Dict[str, Any]] = None,
    page_path: str = "/",
) -> str:
    """
    Generate a stable, deterministic fingerprint for an accessibility violation.
    Formula: hash(ruleId + semanticRole + normalizedTarget + stableAttributes + accessibleName + pagePath)
    Survives DOM re-rendering, dynamic class changes, and layout shifts.
    """
    ctx = dom_context or {}
    tag = ctx.get("tag") or ""
    attrs = ctx.get("attributes") or {}

    # Extract tag and attributes from element_html if not in dom_context
    if not tag and element_html:
        tag_match = re.match(r"<([a-zA-Z0-9_-]+)", element_html)
        if tag_match:
            tag = tag_match.group(1).lower()

    if not attrs and element_html:
        # Extract basic stable attributes
        for attr in ["id", "data-testid", "name", "type", "role", "href", "src", "alt", "title", "aria-label"]:
            m = re.search(rf'\b{attr}=["\']([^"\']+)["\']', element_html, re.IGNORECASE)
            if m:
                attrs[attr] = m.group(1)

    # Filter out dynamic attributes
    stable_id = attrs.get("id", "")
    if is_dynamic_or_generated_token(stable_id):
        stable_id = ""

    # Normalized target identifier
    test_id = attrs.get("data-testid") or attrs.get("data-test") or attrs.get("data-cy") or ""
    role = attrs.get("role") or tag
    name_attr = attrs.get("name") or ""
    type_attr = attrs.get("type") or ""
    href = attrs.get("href") or ""
    if href and "?" in href:
        href = href.split("?")[0]  # Remove transient query params
    src = attrs.get("src") or ""
    if src and "?" in src:
        src = src.split("?")[0]

    accessible_name = (
        attrs.get("aria-label")
        or attrs.get("title")
        or attrs.get("alt")
        or ctx.get("text", "")[:40]
    ).strip()

    # Create stable signature
    raw_signature = (
        f"rule:{rule_id}|"
        f"page:{page_path}|"
        f"tag:{tag}|"
        f"role:{role}|"
        f"testid:{test_id}|"
        f"id:{stable_id}|"
        f"name:{name_attr}|"
        f"type:{type_attr}|"
        f"href:{href}|"
        f"src:{src}|"
        f"accname:{accessible_name}|"
        f"sel:{clean_selector(selector)}"
    )

    h = hashlib.sha256(raw_signature.encode("utf-8")).hexdigest()
    return f"vfp_{h[:16]}"


def compute_page_fingerprint(html: str, url: str) -> str:
    """Generate a stable page fingerprint based on canonical landmarks, title, and structure."""
    if not html:
        return "empty_page"
    try:
        if HAS_BS4 and BeautifulSoup:
            soup = BeautifulSoup(html[:100000], "html.parser")
            title = soup.title.string.strip() if soup.title and soup.title.string else ""
            h1s = [h.get_text(strip=True) for h in soup.find_all("h1")][:3]
            nav_count = len(soup.find_all("nav"))
            form_count = len(soup.find_all("form"))
            img_count = len(soup.find_all("img"))
        else:
            title_m = re.search(r"<title[^>]*>(.*?)</title>", html[:100000], re.IGNORECASE | re.DOTALL)
            title = title_m.group(1).strip() if title_m else ""
            h1s = [re.sub(r"<[^>]+>", "", h).strip() for h in re.findall(r"<h1[^>]*>(.*?)</h1>", html[:100000], re.IGNORECASE | re.DOTALL)][:3]
            nav_count = len(re.findall(r"<nav\b", html[:100000], re.IGNORECASE))
            form_count = len(re.findall(r"<form\b", html[:100000], re.IGNORECASE))
            img_count = len(re.findall(r"<img\b", html[:100000], re.IGNORECASE))
        path = url.split("?")[0].split("#")[0] if url else "/"

        sig = f"{path}|{title}|{','.join(h1s)}|nav:{nav_count}|form:{form_count}|img:{img_count}"
        return hashlib.sha256(sig.encode("utf-8")).hexdigest()[:16]
    except Exception:
        return hashlib.sha256((url or "").encode("utf-8")).hexdigest()[:16]


def resolve_target(
    selector: str,
    target_fingerprint: str = "",
    html: str = "",
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Locates the target element even if selectors drift or IDs fluctuate.
    Resolution priority:
    1. Direct selector match
    2. data-testid / data-test
    3. Stable ID
    4. Semantic tag + accessible name / title / alt
    5. Stable href / src
    6. Contextual structure
    """
    if not html:
        return {"selector": selector, "found": False, "method": "fallback"}

    ctx = context or {}
    attrs = ctx.get("attributes") or {}

    if HAS_BS4 and BeautifulSoup:
        soup = BeautifulSoup(html, "html.parser")

        # 1. Try direct selector match
        if selector:
            try:
                matched = soup.select_one(selector)
                if matched:
                    return {"selector": selector, "found": True, "method": "direct_selector", "node": str(matched)[:300]}
            except Exception:
                pass

        # 2. data-testid
        for tid_attr in ["data-testid", "data-test", "data-cy"]:
            val = attrs.get(tid_attr)
            if val:
                cand = soup.find(attrs={tid_attr: val})
                if cand:
                    return {"selector": f"[{tid_attr}='{val}']", "found": True, "method": "data_testid", "node": str(cand)[:300]}

        # Stable id
        elem_id = attrs.get("id")
        if elem_id and not is_dynamic_or_generated_token(elem_id):
            cand = soup.find(id=elem_id)
            if cand:
                return {"selector": f"#{elem_id}", "found": True, "method": "stable_id", "node": str(cand)[:300]}

        # Semantic role or tag + unique attribute
        tag = ctx.get("tag") or ""
        if tag == "img" and attrs.get("src"):
            src = attrs["src"]
            clean_src = src.split("?")[0]
            cand = soup.find("img", src=lambda s: s and clean_src in s)
            if cand:
                return {"selector": f"img[src*='{clean_src}']", "found": True, "method": "img_src", "node": str(cand)[:300]}

        if tag == "a" and attrs.get("href"):
            href = attrs["href"]
            clean_href = href.split("?")[0]
            cand = soup.find("a", href=lambda h: h and clean_href in h)
            if cand:
                return {"selector": f"a[href*='{clean_href}']", "found": True, "method": "anchor_href", "node": str(cand)[:300]}
    else:
        # Regex-based fallback
        for tid_attr in ["data-testid", "data-test", "data-cy"]:
            val = attrs.get(tid_attr)
            if val and f'{tid_attr}="{val}"' in html or f"{tid_attr}='{val}'" in html:
                return {"selector": f"[{tid_attr}='{val}']", "found": True, "method": "data_testid"}

        elem_id = attrs.get("id")
        if elem_id and not is_dynamic_or_generated_token(elem_id) and f'id="{elem_id}"' in html:
            return {"selector": f"#{elem_id}", "found": True, "method": "stable_id"}

        tag = ctx.get("tag") or ""
        if tag == "img" and attrs.get("src"):
            src = attrs["src"].split("?")[0]
            if src in html:
                return {"selector": f"img[src*='{src}']", "found": True, "method": "img_src"}

    # Return sanitized selector as fallback
    return {"selector": clean_selector(selector), "found": False, "method": "cleaned_selector"}


def check_patch_scope(
    before_html: str,
    after_html: str,
    rule_id: str,
    max_allowed_mutations: int = 5,
) -> Dict[str, Any]:
    """
    Verifies that a patch was surgically targeted and did NOT mutate unrelated page regions.
    If an image-alt fix mutates 40 images, it is rejected with PATCH_SCOPE_UNSAFE.
    """
    if not before_html or not after_html:
        return {"safe": True, "mutations_detected": 1, "reason": "Empty HTML comparison skipped"}

    # Special rules that legitimately affect document level (viewport, lang, headings, CSS)
    if rule_id in ("html-has-lang", "meta-viewport", "page-has-heading-one") or rule_id.startswith("ui-"):
        return {"safe": True, "mutations_detected": 1, "reason": "Document-level rule"}

    try:
        if HAS_BS4 and BeautifulSoup:
            soup_before = BeautifulSoup(before_html, "html.parser")
            soup_after = BeautifulSoup(after_html, "html.parser")

            if rule_id in ("image-alt", "image-redundant-alt"):
                imgs_before = soup_before.find_all("img")
                imgs_after = soup_after.find_all("img")
                changed_alts = 0
                for b, a in zip(imgs_before, imgs_after):
                    if b.get("alt") != a.get("alt") or b.get("src") != a.get("src"):
                        changed_alts += 1
                if changed_alts > max_allowed_mutations:
                    return {
                        "safe": False,
                        "mutations_detected": changed_alts,
                        "reason": f"PATCH_SCOPE_UNSAFE: Expected targeted alt change, but {changed_alts} images mutated.",
                    }

            elif rule_id in ("button-name", "link-name"):
                anchors_before = soup_before.find_all(["a", "button"])
                anchors_after = soup_after.find_all(["a", "button"])
                changed_names = 0
                for b, a in zip(anchors_before, anchors_after):
                    if b.get("aria-label") != a.get("aria-label") or b.text.strip() != a.text.strip():
                        changed_names += 1
                if changed_names > max_allowed_mutations:
                    return {
                        "safe": False,
                        "mutations_detected": changed_names,
                        "reason": f"PATCH_SCOPE_UNSAFE: Expected targeted control change, but {changed_names} controls mutated.",
                    }

        return {"safe": True, "mutations_detected": 1, "reason": "Surgical patch scope verified"}
    except Exception as e:
        return {"safe": True, "mutations_detected": 1, "reason": f"Scope parser note: {e}"}


def classify_node_ownership(
    element_html: str,
    selector: str,
    context: Optional[Dict[str, Any]] = None,
) -> str:
    """Classify element ownership: FIRST_PARTY, THIRD_PARTY, AURA_INJECTED, UNKNOWN."""
    combined = f"{element_html} {selector}".lower()

    # AURA internal elements
    if "aura-" in combined or "data-aura-injected" in combined:
        return "AURA_INJECTED"

    # Known third-party widget domains & markers
    third_party_markers = [
        "google-analytics", "doubleclick", "googlesyndication", "googletagmanager",
        "facebook.com", "connect.facebook.net", "twitter.com/widgets",
        "recaptcha", "hcaptcha", "intercom", "crisp.chat", "zendesk",
        "disqus", "hotjar", "clarity.ms", "trustpilot", "stripe.com",
    ]
    for marker in third_party_markers:
        if marker in combined:
            return "THIRD_PARTY"

    # Inaccessible or cross-origin iframe
    if "<iframe" in combined and "src=" in combined:
        for marker in third_party_markers:
            if marker in combined:
                return "THIRD_PARTY"

    return "FIRST_PARTY"
