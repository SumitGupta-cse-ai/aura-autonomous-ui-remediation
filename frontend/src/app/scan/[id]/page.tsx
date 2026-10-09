"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { getScan, fixIssue, fixAllIssues } from "@/lib/api";
import { connectScanWebSocket } from "@/lib/websocket";
import type {
  ScanData,
  AccessibilityIssue,
  TimelineEvent,
  IssueSeverity,
  IssueStatus,
} from "@/lib/types";
import {
  Shield,
  ArrowLeft,
  ExternalLink,
  Scan,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Wrench,
  RotateCcw,
  Download,
  ChevronDown,
  ChevronRight,
  Eye,
  Code,
  FileText,
  Zap,
  Activity,
} from "lucide-react";
import {
  severityColor,
  severityDotColor,
  statusColor,
  formatTimestamp,
  formatDuration,
  truncateSelector,
  truncateHtml,
  severityLabel,
  statusLabel,
} from "@/lib/utils";
import Link from "next/link";

type FilterType = "all" | IssueSeverity | "fixed" | "unresolved" | "needs_review";

export default function ScanPage() {
  const params = useParams();
  const scanId = params.id as string;

  const [scan, setScan] = useState<ScanData | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<AccessibilityIssue | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [fixing, setFixing] = useState<string | null>(null);
  const [fixingAll, setFixingAll] = useState(false);
  const [error, setError] = useState("");
  const [wsConnected, setWsConnected] = useState(false);
  const timelineEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch scan data
  const fetchScan = useCallback(async () => {
    try {
      const data = await getScan(scanId);
      setScan(data);
      if (data.timeline?.length) {
        setTimeline(data.timeline);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scan");
    }
  }, [scanId]);

  // Connect WebSocket for real-time events
  useEffect(() => {
    fetchScan();

    const ws = connectScanWebSocket(
      scanId,
      (event) => {
        setTimeline((prev) => [...prev, event]);
        // Auto-refresh scan data on important events
        if (
          event.message.includes("completed") ||
          event.message.includes("verified") ||
          event.message.includes("failed") ||
          event.message.includes("detected")
        ) {
          fetchScan();
        }
      },
      (status) => {
        setScan((prev) => (prev ? { ...prev, status: status as ScanData["status"] } : prev));
        if (status === "complete") {
          fetchScan();
        }
      },
      () => setWsConnected(false),
      () => setWsConnected(false)
    );

    wsRef.current = ws;
    setWsConnected(true);

    return () => {
      ws?.close();
    };
  }, [scanId, fetchScan]);

  // Auto-scroll timeline
  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline]);

  // Periodic refresh while scanning
  useEffect(() => {
    if (!scan || scan.status === "complete" || scan.status === "error") return;
    const interval = setInterval(fetchScan, 3000);
    return () => clearInterval(interval);
  }, [scan?.status, fetchScan]);

  // Fix single issue
  async function handleFix(issueId: string) {
    setFixing(issueId);
    try {
      await fixIssue(scanId, issueId);
      await fetchScan();
    } catch (err) {
      console.error("Fix failed:", err);
    } finally {
      setFixing(null);
    }
  }

  // Fix all auto-remediable issues
  async function handleFixAll() {
    setFixingAll(true);
    try {
      await fixAllIssues(scanId);
      await fetchScan();
    } catch (err) {
      console.error("Fix all failed:", err);
    } finally {
      setFixingAll(false);
    }
  }

  // Filter issues
  const filteredIssues = scan?.issues?.filter((issue) => {
    if (filter === "all") return true;
    if (filter === "fixed") return issue.status === "fixed";
    if (filter === "unresolved") return issue.status === "unresolved";
    if (filter === "needs_review") return issue.status === "needs_review";
    return issue.severity === filter;
  }) || [];

  // Summary counts
  const summary = scan?.summary || {
    total_issues: scan?.issues?.length || 0,
    critical: scan?.issues?.filter((i) => i.severity === "critical").length || 0,
    serious: scan?.issues?.filter((i) => i.severity === "serious").length || 0,
    moderate: scan?.issues?.filter((i) => i.severity === "moderate").length || 0,
    minor: scan?.issues?.filter((i) => i.severity === "minor").length || 0,
    fixed: scan?.issues?.filter((i) => i.status === "fixed").length || 0,
    unresolved: scan?.issues?.filter((i) => i.status === "unresolved").length || 0,
    needs_review: scan?.issues?.filter((i) => i.status === "needs_review").length || 0,
    health_score_initial: 100,
    health_score_current: 100,
  };

  if (error && !scan) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Scan Error</h2>
          <p className="text-[#9ca3af] mb-4">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#9ca3af]">
          <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
          Loading scan...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-[#2a2a36] px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-[#9ca3af] hover:text-white transition-colors"
            >
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-white">AURA</span>
            </Link>
            <div className="h-5 w-px bg-[#2a2a36]" />
            <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="font-mono text-xs max-w-md truncate">{scan.url}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={scan.status} />
            {wsConnected && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Severity Overview Bar */}
      <div className="border-b border-[#2a2a36] px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-6">
          <SeverityBadge label="Total" count={summary.total_issues} colorClass="text-white bg-white/10" />
          <SeverityBadge label="Critical" count={summary.critical} colorClass="text-red-400 bg-red-400/10" />
          <SeverityBadge label="Serious" count={summary.serious} colorClass="text-orange-400 bg-orange-400/10" />
          <SeverityBadge label="Moderate" count={summary.moderate} colorClass="text-yellow-400 bg-yellow-400/10" />
          <SeverityBadge label="Minor" count={summary.minor} colorClass="text-blue-400 bg-blue-400/10" />
          <div className="h-5 w-px bg-[#2a2a36]" />
          <SeverityBadge label="Fixed" count={summary.fixed} colorClass="text-emerald-400 bg-emerald-400/10" />
          <SeverityBadge label="Unresolved" count={summary.unresolved} colorClass="text-gray-400 bg-gray-400/10" />
          <div className="ml-auto flex items-center gap-2">
            {scan.status === "complete" && summary.unresolved > 0 && (
              <button
                onClick={handleFixAll}
                disabled={fixingAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-all"
              >
                {fixingAll ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3" />
                    Auto Fix All
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Issues List */}
        <div className="w-[55%] border-r border-[#2a2a36] flex flex-col overflow-hidden">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-[#2a2a36] overflow-x-auto flex-shrink-0">
            {(
              [
                ["all", "All"],
                ["critical", "Critical"],
                ["serious", "Serious"],
                ["moderate", "Moderate"],
                ["minor", "Minor"],
                ["fixed", "Fixed"],
                ["unresolved", "Unresolved"],
                ["needs_review", "Needs Review"],
              ] as [FilterType, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                  filter === key
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-[#9ca3af] hover:text-white hover:bg-[#1a1a24]"
                }`}
              >
                {label}
                {key === "all" && scan.issues && (
                  <span className="ml-1 text-[#6b7280]">({scan.issues.length})</span>
                )}
              </button>
            ))}
          </div>

          {/* Issues */}
          <div className="flex-1 overflow-y-auto">
            {filteredIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#6b7280]">
                {scan.status === "complete" ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
                    <p className="text-sm">
                      {filter === "all" ? "No issues found" : `No ${filter} issues`}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mb-3" />
                    <p className="text-sm">Scanning for issues...</p>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#2a2a36]">
                {filteredIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    isSelected={selectedIssue?.id === issue.id}
                    isFixing={fixing === issue.id}
                    onSelect={() =>
                      setSelectedIssue(
                        selectedIssue?.id === issue.id ? null : issue
                      )
                    }
                    onFix={() => handleFix(issue.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Agent Timeline + Selected Issue Detail */}
        <div className="w-[45%] flex flex-col overflow-hidden">
          {selectedIssue ? (
            <IssueDetailPanel
              issue={selectedIssue}
              isFixing={fixing === selectedIssue.id}
              onFix={() => handleFix(selectedIssue.id)}
              onClose={() => setSelectedIssue(null)}
            />
          ) : (
            /* Agent Timeline */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2a2a36] flex items-center gap-2 flex-shrink-0">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold">Agent Timeline</span>
                <span className="text-xs text-[#6b7280]">({timeline.length} events)</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {timeline.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[#6b7280]">
                    <Clock className="w-8 h-8 mb-2" />
                    <p className="text-sm">Waiting for agent events...</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {timeline.map((event, i) => (
                      <TimelineItem key={event.id || i} event={event} isLast={i === timeline.length - 1} />
                    ))}
                    <div ref={timelineEndRef} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───── Sub-components ───── */

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    pending: { color: "text-gray-400 bg-gray-400/10 border-gray-400/20", icon: <Clock className="w-3 h-3" />, label: "Pending" },
    scanning: { color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: <div className="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />, label: "Scanning" },
    auditing: { color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: <div className="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />, label: "Auditing" },
    analyzing: { color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", icon: <div className="w-3 h-3 border-2 border-yellow-500/30 border-t-yellow-400 rounded-full animate-spin" />, label: "Analyzing" },
    complete: { color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: <CheckCircle2 className="w-3 h-3" />, label: "Complete" },
    error: { color: "text-red-400 bg-red-400/10 border-red-400/20", icon: <XCircle className="w-3 h-3" />, label: "Error" },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.color}`}>
      {c.icon} {c.label}
    </span>
  );
}

function SeverityBadge({ label, count, colorClass }: { label: string; count: number; colorClass: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold ${colorClass}`}>
        {count}
      </span>
      <span className="text-xs text-[#9ca3af]">{label}</span>
    </div>
  );
}

function IssueCard({
  issue,
  isSelected,
  isFixing,
  onSelect,
  onFix,
}: {
  issue: AccessibilityIssue;
  isSelected: boolean;
  isFixing: boolean;
  onSelect: () => void;
  onFix: () => void;
}) {
  return (
    <div
      className={`px-4 py-3 cursor-pointer transition-all hover:bg-[#1a1a24] ${
        isSelected ? "bg-[#1a1a24] border-l-2 border-l-emerald-500" : "border-l-2 border-l-transparent"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${severityColor(issue.severity)}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${severityDotColor(issue.severity)}`} />
              {severityLabel(issue.severity)}
            </span>
            <span className="text-xs font-mono text-[#6b7280]">{issue.rule_id}</span>
            {issue.wcag_criteria?.length > 0 && (
              <span className="text-xs text-[#6b7280]">
                WCAG {issue.wcag_criteria[0]}
              </span>
            )}
          </div>
          <p className="text-sm text-[#f5f5f5] line-clamp-1">{issue.description}</p>
          <p className="text-xs text-[#6b7280] mt-1 font-mono truncate">
            {truncateSelector(issue.element_selector)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${statusColor(issue.status)}`}>
            {issue.status === "fixed" && <CheckCircle2 className="w-3 h-3" />}
            {issue.status === "failed" && <XCircle className="w-3 h-3" />}
            {issue.status === "fixing" && <div className="w-3 h-3 border-2 border-yellow-500/30 border-t-yellow-400 rounded-full animate-spin" />}
            {statusLabel(issue.status)}
          </span>
          {issue.status === "unresolved" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFix();
              }}
              disabled={isFixing}
              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
              title="Auto Fix"
            >
              {isFixing ? (
                <div className="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
              ) : (
                <Wrench className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const iconConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    info: { color: "bg-gray-500", icon: null },
    success: { color: "bg-emerald-400", icon: null },
    warning: { color: "bg-yellow-400", icon: null },
    error: { color: "bg-red-400", icon: null },
    action: { color: "bg-emerald-400", icon: null },
    progress: { color: "bg-blue-400", icon: null },
  };
  const conf = iconConfig[event.event_type] || iconConfig.info;

  return (
    <div className="flex gap-3">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full ${conf.color} mt-1.5 flex-shrink-0`} />
        {!isLast && <div className="w-px flex-1 bg-[#2a2a36] min-h-[20px]" />}
      </div>
      {/* Content */}
      <div className="pb-4 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm text-[#f5f5f5]">{event.message}</p>
          {event.duration_ms != null && (
            <span className="text-xs text-[#6b7280]">
              {formatDuration(event.duration_ms)}
            </span>
          )}
        </div>
        {event.details && (
          <p className="text-xs text-[#6b7280] mt-0.5">{event.details}</p>
        )}
        <p className="text-xs text-[#6b7280] mt-0.5">
          {formatTimestamp(event.timestamp)}
        </p>
      </div>
    </div>
  );
}

function IssueDetailPanel({
  issue,
  isFixing,
  onFix,
  onClose,
}: {
  issue: AccessibilityIssue;
  isFixing: boolean;
  onFix: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#2a2a36] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold">Issue Detail</span>
        </div>
        <button
          onClick={onClose}
          className="text-[#6b7280] hover:text-white text-xs"
        >
          ← Back to Timeline
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Rule & Severity */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${severityColor(issue.severity)}`}>
            {severityLabel(issue.severity)}
          </span>
          <span className="text-xs font-mono text-emerald-400">{issue.rule_id}</span>
          {issue.wcag_criteria?.map((c) => (
            <span key={c} className="text-xs px-2 py-0.5 rounded bg-[#1a1a24] text-[#9ca3af] border border-[#2a2a36]">
              WCAG {c}
            </span>
          ))}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${statusColor(issue.status)}`}>
            {statusLabel(issue.status)}
          </span>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider mb-1">
            What&apos;s Wrong
          </h3>
          <p className="text-sm text-[#f5f5f5]">{issue.description}</p>
        </div>

        {/* Element */}
        <div>
          <h3 className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider mb-1">
            Element
          </h3>
          <div className="bg-[#0a0a0f] border border-[#2a2a36] rounded-lg p-3">
            <code className="text-xs text-emerald-400 break-all">{issue.element_html}</code>
          </div>
          <p className="text-xs text-[#6b7280] mt-1 font-mono">{issue.element_selector}</p>
        </div>

        {/* AI Analysis */}
        {issue.analysis && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-emerald-400" />
              AURA Analysis
            </h3>
            <div className="bg-[#111118] border border-[#2a2a36] rounded-lg p-4 space-y-3">
              <div>
                <span className="text-xs text-[#6b7280]">Root Cause</span>
                <p className="text-sm text-[#f5f5f5]">{issue.analysis.root_cause}</p>
              </div>
              <div>
                <span className="text-xs text-[#6b7280]">User Impact</span>
                <p className="text-sm text-[#f5f5f5]">{issue.analysis.user_impact}</p>
              </div>
              <div>
                <span className="text-xs text-[#6b7280]">Recommended Fix</span>
                <p className="text-sm text-[#f5f5f5]">{issue.analysis.recommended_strategy}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6b7280]">Auto-remediable:</span>
                <span className={`text-xs font-medium ${issue.analysis.is_auto_remediable ? "text-emerald-400" : "text-orange-400"}`}>
                  {issue.analysis.is_auto_remediable ? "Yes" : "No — Manual Review Suggested"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Fix Plan */}
        {issue.fix_plan && (
          <div>
            <h3 className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Code className="w-3 h-3 text-emerald-400" />
              Fix Plan
            </h3>
            <div className="bg-[#0a0a0f] border border-[#2a2a36] rounded-lg p-3">
              <pre className="text-xs text-[#9ca3af] overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(issue.fix_plan, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Verification */}
        {issue.verification && (
          <div>
            <h3 className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider mb-1">
              Verification Result
            </h3>
            <div className={`border rounded-lg p-4 ${
              issue.verification.status === "verified"
                ? "bg-emerald-400/5 border-emerald-400/30"
                : issue.verification.status === "failed"
                ? "bg-red-400/5 border-red-400/30"
                : "bg-yellow-400/5 border-yellow-400/30"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {issue.verification.status === "verified" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={`text-sm font-semibold ${
                  issue.verification.status === "verified" ? "text-emerald-400" : "text-red-400"
                }`}>
                  {issue.verification.status === "verified" ? "VERIFIED ✓" : "NOT VERIFIED"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#6b7280]">Before:</span>
                  <span className="ml-1 text-[#f5f5f5]">{issue.verification.before_count} issues</span>
                </div>
                <div>
                  <span className="text-[#6b7280]">After:</span>
                  <span className="ml-1 text-[#f5f5f5]">{issue.verification.after_count} issues</span>
                </div>
                <div>
                  <span className="text-[#6b7280]">Original resolved:</span>
                  <span className={`ml-1 ${issue.verification.original_issue_resolved ? "text-emerald-400" : "text-red-400"}`}>
                    {issue.verification.original_issue_resolved ? "Yes" : "No"}
                  </span>
                </div>
                <div>
                  <span className="text-[#6b7280]">Regressions:</span>
                  <span className={`ml-1 ${issue.verification.regression_detected ? "text-red-400" : "text-emerald-400"}`}>
                    {issue.verification.regression_detected ? `Yes (${issue.verification.new_issues_introduced})` : "None"}
                  </span>
                </div>
              </div>
              {issue.verification.details && (
                <p className="text-xs text-[#9ca3af] mt-2">{issue.verification.details}</p>
              )}
            </div>
          </div>
        )}

        {/* Before/After Screenshots */}
        {(issue.before_screenshot || issue.after_screenshot) && (
          <div>
            <h3 className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">
              Before / After
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {issue.before_screenshot && (
                <div>
                  <span className="text-xs text-red-400 mb-1 block">Before</span>
                  <img
                    src={issue.before_screenshot}
                    alt="Before fix"
                    className="rounded-lg border border-red-400/20 w-full"
                  />
                </div>
              )}
              {issue.after_screenshot && (
                <div>
                  <span className="text-xs text-emerald-400 mb-1 block">After</span>
                  <img
                    src={issue.after_screenshot}
                    alt="After fix"
                    className="rounded-lg border border-emerald-400/20 w-full"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fix Button */}
        {issue.status === "unresolved" && (
          <button
            onClick={onFix}
            disabled={isFixing}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {isFixing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Fixing...
              </>
            ) : (
              <>
                <Wrench className="w-4 h-4" />
                Auto Fix This Issue
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
