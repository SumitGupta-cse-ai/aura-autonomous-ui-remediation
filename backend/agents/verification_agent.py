"""AURA Verification Agent — Compares before/after audit results."""

from typing import List, Dict, Any
from models.schemas import VerificationResult, VerificationStatus


class VerificationAgent:
    """Evaluates before/after audit results to verify fixes."""

    def verify_fix(
        self,
        issue_rule_id: str,
        issue_selector: str,
        before_issues: List[Dict[str, Any]],
        after_issues: List[Dict[str, Any]],
        attempt: int = 1,
    ) -> VerificationResult:
        """
        Compare before and after audit results.

        Checks:
        1. Did the target violation disappear?
        2. Were any NEW critical/serious issues introduced?
        """
        before_count = len(before_issues)
        after_count = len(after_issues)

        # Check if the specific target issue was resolved
        original_resolved = True
        for issue in after_issues:
            target_rule = issue.get("rule_id")
            target_sel = issue.get("element_selector")

            # Match by rule_id and target selector
            if target_rule == issue_rule_id:
                if target_sel == issue_selector or not issue_selector or target_sel == "html":
                    original_resolved = False
                    break

        # Check for regressions — new critical/serious issues that were NOT present before
        before_rule_set = set()
        for issue in before_issues:
            key = (issue.get("rule_id", ""), issue.get("element_selector", ""))
            before_rule_set.add(key)

        new_serious_issues = 0
        for issue in after_issues:
            key = (issue.get("rule_id", ""), issue.get("element_selector", ""))
            if key not in before_rule_set:
                # Check if it's a completely new rule_id that wasn't in before_issues at all
                before_rules = {i.get("rule_id") for i in before_issues}
                if issue.get("rule_id") not in before_rules:
                    if issue.get("severity") in ("critical", "serious"):
                        new_serious_issues += 1

        regression_detected = new_serious_issues > 0

        # Determine verification status based on empirical log evidence
        if original_resolved and not regression_detected:
            status = VerificationStatus.VERIFIED
            details = f"Issue '{issue_rule_id}' resolved. Violation count: {before_count} -> {after_count}."
        elif original_resolved and regression_detected:
            status = VerificationStatus.REGRESSION_DETECTED
            details = f"Original issue '{issue_rule_id}' resolved, but {new_serious_issues} new serious regression(s) introduced."
        elif not original_resolved and not regression_detected:
            status = VerificationStatus.FAILED
            details = f"Original issue '{issue_rule_id}' still present after fix attempt {attempt}."
        else:
            status = VerificationStatus.NEEDS_REVIEW
            details = f"Fix inconclusive for '{issue_rule_id}' — original issue persists and new issue(s) detected."

        return VerificationResult(
            status=status,
            original_issue_resolved=original_resolved,
            new_issues_introduced=new_serious_issues,
            regression_detected=regression_detected,
            before_count=before_count,
            after_count=after_count,
            details=details,
            attempts=attempt,
        )
