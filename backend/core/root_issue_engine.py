"""AURA Root Issue Clustering & Smart Deduplication Engine

Transforms raw, repeated DOM violations (e.g. 42 individual color-contrast items
on 42 product cards) into meaningful, consolidated Root Issues with:
- occurrence_count
- affected_elements
- affected_components
- shared_selector
- causal root cause classification

Follows the Golden Rules:
1. Genuinely different root causes (Header vs ProductCard vs Footer) remain separate.
2. Identical repeating instances in the same component/context are grouped into 1 Root Issue.
3. Fixes target the shared component selector/style rather than patching 42 elements individually.
"""

import re
import hashlib
from typing import Dict, Any, List, Optional, Tuple
from models.schemas import (
    AccessibilityIssue,
    IssueSeverity,
    IssueCategory,
    RawFinding,
    RootIssue,
)


def extract_component_context(selector: str, element_html: str) -> Tuple[str, str]:
    """
    Identifies the parent component context and a normalized tag path.
    Returns (component_name, normalized_path).
    """
    sel_low = selector.lower()
    html_low = element_html.lower()

    # 1. Detect Component Type
    component_name = "Generic Layout"
    if any(k in sel_low for k in ("product-card", "product_card", "product-item", "item-card", "card-product")) or \
       any(k in html_low for k in ("product-card", "add-to-cart", "price", "card-product")):
        component_name = "ProductCard"
    elif any(k in sel_low for k in ("header", "topbar", "nav", "navbar", "menu", "brand")) or \
         any(k in html_low for k in ("header", "nav", "navbar", "menu", "brand")):
        component_name = "HeaderNavigation"
    elif any(k in sel_low for k in ("footer", "bottom-bar", "colophon", "copyright")) or \
         any(k in html_low for k in ("footer", "copyright", "rights reserved")):
        component_name = "Footer"
    elif any(k in sel_low for k in ("hero", "banner", "jumbotron", "featured-banner")) or \
         any(k in html_low for k in ("hero", "banner")):
        component_name = "HeroSection"
    elif any(k in sel_low for k in ("sidebar", "filter", "aside", "facets")) or \
         any(k in html_low for k in ("sidebar", "filter", "aside")):
        component_name = "SidebarFilter"
    elif any(k in sel_low for k in ("cart", "checkout", "basket", "bag")) or \
         any(k in html_low for k in ("cart", "checkout", "basket")):
        component_name = "CartCheckout"
    elif any(k in sel_low for k in ("form", "search", "input-group")) or \
         any(k in html_low for k in ("form", "search")):
        component_name = "SearchForm"
    elif any(k in sel_low for k in ("table", "data-grid", "tbody", "row")) or \
         any(k in html_low for k in ("table", "data-grid")):
        component_name = "DataTable"
    elif any(k in sel_low for k in ("modal", "dialog", "popup", "drawer")):
        component_name = "ModalDialog"

    # 2. Extract Normalized Selector (strip :nth-child, random numbers, dynamic hashes)
    clean_sel = selector
    clean_sel = re.sub(r":nth-child\(\d+\)", "", clean_sel)
    clean_sel = re.sub(r":nth-of-type\(\d+\)", "", clean_sel)
    # Remove random hash tokens like __2x9aB or _12345 or :r0:
    clean_sel = re.sub(r"_[a-zA-Z0-9]{5,10}", "", clean_sel)
    clean_sel = re.sub(r":r[0-9a-zA-Z_-]+:", "", clean_sel)
    # Normalize multiple spaces and arrows
    clean_sel = re.sub(r"\s+>\s+", " > ", clean_sel).strip()

    # 3. Extract target tag/role
    tag_match = re.match(r"<([a-zA-Z0-9_-]+)", element_html)
    tag = tag_match.group(1).lower() if tag_match else "elem"

    normalized_path = f"{component_name} > {clean_sel} [{tag}]"
    return component_name, normalized_path


