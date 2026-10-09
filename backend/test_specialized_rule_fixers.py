"""AURA Specialized Rule Fixers & Fixability Engine Acceptance Test.

Verifies:
1. Fixability Classifier gives empirical classification (not generic "90% fixable")
2. TargetDescriptor generation
3. Specialized Rule Fixers:
   - landmark-one-main
   - meta-viewport
   - page-has-heading-one
   - heading-order
   - scrollable-region-focusable
   - image-alt
   - image-redundant-alt
   - link-name
   - button-name
   - aria-allowed-attr
   - empty-heading
   - color-contrast
4. Patch safety and compilation
5. Live headless browser verification of document-level repairs
"""

import sys
import asyncio
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from models.schemas import FixClassification, IssueCategory, IssueSeverity, AccessibilityIssue
from core.fixability_classifier import classify_issue_fixability
from core.rule_fixers import (
    get_specialized_fixer,
    LandmarkOneMainFixer,
    MetaViewportFixer,
    PageHasHeadingOneFixer,
    HeadingOrderFixer,
    ScrollableRegionFocusableFixer,
    ImageAltFixer,
    ImageRedundantAltFixer,
    ButtonNameFixer,
    LinkNameFixer,
    AriaAllowedAttrFixer,
    EmptyHeadingFixer,
    ColorContrastFixer,
)
from core.patch_compiler import compile_patch
from core.safety_validator import validate_fix_plan
from agents.browser_agent import BrowserAgent


async def test_fixability_classifier():
    print("\n[1] Testing Fixability Classifier Engine...")
    
    # 1. Third-party widget
    c1, s1, r1, _ = classify_issue_fixability("button-name", selector="#intercom-container button", element_html="<iframe src='https://intercom.io'></iframe>")
    assert c1 == FixClassification.THIRD_PARTY, f"Expected THIRD_PARTY, got {c1}"
    assert s1 == 0
    assert not r1
    print(f" -> Third-party detection: {c1.value} (Score: {s1}) [OK]")

    # 2. UI Improvement
    c2, s2, r2, _ = classify_issue_fixability("ui-cta-consistency", selector=".btn", category=IssueCategory.IMPROVEMENT)
    assert c2 == FixClassification.AUTO_FIXABLE_WITH_REVIEW
    print(f" -> AI Improvement: {c2.value} (Score: {s2}) [OK]")

    # 3. Broken Image
    c3, s3, r3, _ = classify_issue_fixability("image-alt", selector="img.card-product-broken", element_html="<img src='broken.jpg'>")
    assert c3 == FixClassification.SAFE_AUTO_FIXABLE
    assert s3 == 100
    print(f" -> Broken Asset: {c3.value} (Score: {s3}) [OK]")

    # 4. Deterministic accessibility issues
    for rule in ["image-alt", "image-redundant-alt", "button-name", "link-name", "html-has-lang", "color-contrast"]:
        c, s, r, _ = classify_issue_fixability(rule, selector=".test", element_html="<div class='test'></div>")
        assert c == FixClassification.SAFE_AUTO_FIXABLE, f"Expected SAFE_AUTO_FIXABLE for {rule}, got {c}"
        assert s >= 90
        print(f" -> {rule}: {c.value} (Score: {s}) [OK]")

    # 5. Document-level structural rules
    c_land, s_land, _, _ = classify_issue_fixability("landmark-one-main", selector="body", element_html="<div id='content'></div>")
    assert c_land in (FixClassification.AUTO_FIXABLE, FixClassification.AUTO_FIXABLE_WITH_REVIEW)
    print(f" -> landmark-one-main: {c_land.value} (Score: {s_land}) [OK]")


