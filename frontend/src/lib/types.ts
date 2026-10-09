// AURA TypeScript Types — matches backend Pydantic models

export type ScanStatus =
  | 'pending'
  | 'scanning'
  | 'auditing'
  | 'analyzing'
  | 'complete'
  | 'completed_with_warnings'
  | 'partial_analysis'
  | 'target_access_restricted'
  | 'login_required'
  | 'failed'
  | 'error';

export type FixClassification =
  | 'auto_fixable'
  | 'safe_auto_fixable'
  | 'auto_fixable_with_review'
  | 'preview_only'
  | 'source_access_required'
  | 'third_party'
  | 'not_safe_to_auto_fix'
  | 'unverified'
  | 'approval_required';

export type IssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor';

export type IssueCategory = 'problem' | 'improvement';

export type IssueStatus =
  | 'detected'
  | 'validated'
  | 'preview_ready'
  | 'applying'
  | 'verifying'
  | 'fixed'
  | 'partially_fixed'
  | 'blocked'
  | 'unverified'
  | 'source_required'
  | 'third_party'
  | 'not_applicable'
  | 'failed'
  | 'unresolved'
  | 'fixing'
  | 'needs_review'
  | 'verification_failed'
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

export interface WebsiteDocument {
  url: string;
  title: string;
  framework_detected?: string;
  pages: string[];
  elements_count: number;
  images_count: number;
  links_count: number;
  forms_count: number;
  buttons_count: number;
  headings_count: number;
  resources_summary?: Record<string, unknown>;
  frames?: Array<{ src: string; title: string; isSameOrigin: boolean }>;
  third_party_warnings?: string[];
  security_challenge_detected?: boolean;
  login_required?: boolean;
  cookie_banner_dismissed?: boolean;
}

export interface CompletenessReport {
  completeness_percentage: number;
  status: 'FULL' | 'PARTIAL';
  checks_completed: string[];
  checks_unavailable: string[];
  modules_status: Record<string, string>;
  pages_analyzed: number;
  pages_skipped: number;
  reasons_for_skips_or_unavailability: string[];
}

export interface TargetDescriptor {
  page_url?: string;
  normalized_url?: string;
  frame_id?: string;
  rule_id: string;
  semantic_role?: string;
  stable_selector?: string;
  dom_fingerprint?: string;
  text_fingerprint?: string;
  ancestor_fingerprint?: string;
  bounding_box?: Record<string, number>;
  component_fingerprint?: string;
}

export interface AccessibilityIssue {
  id: string;
  rule_id: string;
  target_descriptor?: TargetDescriptor;
  rule_description: string;
  wcag_criteria: string[];
  severity: IssueSeverity;
  category?: IssueCategory;
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
  priority?: string; // P0, P1, P2, P3
  is_blocking?: boolean;
  blocking_reason?: string;
  dependencies?: string[];
  dependency_status?: "READY" | "BLOCKED";
  fix_classification?: FixClassification;
  fixability_score?: number;
  is_retryable?: boolean;
  non_retryable_reason?: string;
  fix_strategy_attempts?: number;
  fix_strategies_tried?: string[];
  is_third_party?: boolean;
  target_mode?: 'authorized_source' | 'external_sandbox';
  strategy_used?: string;
  evidence_notes?: string[];
  before_count?: number;
  after_count?: number;
  resolved_delta?: number;
  violation_fingerprint?: string;
  target_fingerprint?: string;
  causal_regressions?: string[];
  occurrence_count?: number;
  affected_elements?: string[];
  affected_components?: string[];
  shared_selector?: string;
  root_cause_id?: string;
  total_occurrences?: number;
  raw_findings_count?: number;
}

export interface RawFinding {
  id: string;
  rule_id: string;
  impact: string;
  selector: string;
  element_html: string;
  component_fingerprint: string;
  dom_fingerprint: string;
  computed_styles?: Record<string, unknown>;
  parent_structure: string;
  text: string;
  source: string;
  frame?: string;
  page: string;
}

export interface RootIssue {
  id: string;
  rule_id: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  root_cause: string;
  occurrence_count: number;
  affected_elements: string[];
  affected_components: string[];
  fix_strategy?: string;
  fixability: number;
  verification_state: string;
  shared_selector?: string;
}

export interface FixJob {
  job_id: string;
  issue_id: string;
  root_cause: string;
  strategy: string;
  dependencies: string[];
  priority: string;
  status: 'DETECTED' | 'VALIDATED' | 'PREVIEW_READY' | 'APPLYING' | 'VERIFYING' | 'FIXED' | 'PARTIALLY_FIXED' | 'FAILED' | 'BLOCKED' | 'UNVERIFIED';
  attempts: number;
  resolved_occurrences: number;
  total_occurrences: number;
  error?: string;
}

