"""AURA Patch Compiler — Converts structured fix plans into safe JavaScript for sandbox injection."""

from models.schemas import FixPlan, PatchResult
from core.safety_validator import validate_fix_plan
import json


def compile_patch(fix_plan: FixPlan) -> PatchResult:
    """
    Compile a fix plan into JavaScript for sandbox execution.
    Returns both the patch JS and rollback JS.
    """
    # Safety validation first
    is_valid, errors = validate_fix_plan(fix_plan)
    if not is_valid:
        return PatchResult(
            success=False,
            error=f"Patch rejected by safety validator: {'; '.join(errors)}"
        )

    selector = fix_plan.target.get("selector", "")
    strategy = fix_plan.strategy

    try:
        patch_lines = []
        rollback_lines = []

        # Always start by finding the target element
        safe_selector = json.dumps(selector)  # JSON-encode to escape quotes
        patch_lines.append(f"(function() {{")
        patch_lines.append(f"  const el = document.querySelector({safe_selector});")
        patch_lines.append(f"  if (!el) return {{ success: false, error: 'Element not found' }};")

        rollback_lines.append(f"(function() {{")
        rollback_lines.append(f"  const el = document.querySelector({safe_selector});")
        rollback_lines.append(f"  if (!el) return {{ success: false, error: 'Element not found for rollback' }};")

        for change in fix_plan.changes:
            p, r = _compile_change(change, strategy)
            patch_lines.extend(["  " + line for line in p])
            rollback_lines.extend(["  " + line for line in r])

        patch_lines.append(f"  return {{ success: true }};")
        patch_lines.append(f"}})();")

        rollback_lines.append(f"  return {{ success: true }};")
        rollback_lines.append(f"}})();")

        return PatchResult(
            success=True,
            patch_js="\n".join(patch_lines),
            rollback_js="\n".join(rollback_lines),
        )

    except Exception as e:
        return PatchResult(success=False, error=f"Patch compilation failed: {str(e)}")


def _compile_change(change, strategy: str):
    """Compile a single change into JS lines. Returns (patch_lines, rollback_lines)."""
    patch = []
    rollback = []

    attr = change.attribute or ""
    value = change.value or ""
    safe_attr = json.dumps(attr)
    safe_value = json.dumps(value)

    if strategy in ("add_attribute", "modify_attribute"):
        # Save original for rollback
        rollback.append(f"const origVal = el.getAttribute({safe_attr});")
        rollback.append(f"if (origVal === null) el.removeAttribute({safe_attr});")
        rollback.append(f"else el.setAttribute({safe_attr}, origVal);")

        patch.append(f"el.setAttribute({safe_attr}, {safe_value});")

    elif strategy == "remove_attribute":
        rollback.append(f"const origVal = el.getAttribute({safe_attr});")
        rollback.append(f"if (origVal !== null) el.setAttribute({safe_attr}, origVal);")

        patch.append(f"el.removeAttribute({safe_attr});")

    elif strategy == "set_text_content":
        text = change.text or change.value or ""
        safe_text = json.dumps(text)
        rollback.append(f"const origText = el.textContent;")
        rollback.append(f"el.textContent = origText;")

        patch.append(f"el.textContent = {safe_text};")

    elif strategy in ("add_style", "modify_style"):
        prop = change.property or change.attribute or ""
        safe_prop = json.dumps(prop)
        rollback.append(f"const origStyle = el.style.getPropertyValue({safe_prop});")
        rollback.append(f"el.style.setProperty({safe_prop}, origStyle);")

        patch.append(f"el.style.setProperty({safe_prop}, {safe_value});")

    elif strategy == "add_element":
        tag = change.tag or "label"
        text = change.text or change.value or ""
        safe_tag = json.dumps(tag)
        safe_text = json.dumps(text)

        patch.append(f"const newEl = document.createElement({safe_tag});")
        patch.append(f"newEl.textContent = {safe_text};")
        if attr:
            patch.append(f"newEl.setAttribute({safe_attr}, {safe_value});")
        patch.append(f"newEl.dataset.auraGenerated = 'true';")
        patch.append(f"el.parentNode.insertBefore(newEl, el);")

        rollback.append(f"const gen = el.parentNode.querySelector('[data-aura-generated]');")
        rollback.append(f"if (gen) gen.remove();")

    elif strategy == "modify_element":
        # Generic attribute modification
        if attr and value:
            rollback.append(f"const origVal = el.getAttribute({safe_attr});")
            rollback.append(f"if (origVal === null) el.removeAttribute({safe_attr});")
            rollback.append(f"else el.setAttribute({safe_attr}, origVal);")
            patch.append(f"el.setAttribute({safe_attr}, {safe_value});")

    return patch, rollback
