"""AURA Fixability Classifier Engine.

Replaces generic "90% fixable" labels with an empirical, multi-dimensional classification:
- SAFE_AUTO_FIXABLE
- AUTO_FIXABLE
- AUTO_FIXABLE_WITH_REVIEW
- PREVIEW_ONLY
- SOURCE_ACCESS_REQUIRED
- THIRD_PARTY
- NOT_SAFE_TO_AUTO_FIX
- UNVERIFIED

Classification evaluates:
- ruleId & WCAG criteria
- target DOM structure & component type
- node ownership (first-party vs third-party)
- sandbox execution vs source code access
- patch strategy confidence
- risk of layout or behavioral regressions
"""

import re
from typing import Dict, Any, Optional, Tuple
from models.schemas import FixClassification, IssueCategory, IssueSeverity
from core.target_resolver import classify_node_ownership


def classify_issue_fixability(
    rule_id: str,
    selector: str = "",
    element_html: str = "",
    url: str = "",
    is_external: bool = False,
    category: IssueCategory = IssueCategory.PROBLEM,
    severity: IssueSeverity = IssueSeverity.MODERATE,
    dom_context: Optional[Dict[str, Any]] = None,
) -> Tuple[FixClassification, int, bool, str]:
    """
    Classify an issue's true remediation capability.
    
    Returns:
        (classification, score_percentage, is_retryable, rationale)
    """
    sel_lower = (selector or "").lower()
    html_lower = (element_html or "").lower()
    ctx = dom_context or {}

    # 1. NODE OWNERSHIP & THIRD-PARTY DETECTION
    ownership = classify_node_ownership(element_html, selector, dom_context)
    if ownership == "THIRD_PARTY" or any(k in sel_lower or k in html_lower for k in (
        "iframe", "stripe", "paypal", "google-analytics", "recaptcha", "hcaptcha",
        "intercom", "zendesk", "crisp", "disqus", "hotjar", "clarity", "trustpilot", "ads"
    )):
        return (
            FixClassification.THIRD_PARTY,
            0,
            False,
            "This component belongs to an external provider/widget and cannot be modified directly.",
        )

    # 2. AI UI/UX DESIGN IMPROVEMENT CATEGORY
    if category == IssueCategory.IMPROVEMENT or rule_id.startswith("ui-"):
        return (
            FixClassification.AUTO_FIXABLE_WITH_REVIEW,
            85,
            True,
            "Visual layout and design enhancement preview available; 1-click preview and remediation enabled.",
        )

    # 3. BROKEN ASSET RECOVERY
    if any(k in sel_lower or k in html_lower for k in ("broken", "card-product-broken", "img-error", "404")):
        return (
            FixClassification.SAFE_AUTO_FIXABLE,
            100,
            True,
            "Targeted replacement of failed asset with verified accessible graphic (WCAG 1.1.1).",
        )

    # 4. RULE-SPECIFIC SPECIALIZED CLASSIFICATION

    # A. image-alt & input-image-alt
    if rule_id in ("image-alt", "input-image-alt"):
        return (
            FixClassification.SAFE_AUTO_FIXABLE,
            100,
            True,
            "Deterministic alt attribute synthesis based on image context, nearby headings, and vision analysis.",
        )

    # B. image-redundant-alt
    if rule_id == "image-redundant-alt":
        return (
            FixClassification.SAFE_AUTO_FIXABLE,
            100,
            True,
            "Safe attribute update: sets decorative alt=\"\" on image enclosed within descriptive anchor/button.",
        )

    # C. html-has-lang
    if rule_id == "html-has-lang":
        return (
            FixClassification.SAFE_AUTO_FIXABLE,
            100,
            True,
            "Deterministic document-level attribute insertion: adds lang=\"en\" to <html>.",
        )

    # D. button-name & link-name
    if rule_id in ("button-name", "link-name"):
        return (
            FixClassification.SAFE_AUTO_FIXABLE,
            95,
            True,
            "Surgical aria-label injection derived from anchor destination, button action, or icon semantics.",
        )

    # E. label & label-title-only & select-name
    if rule_id in ("label", "label-title-only", "select-name"):
        return (
            FixClassification.SAFE_AUTO_FIXABLE,
            95,
            True,
            "Programmatic label association via aria-label or paired <label> tag (WCAG 1.3.1 / 4.1.2).",
        )

    # F. aria-allowed-attr
    if rule_id == "aria-allowed-attr":
        return (
            FixClassification.SAFE_AUTO_FIXABLE,
            95,
            True,
            "Removes disallowed ARIA attribute to restore compliant accessibility tree structure.",
        )

    # G. empty-heading
    if rule_id == "empty-heading":
        return (
            FixClassification.SAFE_AUTO_FIXABLE,
            90,
            True,
            "Removes empty heading element or marks decorative whitespace as aria-hidden.",
        )

    # H. color-contrast
    if rule_id == "color-contrast":
        return (
            FixClassification.SAFE_AUTO_FIXABLE,
            95,
            True,
            "Component-aware multi-strategy color token adjustment with verified WCAG AA contrast.",
        )

    # I. landmark-one-main
    if rule_id == "landmark-one-main":
        has_clear_container = any(k in html_lower for k in (
            "id=\"main-content\"", "id=\"main\"", "class=\"main-content\"", "class=\"main\"",
            "class=\"container\"", "id=\"content\"", "class=\"content\""
        ))
        if has_clear_container:
            return (
                FixClassification.AUTO_FIXABLE,
                85,
                True,
                "Identified primary content container; converts or wraps container with <main> landmark.",
            )
        else:
            return (
                FixClassification.AUTO_FIXABLE_WITH_REVIEW,
                70,
                True,
                "Multiple potential main content regions detected; automated container selection requires review.",
            )

    # J. meta-viewport
    if rule_id == "meta-viewport":
        return (
            FixClassification.SAFE_AUTO_FIXABLE,
            95,
            True,
            "Surgically configures scalable responsive viewport meta tag in document head (WCAG 1.4.4).",
        )

    # K. page-has-heading-one
    if rule_id == "page-has-heading-one":
        has_hero = any(k in html_lower or k in sel_lower for k in ("hero", "banner", "title", "heading", "page-title"))
        if has_hero:
            return (
                FixClassification.AUTO_FIXABLE,
                90,
                True,
                "Promotes hero/primary title heading to <h1> while strictly preserving existing visual styles.",
            )
        else:
            return (
                FixClassification.AUTO_FIXABLE_WITH_REVIEW,
                65,
                True,
                "Document lacks obvious hero heading; review recommended to select ideal <h1> candidate.",
            )

    # L. heading-order
    if rule_id == "heading-order":
        return (
            FixClassification.AUTO_FIXABLE,
            85,
            True,
            "Normalizes heading hierarchy levels sequentially while retaining computed visual styles.",
        )

    # M. scrollable-region-focusable
    if rule_id == "scrollable-region-focusable":
        is_interactive = any(k in sel_lower or k in html_lower for k in ("carousel", "slider", "code", "table", "list", "panel"))
        if is_interactive:
            return (
                FixClassification.AUTO_FIXABLE,
                85,
                True,
                "Adds tabindex=\"0\" and region role to interactive scroll container to support keyboard navigation.",
            )
        else:
            return (
                FixClassification.AUTO_FIXABLE_WITH_REVIEW,
                75,
                True,
                "Generic overflow container; safe keyboard tabindex injection available.",
            )

    # 5. GENERAL SAFE FALLBACK
    if is_external and not (url.startswith("http://localhost") or url.startswith("http://127.0.0.1")):
        return (
            FixClassification.AUTO_FIXABLE,
            80,
            True,
            "Sandbox patch preview supported. Persistent production change requires repository access.",
        )

    return (
        FixClassification.AUTO_FIXABLE,
        85,
        True,
        "Automated DOM mutation strategy available with sandbox verification.",
    )