async def test_specialized_rule_fixers():
    print("\n[2] Testing Specialized Rule Fixers Planning & Safety...")

    rules_to_test = [
        ("landmark-one-main", "body", "<body><header></header><div id='main'></div><footer></footer></body>"),
        ("meta-viewport", "head", "<head><title>Test</title></head>"),
        ("page-has-heading-one", "h2.hero-title", "<h2 class='hero-title'>Summer Collection</h2>"),
        ("heading-order", "h4.sub", "<h4 class='sub'>Section Subheading</h4>"),
        ("scrollable-region-focusable", ".carousel-container", "<div class='carousel-container' style='overflow-x:auto'></div>"),
        ("image-alt", "img.prod", "<img src='shoe.jpg' class='prod'>"),
        ("image-redundant-alt", "a > img", "<a href='/cart'><img src='cart.svg' alt='Cart'>Cart</a>"),
        ("button-name", "button.cart-btn", "<button class='cart-btn'><svg></svg></button>"),
        ("link-name", "a.social-x", "<a href='https://x.com' class='social-x'><svg></svg></a>"),
        ("aria-allowed-attr", "div[role='region']", "<div role='region' aria-checked='true'></div>"),
        ("empty-heading", "h3.spacer", "<h3 class='spacer'></h3>"),
        ("color-contrast", ".product-card .price", "<span class='price' style='color:#a0a0a0'>$29</span>"),
    ]

    for rule_id, selector, html in rules_to_test:
        fixer = get_specialized_fixer(rule_id)
        assert fixer is not None, f"Specialized fixer missing for {rule_id}"
        
        plan = fixer.create_fix_plan(
            issue_id=f"test_{rule_id}",
            selector=selector,
            element_html=html,
            dom_context={"title": "AURA Store", "nearbyHeading": "Sneakers"},
            attempt=1,
        )
        assert plan is not None, f"Fix plan generation failed for {rule_id}"

        # Test safety validation
        is_safe, errors = validate_fix_plan(plan)
        assert is_safe, f"Safety validation failed for {rule_id}: {errors}"

        # Test patch compilation
        patch_res = compile_patch(plan)
        assert patch_res.success, f"Patch compilation failed for {rule_id}: {patch_res.error}"
        assert patch_res.patch_js and len(patch_res.patch_js) > 10

        print(f" -> Fixer '{rule_id}' planned, validated & compiled safely [OK]")


async def test_browser_live_repairs():
    print("\n[3] Testing Live Playwright Rendering & Rule Verification...")
    browser_agent = BrowserAgent()
    context = await browser_agent.create_context()

    # Create synthetic test page missing main, viewport, and h1
    synthetic_html = """<!DOCTYPE html>
<html>
<head>
    <title>AURA Test Page</title>
</head>
<body>
    <header><h1>Header Brand</h1><nav><a href="#home">Home</a></nav></header>
    <div id="content" class="main-content">
        <h2 class="hero-title">Exclusive Arrivals</h2>
        <div class="carousel-container" style="overflow-x:auto; width:200px;">
            <div style="width:500px">Wide Scroll Content</div>
        </div>
    </div>
    <footer><p>&copy; 2026</p></footer>
</body>
</html>"""
    
    import tempfile
    temp_file = Path(tempfile.gettempdir()) / "aura_specialized_test.html"
    temp_file.write_text(synthetic_html, encoding="utf-8")

    page = await browser_agent.load_page(str(temp_file), context)

    # 1. Test Meta Viewport repair
    print(" -> Executing meta-viewport patch in browser...")
    viewport_plan = MetaViewportFixer.create_fix_plan("mv_1", "head", "", {})
    patch_mv = compile_patch(viewport_plan)
    apply_res = await browser_agent.apply_patch(page, patch_mv.patch_js, viewport_plan)
    assert apply_res["success"]
    mv_dom = await MetaViewportFixer.verify_dom(page)
    assert mv_dom["valid"], f"Viewport DOM check failed: {mv_dom}"
    print(f"    * Meta Viewport Verified: {mv_dom['content']} [PASS]")

    # 2. Test Landmark One Main repair
    print(" -> Executing landmark-one-main patch in browser...")
    main_plan = LandmarkOneMainFixer.create_fix_plan("lom_1", "body", "", {})
    patch_main = compile_patch(main_plan)
    apply_main = await browser_agent.apply_patch(page, patch_main.patch_js, main_plan)
    assert apply_main["success"]
    main_dom = await LandmarkOneMainFixer.verify_dom(page)
    assert main_dom["valid"], f"Landmark DOM check failed: {main_dom}"
    assert main_dom["count"] == 1
    print(f"    * Landmark <main> Verified: Count={main_dom['count']} [PASS]")

    # 3. Test Scrollable Region Focusable repair
    print(" -> Executing scrollable-region-focusable patch in browser...")
    scroll_plan = ScrollableRegionFocusableFixer.create_fix_plan("srf_1", ".carousel-container", "", {})
    patch_scroll = compile_patch(scroll_plan)
    apply_scroll = await browser_agent.apply_patch(page, patch_scroll.patch_js, scroll_plan)
    assert apply_scroll["success"]
    tabindex_val = await page.evaluate("() => document.querySelector('.carousel-container').getAttribute('tabindex')")
    assert tabindex_val == "0"
    print(f"    * Scrollable region tabindex='0' Verified: [PASS]")

    await browser_agent.stop()
    print("\n======================================================================")
    print("ALL SPECIALIZED RULE FIXERS & ACCEPTANCE CHECKS PASSED [OK]")
    print("======================================================================")


async def main():
    await test_fixability_classifier()
    await test_specialized_rule_fixers()
    await test_browser_live_repairs()


if __name__ == "__main__":
    asyncio.run(main())
