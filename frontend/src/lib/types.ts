// AURA TypeScript Types — matches backend Pydantic models

export type ScanStatus =
  | 'pending'
  | 'scanning'
  | 'auditing'
  | 'analyzing'
  | 'complete'
  | 'error';

export type IssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor';

export type IssueStatus =
  | 'unresolved'
  | 'fixing'
  | 'fixed'
  | 'failed'
  | 'needs_review'
  | 'rolled_back';

export type VerificationStatus =
  | 'pending'
  | 'verified'
  | 'failed'
  | 'needs_review'
  | 'regression_detected';

export type TimelineEventType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'action'
  | 'progress';

export interface ScanRequest {
  url: string;
}

export interface ScanResponse {
  scan_id: string;
  url: string;
  status: ScanStatus;
  created_at: string;
}

export interface AccessibilityIssue {
  id: string;
  rule_id: string;
  rule_description: string;
  wcag_criteria: string[];
  severity: IssueSeverity;
  axe_impact: string;
  element_selector: string;
  element_html: string;
  element_context: string;
  description: string;
  help_url: string;
  status: IssueStatus;
  analysis?: IssueAnalysis;
  fix_plan?: FixPlan;
  verification?: VerificationResult;
  before_screenshot?: string;
  after_screenshot?: string;
  original_html_snippet?: string;
  patched_html_snippet?: string;
  dom_diff?: string;
}

export interface IssueAnalysis {
  root_cause: string;
  user_impact: string;
  is_auto_remediable: boolean;
  recommended_strategy: string;
  verification_approach: string;
  confidence: number;
}

export interface FixPlan {
  issue_id: string;
  strategy: string;
  target: { selector: string };
  changes: FixChange[];
  reason: string;
  verification_rule: string;
  rollback_info: Record<string, unknown>;
}

export interface FixChange {
  type: string;
  attribute?: string;
  value?: string;
  property?: string;
  tag?: string;
  text?: string;
}

export interface VerificationResult {
  status: VerificationStatus;
  original_issue_resolved: boolean;
  new_issues_introduced: number;
  regression_detected: boolean;
  before_count: number;
  after_count: number;
  details: string;
  attempts: number;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  event_type: TimelineEventType;
  message: string;
  details?: string;
  duration_ms?: number;
}

export interface ScanData {
  scan_id: string;
  url: string;
  status: ScanStatus;
  created_at: string;
  completed_at?: string;
  issues: AccessibilityIssue[];
  timeline: TimelineEvent[];
  screenshot?: string;
  summary?: ScanSummary;
  sandbox_url?: string;
}

export interface ScanSummary {
  total_issues: number;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  fixed: number;
  unresolved: number;
  needs_review: number;
}

export interface FixResult {
  success: boolean;
  issue_id: string;
  verification: VerificationResult;
  patch_applied: boolean;
  error?: string;
}

export interface ScanReport {
  scan_id: string;
  url: string;
  scan_timestamp: string;
  total_issues: number;
  issues_by_severity: Record<IssueSeverity, number>;
  issues_fixed: number;
  issues_unresolved: number;
  issues_needs_review: number;
  wcag_mappings: Record<string, string[]>;
  fixes_applied: FixSummary[];
  limitations: string[];
}

export interface FixSummary {
  issue_id: string;
  rule: string;
  strategy: string;
  verification_status: VerificationStatus;
}

export interface BeforeAfterData {
  before_screenshot?: string;
  after_screenshot?: string;
  before_html: string;
  after_html: string;
  before_issue_count: number;
  after_issue_count: number;
  issue_resolved: boolean;
}
