"""AURA Deep Multi-Demo Verification Suite — Tests all issues on Full Remediation Demo, Demo 1, Demo 2, and Demo 3."""
import httpx
import time
import sys

def test_demo_site(base: str, demo_name: str, demo_file: str):
    url = f"{base}/demo-site/{demo_file}"
    print(f"\n{'='*70}")
    print(f"[DEEP TEST] Testing {demo_name} ({demo_file})")
    print(f"[DEEP TEST] Target URL: {url}")
    print(f"{'='*70}")

    # 1. Start scan
    r = httpx.post(f"{base}/api/scan", json={"url": url}, timeout=10.0).json()
    scan_id = r["scan_id"]
    print(f"[DEEP TEST] Scan ID: {scan_id}")

    # Wait for scan to complete
    for _ in range(30):
        time.sleep(0.5)
        scan = httpx.get(f"{base}/api/scan/{scan_id}", timeout=10.0).json()
        if scan.get("status") in ("complete", "error"):
            break

    issues = scan.get("issues", [])
    print(f"[DEEP TEST] Found {len(issues)} initial issues:")
    for idx, issue in enumerate(issues, 1):
        print(f"  Issue {idx}: {issue['rule_id']} | Selector: {issue.get('element_selector', '')} | Severity: {issue.get('severity')}")

    # Fix each issue sequentially
    verified_count = 0
    failed_count = 0

    for issue in issues:
        rule_id = issue["rule_id"]
        issue_id = issue["id"]
        selector = issue.get("element_selector", "")
        print(f"\n[DEEP TEST] Attempting Fix for: {rule_id} ({selector})")

        fix_res = httpx.post(f"{base}/api/scan/{scan_id}/fix/{issue_id}", timeout=30.0).json()
        success = fix_res.get("success", False)

        updated_scan = httpx.get(f"{base}/api/scan/{scan_id}", timeout=10.0).json()
        updated_issue = next((i for i in updated_scan["issues"] if i["id"] == issue_id), None)

        status = updated_issue["status"] if updated_issue else "unknown"
        ver = (updated_issue.get("verification") if updated_issue else {}) or {}
        ver_status = ver.get("status", "N/A")
        details = str(ver.get("details", "")).encode("ascii", "ignore").decode("ascii")

        print(f"[DEEP TEST] Result Success: {success} | Issue Status: {status} | Verification: {ver_status}")
        print(f"[DEEP TEST] Details: {details}")

        if ver_status == "verified" or status == "fixed":
            verified_count += 1
        else:
            failed_count += 1

    # Test Sandbox, Diff, and Download endpoints
    print(f"[DEEP TEST] Testing Sandbox Serving endpoint: {base}/sandbox/{scan_id}")
    try:
        sb_res = httpx.get(f"{base}/sandbox/{scan_id}", timeout=10.0)
        print(f"[DEEP TEST] Sandbox HTTP Status: {sb_res.status_code} | Length: {len(sb_res.text)} bytes")
        assert sb_res.status_code == 200, f"Expected 200, got {sb_res.status_code}"
    except Exception as e:
        print(f"[DEEP TEST] Sandbox check failed: {e}")

    # Test Diff endpoint
    if issues:
        first_id = issues[0]["id"]
        try:
            diff_res = httpx.get(f"{base}/api/scan/{scan_id}/diff/{first_id}", timeout=10.0).json()
            print(f"[DEEP TEST] Diff endpoint: has_diff={diff_res.get('has_diff')} | len={len(diff_res.get('diff', ''))}")
        except Exception as e:
            print(f"[DEEP TEST] Diff check failed: {e}")

    # Test Patch ZIP download
    try:
        zip_res = httpx.get(f"{base}/api/scan/{scan_id}/download", timeout=10.0)
        print(f"[DEEP TEST] ZIP download HTTP Status: {zip_res.status_code} | Length: {len(zip_res.content)} bytes")
        assert zip_res.status_code == 200, f"Expected 200, got {zip_res.status_code}"
    except Exception as e:
        print(f"[DEEP TEST] ZIP download check failed: {e}")

    # Test Report Markdown download
    try:
        rep_res = httpx.get(f"{base}/api/scan/{scan_id}/report/download", timeout=10.0)
        print(f"[DEEP TEST] Report download HTTP Status: {rep_res.status_code} | Length: {len(rep_res.content)} bytes")
        assert rep_res.status_code == 200, f"Expected 200, got {rep_res.status_code}"
    except Exception as e:
        print(f"[DEEP TEST] Report download check failed: {e}")

    print(f"\n[DEEP TEST] SUMMARY FOR {demo_name}:")
    print(f"  Total Issues: {len(issues)}")
    print(f"  Verified Fixed: {verified_count}")
    print(f"  Failed / Rolled Back: {failed_count}")
    print(f"{'='*70}\n")
    return verified_count, failed_count, len(issues)

if __name__ == "__main__":
    base = "http://127.0.0.1:8000"

    v0, f0, t0 = test_demo_site(base, "Full Remediation Demo (ShopX)", "full_remediation.html")
    v1, f1, t1 = test_demo_site(base, "Demo 1 — Accessibility Basics", "demo1.html")
    v2, f2, t2 = test_demo_site(base, "Demo 2 — EcoShop E-Commerce Store", "demo2.html")
    v3, f3, t3 = test_demo_site(base, "Demo 3 — CloudMetrics SaaS Dashboard", "demo3.html")

    print(f"============================================================")
    print(f"GRAND TOTAL SUMMARY ACROSS ALL DEMO SITES:")
    print(f"  Full Remediation Demo: {v0}/{t0} Verified")
    print(f"  Demo 1: {v1}/{t1} Verified")
    print(f"  Demo 2: {v2}/{t2} Verified")
    print(f"  Demo 3: {v3}/{t3} Verified")
    print(f"  Total Verified: {v0+v1+v2+v3} / {t0+t1+t2+t3}")
    print(f"============================================================")
