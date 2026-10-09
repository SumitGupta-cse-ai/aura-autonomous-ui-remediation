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
    rule = fix_plan.verification_rule or ""

    # Specialized rule generators for complex document-level rules
    if rule == "landmark-one-main":
        from core.rule_fixers import LandmarkOneMainFixer
        return PatchResult(
            success=True,
            patch_js=LandmarkOneMainFixer.generate_patch_js(),
            rollback_js="// Restored via DOM snapshot",
        )
    elif rule == "meta-viewport":
        from core.rule_fixers import MetaViewportFixer
        return PatchResult(
            success=True,
            patch_js=MetaViewportFixer.generate_patch_js(),
            rollback_js="// Restored via DOM snapshot",
        )
    elif rule == "page-has-heading-one":
        from core.rule_fixers import PageHasHeadingOneFixer
        return PatchResult(
            success=True,
            patch_js=PageHasHeadingOneFixer.generate_patch_js(),
            rollback_js="// Restored via DOM snapshot",
        )
    elif rule == "heading-order":
        from core.rule_fixers import HeadingOrderFixer
        return PatchResult(
            success=True,
            patch_js=HeadingOrderFixer.generate_patch_js(selector),
            rollback_js="// Restored via DOM snapshot",
        )
    elif rule == "document-title":
        from core.rule_fixers import DocumentTitleFixer
        title_val = ""
        for c in fix_plan.changes:
            if c.text or c.value:
                title_val = c.text or c.value
                break
        return PatchResult(
            success=True,
            patch_js=DocumentTitleFixer.generate_patch_js(title_val or "Accessible Web Document"),
            rollback_js="// Restored via DOM snapshot",
        )
    elif rule == "accesskeys":
        from core.rule_fixers import AccesskeysFixer
        return PatchResult(
            success=True,
            patch_js=AccesskeysFixer.generate_patch_js(),
            rollback_js="// Restored via DOM snapshot",
        )
    elif rule == "html-has-lang":
        from core.rule_fixers import HtmlHasLangFixer
        return PatchResult(
            success=True,
            patch_js=HtmlHasLangFixer.generate_patch_js(),
            rollback_js="// Restored via DOM snapshot",
        )

    try:
        patch_lines = []
        rollback_lines = []

        # Find target elements (supports single or multi-element selector)
        safe_selector = json.dumps(selector)  # JSON-encode to escape quotes
        patch_lines.append(f"(function() {{")
        patch_lines.append(f"  const elements = document.querySelectorAll({safe_selector});")
        patch_lines.append(f"  if (!elements || elements.length === 0) return {{ success: false, error: 'Element not found' }};")
        patch_lines.append(f"  elements.forEach(el => {{")

        rollback_lines.append(f"(function() {{")
        rollback_lines.append(f"  const elements = document.querySelectorAll({safe_selector});")
        rollback_lines.append(f"  if (!elements || elements.length === 0) return {{ success: false, error: 'Element not found for rollback' }};")
        rollback_lines.append(f"  elements.forEach(el => {{")

        for change in fix_plan.changes:
            p, r = _compile_change(change, strategy)
            patch_lines.extend(["    " + line for line in p])
            rollback_lines.extend(["    " + line for line in r])

        patch_lines.append(f"  }});")
        patch_lines.append(f"  return {{ success: true }};")
        patch_lines.append(f"}})();")

        rollback_lines.append(f"  }});")
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
        if attr in ("src", "alt"):
            patch.append("if (el.tagName && el.tagName.toLowerCase() === 'img') {")
            patch.append("  el.classList.remove('img-error', 'card-product-broken');")
            patch.append("  el.classList.add('card-product-fixed');")
            patch.append("  el.removeAttribute('onerror');")
            patch.append("  el.onerror = null;")
            patch.append("}")

    elif strategy == "remove_attribute":
        rollback.append(f"const origVal = el.getAttribute({safe_attr});")
        rollback.append(f"if (origVal !== null) el.setAttribute({safe_attr}, origVal);")

        patch.append(f"el.removeAttribute({safe_attr});")

    elif strategy in ("set_text_content", "modify_text"):
        text = change.text or change.value or ""
        safe_text = json.dumps(text)
        rollback.append(f"const origText = el.textContent;")
        rollback.append(f"el.textContent = origText;")

        patch.append(f"el.textContent = {safe_text};")

    elif strategy in ("add_style", "modify_style"):
        prop = change.property or change.attribute or ""
        safe_prop = json.dumps(prop)
        rollback.append(f"const origStyle = el.style.getPropertyValue({safe_prop});")
        rollback.append(f"if (origStyle) el.style.setProperty({safe_prop}, origStyle); else el.style.removeProperty({safe_prop});")

        patch.append(f"el.style.setProperty({safe_prop}, {safe_value}, 'important');")
        if prop == "background-color":
            patch.append(f"el.style.setProperty('background', {safe_value}, 'important');")
            rollback.append("el.style.removeProperty('background');")
        elif prop == "background":
            patch.append(f"el.style.setProperty('background-color', {safe_value}, 'important');")
            rollback.append("el.style.removeProperty('background-color');")

    elif strategy == "inject_style":
        css_text = change.text or change.value or ""
        safe_css = json.dumps(css_text)
        patch.append(f"let auraStyle = document.getElementById('aura-improvement-style');")
        patch.append(f"if (!auraStyle) {{ auraStyle = document.createElement('style'); auraStyle.id = 'aura-improvement-style'; document.head.appendChild(auraStyle); }}")
        patch.append(f"auraStyle.textContent += '\\n' + {safe_css};")
        rollback.append(f"const auraStyle = document.getElementById('aura-improvement-style'); if (auraStyle) auraStyle.remove();")

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

    elif strategy == "modify_tag" or change.tag:
        tag = change.tag or "h2"
        safe_tag = json.dumps(tag)
        patch.append(f"const newEl = document.createElement({safe_tag});")
        patch.append(f"newEl.innerHTML = el.innerHTML;")
        patch.append(f"for (let i = 0; i < el.attributes.length; i++) {{ newEl.setAttribute(el.attributes[i].name, el.attributes[i].value); }}")
        patch.append(f"newEl.dataset.auraOrigTag = el.tagName.toLowerCase();")
        patch.append(f"el.parentNode.replaceChild(newEl, el);")

        rollback.append(f"const origTag = el.dataset?.auraOrigTag || 'h6';")
        rollback.append(f"const origEl = document.createElement(origTag);")
        rollback.append(f"origEl.innerHTML = el.innerHTML;")
        rollback.append(f"for (let i = 0; i < el.attributes.length; i++) {{ origEl.setAttribute(el.attributes[i].name, el.attributes[i].value); }}")
        rollback.append(f"el.parentNode.replaceChild(origEl, el);")

    return patch, rollback
