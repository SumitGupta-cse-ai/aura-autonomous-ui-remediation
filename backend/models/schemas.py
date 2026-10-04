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
    ERROR = "error"


class IssueSeverity(str, Enum):
    CRITICAL = "critical"
    SERIOUS = "serious"
    MODERATE = "moderate"
    MINOR = "minor"


class IssueStatus(str, Enum):
    UNRESOLVED = "unresolved"
    FIXING = "fixing"
    FIXED = "fixed"
    FAILED = "failed"
    NEEDS_REVIEW = "needs_review"
    ROLLED_BACK = "rolled_back"


class VerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    FAILED = "failed"
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


class VerificationResult(BaseModel):
    status: VerificationStatus = VerificationStatus.PENDING
    original_issue_resolved: bool = False
    new_issues_introduced: int = 0
    regression_detected: bool = False
    before_count: int = 0
    after_count: int = 0
    details: str = ""
    attempts: int = 0


class AccessibilityIssue(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    rule_id: str
    rule_description: str = ""
    wcag_criteria: List[str] = []
    severity: IssueSeverity
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
    critical: int = 0
    serious: int = 0
    moderate: int = 0
    minor: int = 0
    fixed: int = 0
    unresolved: int = 0
    needs_review: int = 0


class ScanData(BaseModel):
    scan_id: str
    url: str
    status: ScanStatus
    created_at: str
    completed_at: Optional[str] = None
    issues: List[AccessibilityIssue] = []
    timeline: List[TimelineEvent] = []
    screenshot: Optional[str] = None
    summary: Optional[ScanSummary] = None
    sandbox_url: Optional[str] = None


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
    limitations: List[str] = [
        "Automated testing covers a subset of WCAG criteria",
        "AI-generated fixes should be reviewed by a human",
        "Visual analysis confidence varies by image complexity",
        "Dynamic content loaded after initial page load may not be fully tested",
    ]
