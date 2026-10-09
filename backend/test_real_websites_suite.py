"""Diagnostic test suite to verify AURA on diverse live websites."""

import asyncio
import uuid
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from agents.orchestrator import Orchestrator


async def test_single_website(url: str, label: str):
    print(f"\n" + "="*70)
    print(f"TESTING SITE: {label} ({url})")
    print("="*70)

    orchestrator = Orchestrator()
    scan_id = str(uuid.uuid4())[:8]

    try:
        # Run scan
        await orchestrator.run_scan(scan_id, url)
        scan = orchestrator.get_scan(scan_id)
        if not scan:
            print(f"[{label}] FAILED: Scan not found after run")
            return False

        print(f"[{label}] Scan Status: {scan.status}")
        print(f"[{label}] Total Issues: {len(scan.issues)}")
        if scan.summary:
            print(f"[{label}] Quality Score: {scan.summary.overall_quality_score}/100")
            print(f"[{label}] Accessibility Score: {scan.summary.accessibility_score}/100")
            print(f"[{label}] Problems: {scan.summary.problems_count}, Improvements: {scan.summary.improvements_count}")

        if scan.completeness_report:
            print(f"[{label}] Completeness: {scan.completeness_report.completeness_percentage}% ({scan.completeness_report.status})")
            if scan.completeness_report.checks_unavailable:
                print(f"[{label}] Unavailable Checks: {scan.completeness_report.checks_unavailable}")
            if scan.completeness_report.reasons_for_skips_or_unavailability:
                print(f"[{label}] Skips / Notes: {scan.completeness_report.reasons_for_skips_or_unavailability}")

        # Test Auto-Fix on candidate issues
        fixable = [i for i in scan.issues if i.status.value != "fixed" and getattr(i, "fix_classification", None) and i.fix_classification.value in ("safe_auto_fixable", "auto_fixable")]
        print(f"[{label}] Candidate Auto-Fixable Issues: {len(fixable)}")
        if fixable:
            print(f"[{label}] Testing fix on first issue: {fixable[0].rule_id}...")
            fix_res = await orchestrator.fix_issue(scan_id, fixable[0].id)
            print(f"[{label}] Fix Result: {fix_res.get('success')} (Status: {fix_res.get('status')})")

        return True
    except Exception as e:
        print(f"[{label}] UNHANDLED EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        await orchestrator.stop()


async def main():
    test_sites = [
        ("https://www.meesho.com/", "Meesho (E-commerce / React SPA)"),
        ("https://news.ycombinator.com/", "Hacker News (Simple HTML Table)"),
        ("https://en.wikipedia.org/wiki/Main_Page", "Wikipedia (Heavy CSP / Wiki DOM)"),
    ]

    results = {}
    for url, label in test_sites:
        success = await test_single_website(url, label)
        results[label] = success

    print("\n" + "="*70)
    print("FINAL SUITE SUMMARY")
    print("="*70)
    for label, ok in results.items():
        print(f" - {label}: {'PASS [OK]' if ok else 'FAIL [ERR]'}")


if __name__ == "__main__":
    asyncio.run(main())
