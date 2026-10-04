"""AURA Safety Validator — Validates fix plans against allowlisted operations."""

import re
from typing import Tuple, List
from models.schemas import FixPlan, FixChange


# Allowed attributes that can be set/modified
ALLOWED_ATTRIBUTES = {
    "alt", "aria-label", "aria-labelledby", "aria-describedby",
    "aria-hidden", "aria-expanded", "aria-haspopup", "aria-controls",
    "aria-live", "aria-atomic", "aria-relevant", "aria-busy",
    "role", "lang", "title", "for", "id", "type", "name",
    "placeholder", "tabindex", "scope", "headers",
}

# Allowed strategies
ALLOWED_STRATEGIES = {
    "add_attribute", "modify_attribute", "remove_attribute",
    "add_element", "modify_element", "add_style", "modify_style",
    "wrap_element", "set_text_content", "modify_tag",
}

# Allowed CSS properties
ALLOWED_CSS_PROPERTIES = {
    "color", "background-color", "outline", "outline-offset",
    "outline-style", "outline-width", "outline-color",
    "border", "border-color", "font-size", "font-weight",
    "text-decoration", "opacity", "visibility", "display",
}

# Blocked patterns in any value
BLOCKED_PATTERNS = [
    r"javascript\s*:",
    r"data\s*:",
    r"eval\s*\(",
    r"Function\s*\(",
    r"<\s*script",
    r"on\w+\s*=",  # event handlers like onclick=
    r"fetch\s*\(",
    r"XMLHttpRequest",
    r"document\.cookie",
    r"localStorage",
    r"sessionStorage",
    r"window\.location\s*=",
    r"document\.write",
    r"innerHTML",  # block innerHTML to prevent XSS
    r"outerHTML",
    r"\.exec\s*\(",
    r"import\s*\(",
    r"require\s*\(",
]


def validate_fix_plan(fix_plan: FixPlan) -> Tuple[bool, List[str]]:
    """
    Validate a fix plan against safety rules.
    Returns (is_valid, list_of_reasons).
    """
    errors: List[str] = []

    # 1. Validate strategy
    if fix_plan.strategy not in ALLOWED_STRATEGIES:
        errors.append(f"Strategy '{fix_plan.strategy}' is not in the allowlist")

    # 2. Validate target selector
    selector = fix_plan.target.get("selector", "")
    if not selector:
        errors.append("Fix plan must have a target selector")
    elif not _is_safe_selector(selector):
        errors.append(f"Selector '{selector}' contains potentially dangerous content")

    # 3. Validate each change
    for i, change in enumerate(fix_plan.changes):
        change_errors = _validate_change(change, fix_plan.strategy)
        for err in change_errors:
            errors.append(f"Change[{i}]: {err}")

    # 4. Validate values don't contain blocked patterns
    all_values = _collect_all_values(fix_plan)
    for val in all_values:
        for pattern in BLOCKED_PATTERNS:
            if re.search(pattern, val, re.IGNORECASE):
                errors.append(f"Blocked pattern detected in value: '{pattern}'")
                break

    return len(errors) == 0, errors


def _validate_change(change: FixChange, strategy: str) -> List[str]:
    """Validate a single change operation."""
    errors = []

    if strategy in ("add_attribute", "modify_attribute"):
        if not change.attribute:
            errors.append("Attribute name is required for attribute operations")
        elif change.attribute.lower() not in ALLOWED_ATTRIBUTES:
            errors.append(f"Attribute '{change.attribute}' is not in the allowlist")

    if strategy == "remove_attribute":
        if not change.attribute:
            errors.append("Attribute name is required for remove_attribute")

    if strategy in ("add_style", "modify_style"):
        if change.property and change.property.lower() not in ALLOWED_CSS_PROPERTIES:
            errors.append(f"CSS property '{change.property}' is not in the allowlist")

    if strategy == "add_element":
        if change.tag:
            allowed_tags = {"label", "span", "div", "a", "h1", "h2", "h3", "h4", "h5", "h6"}
            if change.tag.lower() not in allowed_tags:
                errors.append(f"Element tag '{change.tag}' is not allowed")

    return errors


def _is_safe_selector(selector: str) -> bool:
    """Check if a CSS selector is safe."""
    dangerous = [r"javascript:", r"<script", r"eval\(", r"expression\("]
    for pattern in dangerous:
        if re.search(pattern, selector, re.IGNORECASE):
            return False
    return True


def _collect_all_values(fix_plan: FixPlan) -> List[str]:
    """Collect all string values from a fix plan for safety checking."""
    values = []
    values.append(fix_plan.target.get("selector", ""))
    values.append(fix_plan.reason)
    for change in fix_plan.changes:
        if change.value:
            values.append(change.value)
        if change.text:
            values.append(change.text)
        if change.attribute:
            values.append(change.attribute)
    return [v for v in values if v]