def derive_shared_selector(selectors: List[str], component_name: str, rule_id: str) -> str:
    """
    Finds the most specific common selector that targets all affected instances safely.
    """
    if not selectors:
        return ""
    if len(selectors) == 1:
        return selectors[0]

    # Check for recurring class or tag across instances
    common_tokens = []
    first_tokens = re.findall(r"\.([a-zA-Z0-9_-]+)", selectors[0])
    for tok in first_tokens:
        # Ignore dynamic tokens
        if len(tok) < 3 or re.search(r"[0-9]{4,}", tok):
            continue
        if all(f".{tok}" in s for s in selectors):
            common_tokens.append(f".{tok}")

    if common_tokens:
        return " ".join(common_tokens[:2])

    if component_name == "ProductCard":
        if rule_id == "color-contrast":
            return ".product-card .price, .product-card .product-price, .product-card p"
        elif rule_id in ("image-alt", "image-redundant-alt"):
            return ".product-card img, .card img"
        elif rule_id in ("button-name", "link-name"):
            return ".product-card button, .product-card .add-to-cart, .product-card a"
    elif component_name == "Footer":
        if rule_id == "link-name":
            return "footer a, #footer a, .footer a"
        elif rule_id == "color-contrast":
            return "footer p, footer a, .footer-text"
    elif component_name == "HeaderNavigation":
        if rule_id in ("button-name", "link-name"):
            return "header button, nav a, .navbar a"

    # Fallback to normalized first selector without nth-child
    first_clean = re.sub(r":nth-child\(\d+\)", "", selectors[0])
    return first_clean or selectors[0]


def generate_root_issue_title(rule_id: str, component_name: str, occurrences: int) -> Tuple[str, str]:
    """
    Creates human-readable title and root cause explanation.
    """
    comp_label = "Product card" if component_name == "ProductCard" else (
        "Header / Navigation" if component_name == "HeaderNavigation" else (
            "Footer" if component_name == "Footer" else (
                "Hero section" if component_name == "HeroSection" else (
                    "Sidebar filter" if component_name == "SidebarFilter" else (
                        "Cart & Checkout" if component_name == "CartCheckout" else "Page"
                    )
                )
            )
        )
    )

    if rule_id == "color-contrast":
        if occurrences > 1:
            title = f"{comp_label} text does not meet WCAG contrast requirements"
            root_cause = f"Shared color tokens across {occurrences} {comp_label} elements fail WCAG 4.5:1 minimum contrast ratio."
        else:
            title = f"Low contrast text in {comp_label}"
            root_cause = "Element text does not have sufficient contrast against background."
    elif rule_id in ("image-alt", "input-image-alt"):
        if occurrences > 1:
            title = f"Missing alternative text on {comp_label} images"
            root_cause = f"{occurrences} images in {comp_label} lack descriptive alt attributes for screen readers."
        else:
            title = f"Missing alternative text on image in {comp_label}"
            root_cause = "Image lacks an alt attribute describing its visual content."
    elif rule_id == "image-redundant-alt":
        title = f"Redundant alternative text on {comp_label} images"
        root_cause = "Alt text repeats adjacent heading or label text, causing verbose screen reader repetition."
    elif rule_id in ("button-name", "link-name"):
        if occurrences > 1:
            title = f"Interactive controls in {comp_label} lack accessible names"
            root_cause = f"{occurrences} buttons/links in {comp_label} contain no text or aria-label for screen readers."
        else:
            title = f"Interactive control in {comp_label} lacks accessible name"
            root_cause = "Control lacks text content or aria-label describing its destination or action."
    elif rule_id in ("label", "label-title-only"):
        title = f"Form input controls in {comp_label} lack associated labels"
        root_cause = "Input elements missing programmatic <label> or aria-label."
    elif "landmark" in rule_id:
        title = f"Landmark structural configuration in {comp_label}"
        root_cause = "Document landmark elements require unique accessible labeling or deduplication."
    elif rule_id == "meta-viewport":
        title = "Responsive viewport configuration"
        root_cause = "Viewport meta tag restricts user scaling or lacks mobile responsive dimensions."
    elif rule_id == "html-has-lang":
        title = "Missing primary language declaration on HTML root"
        root_cause = "Root <html> element missing lang attribute for speech synthesizers."
    elif rule_id == "page-has-heading-one":
        title = "Missing top-level H1 document landmark"
        root_cause = "Page lacks an <h1> heading providing a primary structural outline."
    else:
        title = f"{rule_id.replace('-', ' ').title()} in {comp_label}"
        root_cause = f"WCAG violation on {comp_label} ({rule_id})."

    return title, root_cause


