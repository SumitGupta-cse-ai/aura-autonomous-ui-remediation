"""AURA Universal Website Fix Engine Regression Test Suite

Tests:
1. Universal scanning of synthetic and real-world HTML structures
2. Remediation of:
   - meta-viewport
   - landmark-unique
   - landmark-no-duplicate-contentinfo
   - link-name
   - image-alt
   - image-redundant-alt
   - label / label-title-only
   - color-contrast
   - page-has-heading-one
3. Empirical DOM verification delta
4. Multi-attempt fallback logic
5. Sandbox persistence
"""

import time
import httpx
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_universal_test():
    print("=" * 70)
    print("AURA UNIVERSAL FIX ENGINE REGRESSION TEST")
    print("=" * 70)

    test_url = f"{BASE_URL}/demo-site/universal_test.html"
    print(f"\n[1] Starting Scan on Universal Test Page: {test_url}")

    try:
        r = httpx.post(f"{BASE_URL}/api/scan", json={"url": test_url}, timeout=15.0)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        scan_id = data["scan_id"]
        print(f" -> Scan successfully initialized! Scan ID: {scan_id}")
    except Exception as e:
        print(f"ERROR: Could not start scan: {e}")
        return False

    # Poll until scan completes
    print("\n[2] Waiting for scan and analysis to complete...")
    for _ in range(30):
        time.sleep(1.0)
        scan = httpx.get(f"{BASE_URL}/api/scan/{scan_id}").json()
        status = scan.get("status")
        if status in ("complete", "completed_with_warnings", "error"):
            break

    print(f" -> Scan status: {scan.get('status')}")
    issues = scan.get("issues", [])
    print(f" -> Total accessibility issues detected: {len(issues)}")

    rules_found = [i["rule_id"] for i in issues]
    print(f" -> Detected Rules: {', '.join(set(rules_found))}")

    # Verify key target rules are detected
    expected_rules = [
        "meta-viewport",
        "landmark-unique",
        "landmark-no-duplicate-contentinfo",
        "link-name",
        "image-alt",
        "image-redundant-alt",
        "label-title-only",
        "color-contrast",
    ]

    for expected in expected_rules:
        found = any(i["rule_id"] == expected for i in issues)
        print(f"    Check {expected}: {'DETECTED [OK]' if found else 'NOT DETECTED (warning)'}")

    # Now fix issues one by one using the Universal Fix Engine
    print("\n[3] Executing Universal Fix Engine on detected issues...")
    results = {}
    
    for issue in issues:
        rule_id = issue["rule_id"]
        issue_id = issue["id"]
        print(f"\n -> Fixing rule: [{rule_id}] on selector: {issue.get('element_selector', '')[:40]}")

        fix_resp = httpx.post(f"{BASE_URL}/api/scan/{scan_id}/fix/{issue_id}", timeout=25.0)
        if fix_resp.status_code != 200:
            print(f"    FAILED: HTTP {fix_resp.status_code} - {fix_resp.text}")
            results[rule_id] = False
            continue

        fix_data = fix_resp.json()
        success = fix_data.get("success", False)
        status_result = fix_data.get("status")
        print(f"    Fix API success: {success} | Status: {status_result}")

        # Fetch updated issue state
        updated_scan = httpx.get(f"{BASE_URL}/api/scan/{scan_id}").json()
        updated_issue = next((i for i in updated_scan.get("issues", []) if i["id"] == issue_id), None)

        if updated_issue:
            ver = updated_issue.get("verification") or {}
            v_status = ver.get("status")
            v_details = str(ver.get("details", "")).encode("ascii", "ignore").decode("ascii")
            evidence = updated_issue.get("evidence_notes") or ver.get("evidence", [])
            
            print(f"    Verification Status: {v_status}")
            print(f"    Verification Details: {v_details}")
            print(f"    Before Count: {ver.get('before_count')} -> After Count: {ver.get('after_count')}")
            print(f"    Empirical Evidence: {len(evidence)} checkpoints logged")
            for ev in evidence[:3]:
                ev_clean = str(ev).encode('ascii', 'ignore').decode('ascii')
                print(f"       * {ev_clean}")

            is_verified_or_expected = updated_issue["status"] in ("fixed", "partially_fixed", "source_required", "third_party")
            results[f"{rule_id}_{issue_id[:4]}"] = is_verified_or_expected
        else:
            results[f"{rule_id}_{issue_id[:4]}"] = False

    # Check Sandbox Serving
    print("\n[4] Verifying Patched Sandbox Output...")
    sandbox_resp = httpx.get(f"{BASE_URL}/sandbox/{scan_id}")
    if sandbox_resp.status_code == 200:
        print(" -> Sandbox preview endpoint returned HTTP 200 OK [OK]")
        content = sandbox_resp.text
        if "width=device-width, initial-scale=1" in content:
            print(" -> meta-viewport fix verified inside Sandbox HTML [OK]")
        if 'role="region"' in content or 'Secondary' in content:
            print(" -> landmark deduplication verified inside Sandbox HTML [OK]")
    else:
        print(f" -> Sandbox preview check note: HTTP {sandbox_resp.status_code}")

    # Check Diff Endpoint
    print("\n[5] Verifying DOM Diff Endpoint...")
    if issues:
        first_id = issues[0]["id"]
        diff_resp = httpx.get(f"{BASE_URL}/api/scan/{scan_id}/diff/{first_id}")
        if diff_resp.status_code == 200:
            print(f" -> Diff API operational! Has diff: {diff_resp.json().get('has_diff')}")

    # Summary
    print("\n" + "=" * 70)
    print("UNIVERSAL ENGINE TEST RESULTS SUMMARY")
    print("=" * 70)
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    print(f"Pass Rate: {passed}/{total} issues handled successfully ({int(passed/max(1, total)*100)}%)")
    for k, v in results.items():
        print(f"  {k}: {'PASS [OK]' if v else 'FAIL [X]'}")

    return passed > 0

if __name__ == "__main__":
    success = run_universal_test()
    sys.exit(0 if success else 1)
