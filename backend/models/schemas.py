"""AURA Pydantic Models — All data structures for the system."""

from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class ScanStatus(str, Enum):
    PENDING = "pending"
    SCANNING = "scanning"
    AUDITING = "auditing"
    ANALYZING = "analyzing"
    COMPLETE = "complete"
    COMPLETED_WITH_WARNINGS = "completed_with_warnings"
    PARTIAL_ANALYSIS = "partial_analysis"
    TARGET_ACCESS_RESTRICTED = "target_access_restricted"
    LOGIN_REQUIRED = "login_required"
    FAILED = "failed"
    ERROR = "error"


class FixClassification(str, Enum):
    AUTO_FIXABLE = "auto_fixable"
    SAFE_AUTO_FIXABLE = "safe_auto_fixable"
    AUTO_FIXABLE_WITH_REVIEW = "auto_fixable_with_review"
    PREVIEW_ONLY = "preview_only"
    SOURCE_ACCESS_REQUIRED = "source_access_required"
    THIRD_PARTY = "third_party"
    NOT_SAFE_TO_AUTO_FIX = "not_safe_to_auto_fix"
    UNVERIFIED = "unverified"
    APPROVAL_REQUIRED = "approval_required"  # legacy alias


class IssueSeverity(str, Enum):
    CRITICAL = "critical"
    SERIOUS = "serious"
    MODERATE = "moderate"
    MINOR = "minor"


class IssueCategory(str, Enum):
    PROBLEM = "problem"
    IMPROVEMENT = "improvement"


class IssueStatus(str, Enum):
    DETECTED = "detected"
    VALIDATED = "validated"
    PREVIEW_READY = "preview_ready"
    APPLYING = "applying"
    VERIFYING = "verifying"
    FIXED = "fixed"
    PARTIALLY_FIXED = "partially_fixed"
    BLOCKED = "blocked"
    UNVERIFIED = "unverified"
    SOURCE_REQUIRED = "source_required"
    THIRD_PARTY = "third_party"
    NOT_APPLICABLE = "not_applicable"
    FAILED = "failed"
    # Legacy & operational aliases
    UNRESOLVED = "unresolved"
    FIXING = "fixing"
    NEEDS_REVIEW = "needs_review"
    VERIFICATION_FAILED = "verification_failed"
    ROLLED_BACK = "rolled_back"


class VerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    FAILED = "failed"
    VERIFICATION_FAILED = "failed"  # alias to prevent runtime errors
    NEEDS_REVIEW = "needs_review"
    REGRESSION_DETECTED = "regression_detected"



