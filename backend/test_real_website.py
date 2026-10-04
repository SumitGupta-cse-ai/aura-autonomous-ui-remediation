"""AURA Real Website Test — Tests the full pipeline on real URLs."""
import httpx
import time
import sys

def test_url(base: str, url: str, label: str):
    print(f"\n{'='*60}")
    print(f"[TEST] {label}")
    print(f"[TEST] URL: {url}")
    print(f"{'='*60}")

    # 1. Start scan
    try:
        r = httpx.post(f"{base}/api/scan", json={"url": url}, timeout=10.0)
        if r.status_code != 200:
            print(f"[TEST] SCAN START FAILED: HTTP {r.status_code} — {r.text[:200]}")
            return
        data = r.json()
        scan_id = data["scan_id"]
        print(f"[TEST] Scan ID: {scan_id}")
    except Exception as e:
        print(f"[TEST] SCAN START FAILED: {e}")
        return

    # 2. Wait for scan to complete
    max_wait = 30
    for i in range(max_wait):
        time.sleep(1)
        try:
            scan = httpx.get(f"{base}/api/scan/{scan_id}", timeout=10.0).json()
            status = scan.get("status", "")
            if status in ("complete", "error"):
                break
        except Exception:
            continue

    print(f"[TEST] Scan status: {scan.get('status')}")

    # 3. Report issues
    issues = scan.get("issues", [])
    print(f"[TEST] Total issues found: {len(issues)}")

    if not issues:
        timeline = scan.get("timeline", [])
        if timeline:
            print(f"[TEST] Timeline events:")
            for ev in timeline[-5:]:
                print(f"  [{ev.get('event_type', '')}] {ev.get('message', '')} | {ev.get('details', '')}")
        return

    for idx, issue in enumerate(issues[:10], 1):
        print(f"  Issue {idx}: {issue['rule_id']} | Selector: {issue.get('element_selector', '')[:60]} | Severity: {issue.get('severity', '')}")

    # 4. Attempt to fix the FIRST issue
    first_issue = issues[0]
    issue_id = first_issue["id"]
    rule_id = first_issue["rule_id"]
    print(f"\n[TEST] Attempting fix for: {rule_id} ({issue_id})")

    try:
        fix_res = httpx.post(f"{base}/api/scan/{scan_id}/fix/{issue_id}", timeout=30.0).json()
        print(f"[TEST] Fix result success: {fix_res.get('success')}")

        updated_scan = httpx.get(f"{base}/api/scan/{scan_id}", timeout=10.0).json()
        updated_issue = next((i for i in updated_scan["issues"] if i["id"] == issue_id), None)
        if updated_issue:
            ver = updated_issue.get("verification") or {}
            print(f"[TEST] Updated Issue Status: {updated_issue['status']}")
            print(f"[TEST] Verification Status: {ver.get('status', 'N/A')}")
            details = str(ver.get("details", "")).encode("ascii", "ignore").decode("ascii")
            print(f"[TEST] Verification Details: {details}")
        else:
            print(f"[TEST] Issue not found after fix attempt")
    except Exception as e:
        print(f"[TEST] Fix attempt failed: {e}")

    # 5. Get report
    try:
        report = httpx.get(f"{base}/api/scan/{scan_id}/report", timeout=10.0).json()
        print(f"\n[TEST] REPORT:")
        print(f"  Total: {report.get('total_issues')}")
        print(f"  Fixed: {report.get('issues_fixed')}")
        print(f"  Unresolved: {report.get('issues_unresolved')}")
        print(f"  Needs Review: {report.get('issues_needs_review')}")
    except Exception as e:
        print(f"[TEST] Report failed: {e}")


if __name__ == "__main__":
    base = "http://127.0.0.1:8000"

    # Test 1: Built-in demo
    test_url(base, f"{base}/demo-site/demo1.html", "BUILT-IN DEMO SITE")

    # Test 2: Localhost (same backend serving demo — proves localhost works)
    test_url(base, "http://localhost:8000/demo-site/demo2.html", "LOCALHOST WEBSITE")

    # Test 3: Real public website
    test_url(base, "https://example.com", "PUBLIC WEBSITE — example.com")

    print(f"\n{'='*60}")
    print("[TEST] ALL TESTS COMPLETED")
    print(f"{'='*60}")