def cluster_raw_findings_into_root_issues(
    raw_issues: List[Dict[str, Any]],
    page_screenshot: Optional[str] = None,
) -> Tuple[List[RawFinding], List[AccessibilityIssue]]:
    """
    Takes raw axe-core findings and groups them into normalized RawFinding objects
    and consolidated AccessibilityIssue root issues.
    """
    raw_findings: List[RawFinding] = []
    clusters: Dict[str, List[Dict[str, Any]]] = {}

    for idx, raw in enumerate(raw_issues):
        rule_id = raw.get("rule_id", "unknown-rule")
        selector = raw.get("element_selector", "")
        html = raw.get("element_html", "")
        impact = raw.get("axe_impact", raw.get("severity", "moderate"))

        comp_name, norm_path = extract_component_context(selector, html)

        # Raw finding object
        rf_id = f"raw_{idx}_{rule_id[:8]}"
        comp_fp = hashlib.sha256(comp_name.encode()).hexdigest()[:8]
        dom_fp = hashlib.sha256(norm_path.encode()).hexdigest()[:8]

        finding = RawFinding(
            id=rf_id,
            rule_id=rule_id,
            impact=impact,
            selector=selector,
            element_html=html[:300],
            component_fingerprint=comp_fp,
            dom_fingerprint=dom_fp,
            parent_structure=comp_name,
            text=raw.get("description", "")[:100],
            source="axe-core",
        )
        raw_findings.append(finding)

        # Cluster Key: combines rule_id + component_name + normalized path pattern
        # This keeps Header color-contrast separate from ProductCard color-contrast!
        cluster_key = f"{rule_id}::{comp_name}"
        if cluster_key not in clusters:
            clusters[cluster_key] = []
        clusters[cluster_key].append(raw)

    root_issues: List[AccessibilityIssue] = []

    for cluster_key, group in clusters.items():
        rule_id, comp_name = cluster_key.split("::", 1)
        occurrences = len(group)
        first_raw = group[0]

        selectors = [item.get("element_selector", "") for item in group if item.get("element_selector")]
        shared_sel = derive_shared_selector(selectors, comp_name, rule_id)
        title, root_cause = generate_root_issue_title(rule_id, comp_name, occurrences)

        # Determine highest severity in group
        severities = [item.get("severity", "moderate") for item in group]
        if "critical" in severities:
            highest_sev = IssueSeverity.CRITICAL
        elif "serious" in severities:
            highest_sev = IssueSeverity.SERIOUS
        elif "moderate" in severities:
            highest_sev = IssueSeverity.MODERATE
        else:
            highest_sev = IssueSeverity.MINOR

        # Stable Root Issue ID
        cluster_hash = hashlib.sha256(cluster_key.encode()).hexdigest()[:6]
        root_id = f"{rule_id}-{cluster_hash}"

        # Consolidate description
        if occurrences > 1:
            desc = f"{first_raw.get('description', '')} ({occurrences} affected occurrences across {comp_name})."
        else:
            desc = first_raw.get("description", "")

        root_issue = AccessibilityIssue(
            id=root_id,
            rule_id=rule_id,
            rule_description=title,
            wcag_criteria=first_raw.get("wcag_criteria", []),
            severity=highest_sev,
            category=IssueCategory.PROBLEM,
            axe_impact=first_raw.get("axe_impact", "moderate"),
            element_selector=shared_sel or first_raw.get("element_selector", ""),
            element_html=first_raw.get("element_html", ""),
            element_context=f"Component: {comp_name} | {occurrences} occurrences",
            description=desc,
            help_url=first_raw.get("help_url", ""),
            before_screenshot=page_screenshot,
            violation_fingerprint=f"vfp_{cluster_hash}_{rule_id[:8]}",
            target_fingerprint=f"vfp_{cluster_hash}_{rule_id[:8]}",
            occurrence_count=occurrences,
            affected_elements=selectors,
            affected_components=[comp_name],
            shared_selector=shared_sel,
            root_cause_id=cluster_key,
            total_occurrences=occurrences,
            raw_findings_count=occurrences,
        )

        root_issues.append(root_issue)

    return raw_findings, root_issues