class TimelineEventType(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    ACTION = "action"
    PROGRESS = "progress"


# --- Request/Response ---

class ScanRequest(BaseModel):
    url: str


class ScanResponse(BaseModel):
    scan_id: str
    url: str
    status: ScanStatus
    created_at: str


# --- Issue Models ---

class IssueAnalysis(BaseModel):
    root_cause: str = ""
    user_impact: str = ""
    is_auto_remediable: bool = True
    recommended_strategy: str = ""
    verification_approach: str = ""
    confidence: float = 0.9
    issue_summary: str = ""
    recommended_fix: str = ""
    risk: str = "Low"  # Low, Medium, High
    what: Optional[str] = None
    why: Optional[str] = None
    benefit: Optional[str] = None
    impact: str = "Medium"  # High, Medium, Low


class ColorPaletteOption(BaseModel):
    id: str
    name: str
    description: str
    primary: str
    secondary: str
    accent: str
    background: str
    surface: str
    text: str
    border: str
    why: str = ""
    visual_effect: str = ""
    risk: str = "Low"


class ImprovementBundle(BaseModel):
    id: str
    name: str
    description: str
    features: List[str] = []
    rule_ids: List[str] = []


class FixChange(BaseModel):
    type: str  # add_attribute, modify_attribute, remove_attribute, add_element, modify_style
    attribute: Optional[str] = None
    value: Optional[str] = None
    property: Optional[str] = None
    tag: Optional[str] = None
    text: Optional[str] = None


class FixPlan(BaseModel):
    issue_id: str
    strategy: str
    target: Dict[str, str]  # {"selector": "..."}
    changes: List[FixChange]
    reason: str
    verification_rule: str
    rollback_info: Dict[str, Any] = {}


class CausalClassification(str, Enum):
    PATCH_CAUSED = "patch_caused"
    PATCH_RELATED = "patch_related"
    PREEXISTING = "preexisting"
    DYNAMIC = "dynamic"
    THIRD_PARTY = "third_party"
    AURA_INJECTED = "aura_injected"
    UNKNOWN = "unknown"


class ViolationIdentity(BaseModel):
    fingerprint: str
    rule_id: str
    selector: str
    tag: str = ""
    attributes: Dict[str, str] = {}
    accessible_name: str = ""
    context: str = ""
    page_path: str = ""


class ScanBaseline(BaseModel):
    session_id: str
    url: str
    final_url: str = ""
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    page_fingerprint: str = ""
    dom_fingerprint: str = ""
    resource_fingerprint: str = ""
    viewport: Dict[str, int] = {"width": 1280, "height": 900}
    framework: Optional[str] = None
    violations: List[Dict[str, Any]] = []
    target_fingerprints: Dict[str, str] = {}
    third_party_nodes: List[str] = []
    iframe_inventory: List[Dict[str, Any]] = []
    dynamic_regions: List[str] = []
    injected_nodes: List[str] = []
    html_snapshot: str = ""
    screenshot: Optional[str] = None


class VerificationResult(BaseModel):
    status: VerificationStatus = VerificationStatus.PENDING
    original_issue_resolved: bool = False
    new_issues_introduced: int = 0
    regression_detected: bool = False
    causal_regressions_count: int = 0
    unrelated_new_findings_count: int = 0
    target_violation_resolved: bool = False
    target_fingerprint: Optional[str] = None
    before_count: int = 0
    after_count: int = 0
    details: str = ""
    attempts: int = 0
    evidence: List[str] = []
    strategy: Optional[str] = None


class DesignSystem(BaseModel):
    primary_color: Optional[str] = None
    secondary_colors: List[str] = []
    background_colors: List[str] = []
    text_colors: List[str] = []
    font_families: List[str] = []
    font_sizes: List[str] = []
    heading_hierarchy: List[str] = []
    border_radius: Optional[str] = None
    spacing_patterns: List[str] = []
    button_styles: Dict[str, Any] = {}
    card_styles: Dict[str, Any] = {}


class DiscoveredPage(BaseModel):
    url: str
    title: str = ""
    issues_count: int = 0
    improvements_count: int = 0


class WebsiteStructure(BaseModel):
    has_header: bool = False
    has_navigation: bool = False
    has_hero: bool = False
    sections_count: int = 0
    has_footer: bool = False
    forms_count: int = 0
    interactive_elements_count: int = 0


class DesignAuditScores(BaseModel):
    visual_design: int = 74
    typography: int = 76
    color_harmony: int = 80
    spacing: int = 74
    visual_hierarchy: int = 70
    cta_clarity: int = 65
    content_clarity: int = 80
    image_usage: int = 75
    consistency: int = 76
    mobile_ux: int = 60
    overall_ui_quality: int = 70
    assessment_label: str = "AI-assisted design assessment"
    explanations: Dict[str, str] = {}
    # Legacy alias support
    color_consistency: Optional[int] = 80
    spacing_consistency: Optional[int] = 70


class WebsiteDocument(BaseModel):
    url: str
    title: str = ""
    framework_detected: Optional[str] = None  # React, Next.js, Vue, Angular, WordPress, static HTML, etc.
    pages: List[str] = []
    elements_count: int = 0
    images_count: int = 0
    links_count: int = 0
    forms_count: int = 0
    buttons_count: int = 0
    headings_count: int = 0
    resources_summary: Dict[str, Any] = {}
    frames: List[Dict[str, Any]] = []
    third_party_warnings: List[str] = []
    security_challenge_detected: bool = False
    login_required: bool = False
    cookie_banner_dismissed: bool = False
    normalized_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class CompletenessReport(BaseModel):
    completeness_percentage: int = 100
    status: str = "FULL"  # "FULL" or "PARTIAL"
    checks_completed: List[str] = []
    checks_unavailable: List[str] = []
    modules_status: Dict[str, str] = {}  # e.g. {"dom": "available", "accessibility": "available", "performance": "partially_available"}
    pages_analyzed: int = 1
    pages_skipped: int = 0
    reasons_for_skips_or_unavailability: List[str] = []


class TargetDescriptor(BaseModel):
    page_url: str = ""
    normalized_url: str = ""
    frame_id: Optional[str] = None
    rule_id: str
    semantic_role: str = ""
    stable_selector: str = ""
    dom_fingerprint: str = ""
    text_fingerprint: str = ""
    ancestor_fingerprint: str = ""
    bounding_box: Optional[Dict[str, float]] = None
    component_fingerprint: str = ""


class AccessibilityIssue(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    rule_id: str
    target_descriptor: Optional[TargetDescriptor] = None
    rule_description: str = ""
    wcag_criteria: List[str] = []
    severity: IssueSeverity
    category: IssueCategory = IssueCategory.PROBLEM
    axe_impact: str = ""
    element_selector: str = ""
    element_html: str = ""
    element_context: str = ""
    description: str = ""
    help_url: str = ""
    status: IssueStatus = IssueStatus.UNRESOLVED
    analysis: Optional[IssueAnalysis] = None
    fix_plan: Optional[FixPlan] = None
    verification: Optional[VerificationResult] = None
    before_screenshot: Optional[str] = None
    after_screenshot: Optional[str] = None
    original_html_snippet: Optional[str] = None
    patched_html_snippet: Optional[str] = None
    dom_diff: Optional[str] = None
    priority: str = "P2"  # P0, P1, P2, P3
    is_blocking: bool = False
    blocking_reason: Optional[str] = None
    dependencies: List[str] = []
    dependency_status: str = "READY"  # READY, BLOCKED
    fix_classification: FixClassification = FixClassification.AUTO_FIXABLE
    fixability_score: int = 100
    is_retryable: bool = True
    non_retryable_reason: Optional[str] = None
    fix_strategy_attempts: int = 0
    fix_strategies_tried: List[str] = []
    is_third_party: bool = False
    target_mode: str = "external_sandbox"  # "authorized_source" or "external_sandbox"
    strategy_used: Optional[str] = None
    evidence_notes: List[str] = []
    before_count: Optional[int] = None
    after_count: Optional[int] = None
    resolved_delta: Optional[int] = None
    violation_fingerprint: Optional[str] = None
    target_fingerprint: Optional[str] = None
    causal_regressions: int = 0
    occurrence_count: int = 1
    affected_elements: List[str] = []
    affected_components: List[str] = []
    shared_selector: Optional[str] = None
    root_cause_id: Optional[str] = None
    total_occurrences: int = 1
    raw_findings_count: int = 1


class RawFinding(BaseModel):
    id: str
    rule_id: str
    impact: str = "moderate"
    selector: str = ""
    element_html: str = ""
    component_fingerprint: str = ""
    dom_fingerprint: str = ""
    computed_styles: Dict[str, Any] = {}
    parent_structure: str = ""
    text: str = ""
    source: str = "axe-core"
    frame: Optional[str] = None
    page: str = "/"


class RootIssue(BaseModel):
    id: str
    rule_id: str
    title: str
    description: str
    category: IssueCategory = IssueCategory.PROBLEM
    severity: IssueSeverity = IssueSeverity.MODERATE
    root_cause: str = ""
    occurrence_count: int = 1
    affected_elements: List[str] = []
    affected_components: List[str] = []
    fix_strategy: Optional[str] = None
    fixability: int = 90
    verification_state: str = "pending"
    shared_selector: Optional[str] = None


class FixJob(BaseModel):
    job_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    issue_id: str
    root_cause: str = ""
    strategy: str = ""
    dependencies: List[str] = []
    priority: str = "P2"
    status: str = "DETECTED"  # DETECTED, VALIDATED, PREVIEW_READY, APPLYING, VERIFYING, FIXED, PARTIALLY_FIXED, FAILED, BLOCKED, UNVERIFIED
    attempts: int = 0
    resolved_occurrences: int = 0
    total_occurrences: int = 1
    error: Optional[str] = None


# --- Timeline ---

class TimelineEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    event_type: TimelineEventType = TimelineEventType.INFO
    message: str
    details: Optional[str] = None
    duration_ms: Optional[int] = None


# --- Scan Data ---

class ScanSummary(BaseModel):
    total_issues: int = 0
    root_issues_count: int = 0
    total_occurrences: int = 0
    raw_findings_count: int = 0
    critical: int = 0
    serious: int = 0
    moderate: int = 0
    minor: int = 0
    fixed: int = 0
    unresolved: int = 0
    needs_review: int = 0
    problems_count: int = 0
    improvements_count: int = 0
    health_score_initial: int = 100
    health_score_current: int = 100
    ui_quality_initial: int = 70
    technical_health_status: str = "healthy"  # "technically_healthy" or "issues_detected"
    accessibility_score: int = 100
    ux_score: int = 80
    visual_score: int = 75
    responsive_score: int = 85
    consistency_score: int = 80
    performance_score: int = 90
    overall_quality_score: int = 85


class ScanData(BaseModel):
    scan_id: str
    session_id: Optional[str] = None
    url: str
    status: ScanStatus
    created_at: str
    completed_at: Optional[str] = None
    issues: List[AccessibilityIssue] = []
    raw_findings: List[RawFinding] = []
    fix_jobs: List[FixJob] = []
    timeline: List[TimelineEvent] = []
    screenshot: Optional[str] = None
    summary: Optional[ScanSummary] = None
    sandbox_url: Optional[str] = None
    original_html: Optional[str] = None
    patched_html: Optional[str] = None
    baseline: Optional[ScanBaseline] = None
    original_url: Optional[str] = None
    design_system: Optional[DesignSystem] = None
    website_structure: Optional[WebsiteStructure] = None
    discovered_pages: List[DiscoveredPage] = []
    design_scores: Optional[DesignAuditScores] = None
    website_type: Optional[str] = "E-Commerce"
    color_palettes: List[ColorPaletteOption] = []
    improvement_bundles: List[ImprovementBundle] = []
    technical_health_status: Optional[str] = None
    remediation_mode: str = "safe_auto_fix"
    blocking_issues_count: int = 0
    blocking_issues: List[str] = []
    fix_order: List[str] = []
    website_document: Optional[WebsiteDocument] = None
    completeness_report: Optional[CompletenessReport] = None
    access_status: Optional[str] = "public"  # "public", "restricted", "login_required"
    access_reason: Optional[str] = None


# --- Fix ---

class FixResult(BaseModel):
    success: bool
    issue_id: str
    verification: Optional[VerificationResult] = None
    patch_applied: bool = False
    error: Optional[str] = None


# --- Patch ---

class PatchResult(BaseModel):
    success: bool
    patch_js: str = ""
    rollback_js: str = ""
    error: Optional[str] = None


# --- Report ---

class ScanReport(BaseModel):
    scan_id: str
    url: str
    scan_timestamp: str
    total_issues: int = 0
    issues_by_severity: Dict[str, int] = {}
    issues_fixed: int = 0
    issues_unresolved: int = 0
    issues_needs_review: int = 0
    wcag_mappings: Dict[str, List[str]] = {}
    fixes_applied: List[Dict[str, str]] = []
    completeness_percentage: int = 100
    completeness_status: str = "FULL"
    checks_completed: List[str] = []
    checks_unavailable: List[str] = []
    website_document: Optional[WebsiteDocument] = None
    limitations: List[str] = [
        "Automated testing covers a subset of WCAG criteria",
        "AI-generated fixes should be reviewed by a human",
        "Visual analysis confidence varies by image complexity",
        "Dynamic content loaded after initial page load may not be fully tested",
    ]


class GitHubPRRequest(BaseModel):
    repo: str
    token: Optional[str] = None
    base_branch: str = "main"
    title: Optional[str] = None
    description: Optional[str] = None
