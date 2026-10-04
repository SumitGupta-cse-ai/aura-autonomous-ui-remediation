import httpx
import time

def run_test():
    base = "http://127.0.0.1:8000"
    
    # 1. Start scan on Demo 1
    demo_url = f"{base}/demo-site/demo1.html"
    print(f"[TEST] 1. Launching scan on: {demo_url}")
    r = httpx.post(f"{base}/api/scan", json={"url": demo_url}).json()
    scan_id = r["scan_id"]
    print(f"[TEST] Scan ID: {scan_id}")
    
    time.sleep(2.5)
    
    scan = httpx.get(f"{base}/api/scan/{scan_id}").json()
    print(f"[TEST] Initial scan status: {scan['status']}, Total issues found: {len(scan['issues'])}")
    
    for idx, issue in enumerate(scan['issues'], 1):
        print(f"  Issue {idx}: {issue['rule_id']} | Selector: {issue['element_selector']} | Status: {issue['status']}")
    
    # Test all issues sequentially
    for issue in scan['issues']:
        rule_id = issue['rule_id']
        issue_id = issue['id']
        print(f"\n[TEST] Testing Fix for: {rule_id} ({issue_id})")
        fix_res = httpx.post(f"{base}/api/scan/{scan_id}/fix/{issue_id}").json()
        print(f"[TEST] Fix result success: {fix_res.get('success')}")
        
        updated_scan = httpx.get(f"{base}/api/scan/{scan_id}").json()
        updated_issue = next(i for i in updated_scan['issues'] if i['id'] == issue_id)
        ver = updated_issue.get('verification') or {}
        print(f"[TEST] Updated Issue Status: {updated_issue['status']}")
        print(f"[TEST] Verification Status: {ver.get('status')}")
        details = str(ver.get('details', '')).encode('ascii', 'ignore').decode('ascii')
        print(f"[TEST] Verification Details: {details}")

    # Final Summary
    final_scan = httpx.get(f"{base}/api/scan/{scan_id}").json()
    summary = final_scan.get('summary', {})
    print(f"\n==========================================")
    print(f"[TEST] FINAL SUMMARY REPORT:")
    print(f"  Total Issues: {summary.get('total_issues')}")
    print(f"  Fixed & Verified: {summary.get('fixed')}")
    print(f"  Unresolved: {summary.get('unresolved')}")
    print(f"==========================================")

if __name__ == "__main__":
    run_test()