export interface DesignSystem {
  primary_color?: string;
  secondary_colors: string[];
  background_colors: string[];
  text_colors: string[];
  font_families: string[];
  font_sizes: string[];
  heading_hierarchy: string[];
  border_radius?: string;
  spacing_patterns: string[];
  button_styles: Record<string, unknown>;
  card_styles: Record<string, unknown>;
}

export interface DiscoveredPage {
  url: string;
  title: string;
  issues_count: number;
  improvements_count: number;
}

export interface WebsiteStructure {
  has_header: boolean;
  has_navigation: boolean;
  has_hero: boolean;
  sections_count: number;
  has_footer: boolean;
  forms_count: number;
  interactive_elements_count: number;
}

export interface ColorPaletteOption {
  id: string;
  name: string;
  description: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  border: string;
  why: string;
  visual_effect: string;
  risk: string;
}

export interface ImprovementBundle {
  id: string;
  name: string;
  description: string;
  features: string[];
  rule_ids: string[];
}

export interface DesignAuditScores {
  visual_design?: number;
  typography: number;
  color_harmony?: number;
  spacing?: number;
  visual_hierarchy: number;
  cta_clarity: number;
  content_clarity?: number;
  image_usage?: number;
  consistency?: number;
  mobile_ux: number;
  overall_ui_quality: number;
  assessment_label?: string;
  explanations: Record<string, string>;
  color_consistency?: number;
  spacing_consistency?: number;
}

export interface IssueAnalysis {
  root_cause: string;
  user_impact: string;
  is_auto_remediable: boolean;
  recommended_strategy: string;
  verification_approach: string;
  confidence: number;
  issue_summary?: string;
  recommended_fix?: string;
  risk?: string;
  what?: string;
  why?: string;
  benefit?: string;
  impact?: string;
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
  target_violation_resolved?: boolean;
  new_issues_introduced: number;
  regression_detected: boolean;
  causal_regressions_count?: number;
  unrelated_new_findings_count?: number;
  target_fingerprint?: string;
  before_count: number;
  after_count: number;
  details: string;
  attempts: number;
  evidence?: string[];
  strategy?: string;
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
  raw_findings?: RawFinding[];
  fix_jobs?: FixJob[];
  timeline: TimelineEvent[];
  screenshot?: string;
  summary?: ScanSummary;
  sandbox_url?: string;
  original_url?: string;
  design_system?: DesignSystem;
  website_structure?: WebsiteStructure;
  discovered_pages?: DiscoveredPage[];
  design_scores?: DesignAuditScores;
  website_type?: string;
  color_palettes?: ColorPaletteOption[];
  improvement_bundles?: ImprovementBundle[];
  technical_health_status?: string;
  remediation_mode?: string;
  blocking_issues_count?: number;
  blocking_issues?: string[];
  fix_order?: string[];
  website_document?: WebsiteDocument;
  completeness_report?: CompletenessReport;
  access_status?: string;
  access_reason?: string;
}

export interface ScanSummary {
  total_issues: number;
  root_issues_count?: number;
  total_occurrences?: number;
  raw_findings_count?: number;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  fixed: number;
  unresolved: number;
  needs_review: number;
  problems_count?: number;
  improvements_count?: number;
  health_score_initial?: number;
  health_score_current?: number;
  ui_quality_initial?: number;
  ui_quality_current?: number;
  technical_health_status?: string;
  accessibility_score?: number;
  ux_score?: number;
  visual_score?: number;
  responsive_score?: number;
  consistency_score?: number;
  performance_score?: number;
  overall_quality_score?: number;
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
  health_score_initial?: number;
  health_score_current?: number;
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

export interface PreviewData {
  success: boolean;
  preview_url: string;
  type: string;
  id: string;
  name: string;
  proposed_improvements: string[];
  elements_affected: number;
  categories: Record<string, number>;
  risk: string;
  risk_label: string;
  disclaimer: string;
  error?: string;
}

export interface ElementInspectionData {
  element_name: string;
  selector: string;
  tag: string;
  detected_issues: string[];
  recommended_fix: string[];
  before: {
    background: string;
    text: string;
    contrast: string;
    contrast_status: string;
    padding: string;
    wcag: string;
  };
  after: {
    background: string;
    text: string;
    contrast: string;
    contrast_status: string;
    padding: string;
    wcag: string;
  };
  explainable_ai: {
    what: string;
    why: string;
    how: string;
    impact: string;
    verification: string;
  };
}

export interface AskAuraResponse {
  question: string;
  summary: string;
  reasons: string[];
  recommended_improvements: string[];
  suggested_action: string;
  suggested_id: string;
  action_label: string;
}

export interface DesignVariant {
  id: string;
  name: string;
  description: string;
  features: string[];
  preview_id: string;
}

export interface VersionHistoryItem {
  version: number;
  label: string;
  description: string;
  timestamp: string;
  changes_count: number;
  health_score: number;
}

export interface EightDimensionScores {
  before: Record<string, number>;
  after: Record<string, number>;
  verified_fixes: number;
  total_issues: number;
}

