"use client";

import React from "react";
import type { AccessibilityIssue, IssueSeverity } from "@/lib/types";
import {
  severityColor,
  severityDotColor,
  statusColor,
  truncateSelector,
  severityLabel,
  statusLabel,
} from "@/lib/utils";
import {
  AlertCircle,
  Wrench,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  Lock,
} from "lucide-react";

export type FilterType =
  | "all"
  | IssueSeverity
  | "fixed"
  | "unresolved"
  | "needs_review"
  | "problem"
  | "improvement";

interface IssueExplorerProps {
  issues: AccessibilityIssue[];
  selectedIssueId?: string;
  onSelectIssue: (issue: AccessibilityIssue) => void;
  onFixIssue: (issueId: string) => void;
  fixingIssueId?: string | null;
  filter: FilterType;
  setFilter: (f: FilterType) => void;
  onFixAll?: () => void;
  isFixingAll?: boolean;
  onFixBlocking?: () => void;
  isFixingBlocking?: boolean;
}

export function IssueExplorer({
  issues,
  selectedIssueId,
  onSelectIssue,
  onFixIssue,
  fixingIssueId,
  filter,
  setFilter,
  onFixAll,
  isFixingAll,
  onFixBlocking,
  isFixingBlocking,
}: IssueExplorerProps) {
  const filtered = issues.filter((issue) => {
    if (filter === "all") return true;
    if (filter === "fixed") return issue.status === "fixed";
    if (filter === "unresolved") return issue.status === "unresolved";
    if (filter === "needs_review") return issue.status === "needs_review";
    if (filter === "problem") return (issue.category || "problem") === "problem";
    if (filter === "improvement") return issue.category === "improvement";
    return issue.severity === filter;
  });

  const filterTabs: [FilterType, string][] = [
    ["all", "All"],
    ["problem", "Problems"],
    ["improvement", "Improvements"],
    ["critical", "Critical"],
    ["serious", "Serious"],
    ["moderate", "Moderate"],
    ["minor", "Minor"],
    ["fixed", "Fixed"],
    ["unresolved", "Unresolved"],
  ];

  return (
    <div className="bg-[#0f1720] border border-[#1e293b] rounded-xl flex flex-col h-full min-h-0 overflow-hidden shadow-xl" id="issues-section">
      {/* Fixed Header & Filter Tabs */}
      <div className="p-3.5 border-b border-[#1e293b] flex flex-col gap-2.5 flex-shrink-0 bg-[#0f1720]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Issues ({issues.length})
            </h3>
          </div>

          {onFixAll && issues.some((i) => i.status !== "fixed") && (
            <button
              onClick={onFixAll}
              disabled={isFixingAll}
              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-[11px] rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
              title="Automatically fix all remediable issues in isolated sandbox"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isFixingAll ? "animate-spin" : ""}`} />
              <span>{isFixingAll ? "Auto-Fixing..." : "Auto-Fix All"}</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
          {filterTabs.map(([key, label]) => {
            const count =
              key === "all"
                ? issues.length
                : key === "fixed"
                ? issues.filter((i) => i.status === "fixed").length
                : key === "unresolved"
                ? issues.filter((i) => i.status === "unresolved").length
                : key === "problem"
                ? issues.filter((i) => (i.category || "problem") === "problem").length
                : key === "improvement"
                ? issues.filter((i) => i.category === "improvement").length
                : issues.filter((i) => i.severity === key).length;

            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filter === key
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold shadow-xs"
                    : "text-[#94a3b8] hover:text-white hover:bg-[#16202c]"
                }`}
              >
                <span>{label}</span>
                <span className="text-[10px] text-[#64748b]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Blocking Issues Alert Banner */}
        {issues.filter((i) => i.is_blocking && i.status !== "fixed").length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-amber-300 block">
                  {issues.filter((i) => i.is_blocking && i.status !== "fixed").length} Blocking {issues.filter((i) => i.is_blocking && i.status !== "fixed").length === 1 ? "Issue" : "Issues"} (P0/P1)
                </span>
                <span className="text-[10px] text-[#94a3b8] truncate block">
                  Resolve critical blockers before visual enhancements
                </span>
              </div>
            </div>
            {onFixBlocking && (
              <button
                onClick={onFixBlocking}
                disabled={isFixingBlocking}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1.5 shadow-sm flex-shrink-0 cursor-pointer"
                title="Automatically fix all blocking P0 and P1 issues in priority order"
              >
                <Sparkles className={`w-3 h-3 ${isFixingBlocking ? "animate-spin" : ""}`} />
                <span>{isFixingBlocking ? "Fixing..." : "Fix Blocking Issues First"}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Independently Scrollable Issues List */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#1e293b] scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="py-12 px-4 text-center text-[#64748b] space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-70" />
            <div>
              <p className="text-sm font-bold text-white">Your website is technically healthy.</p>
              <p className="text-xs text-[#94a3b8] mt-1 max-w-xs mx-auto">
                0 technical or accessibility violations detected. Click &quot;Improvements&quot; above to explore AI design opportunities.
              </p>
            </div>
            {issues.some((i) => i.category === "improvement") && (
              <button
                onClick={() => setFilter("improvement")}
                className="px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-semibold text-xs rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Explore AI Improvements</span>
              </button>
            )}
          </div>
        ) : (
          filtered.map((issue) => {
            const isSelected = selectedIssueId === issue.id;
            const isFixing = fixingIssueId === issue.id;
            const isImp = issue.category === "improvement";

            return (
              <div
                key={issue.id}
                onClick={() => onSelectIssue(issue)}
                className={`py-2.5 px-3 cursor-pointer transition-all hover:bg-[#16202c] flex items-center justify-between gap-2.5 ${
                  isSelected
                    ? "bg-[#16202c] border-l-4 border-l-emerald-500"
                    : "border-l-4 border-l-transparent"
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="pt-1 flex-shrink-0">
                    <span
                      className={`w-2 h-2 rounded-full inline-block ${severityDotColor(
                        issue.severity
                      )}`}
                    />
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      {isImp ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                          <span>AI Improvement</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          Problem
                        </span>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${severityColor(
                          issue.severity
                        )}`}
                      >
                        {severityLabel(issue.severity)}
                      </span>
                      {/* Priority Badge */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${
                          issue.priority === "P0"
                            ? "bg-red-500/20 text-red-300 border-red-500/40"
                            : issue.priority === "P1"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : issue.priority === "P3"
                            ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                            : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                        }`}
                      >
                        {issue.priority || (isImp ? "P3" : "P2")}
                      </span>

                      {/* Blocker Tag */}
                      {issue.is_blocking && issue.status !== "fixed" && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/40">
                          BLOCKER
                        </span>
                      )}

                      {/* Dependency Blocked Tag */}
                      {issue.dependency_status === "BLOCKED" && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1"
                          title={issue.blocking_reason || "Requires baseline P0/P1 fixes first"}
                        >
                          <Lock className="w-2.5 h-2.5" />
                          <span>BLOCKED</span>
                        </span>
                      )}

                      {issue.wcag_criteria?.length > 0 && !isImp && (
                        <span className="px-1.5 py-0.5 rounded bg-[#16202c] text-[#94a3b8] border border-[#1e293b] text-[9px] font-mono">
                          WCAG {issue.wcag_criteria[0]}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-[#64748b]">
                        {issue.rule_id}
                      </span>

                      {/* Real Fixability Classification */}
                      {issue.fix_classification && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                            issue.fix_classification === "safe_auto_fixable"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : issue.fix_classification === "auto_fixable"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : issue.fix_classification === "auto_fixable_with_review" || issue.fix_classification === "approval_required"
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : issue.fix_classification === "preview_only"
                              ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                              : issue.fix_classification === "source_access_required"
                              ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                              : issue.fix_classification === "third_party"
                              ? "bg-slate-500/15 text-slate-300 border-slate-500/30"
                              : issue.fix_classification === "not_safe_to_auto_fix"
                              ? "bg-red-500/15 text-red-300 border-red-500/30"
                              : "bg-zinc-500/15 text-zinc-300 border-zinc-500/30"
                          }`}
                        >
                          {issue.fix_classification.replace(/_/g, " ")}
                        </span>
                      )}

                      {/* Occurrences Badge */}
                      {Boolean(issue.occurrence_count && issue.occurrence_count > 1) && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          {issue.occurrence_count} occurrences
                        </span>
                      )}

                      {/* Affected Component */}
                      {Boolean(issue.affected_components && issue.affected_components.length > 0) && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#1e293b] text-[#cbd5e1] border border-[#334155]">
                          {issue.affected_components?.[0]}
                        </span>
                      )}

                      {/* Third-Party or Source Req Pill */}
                      {issue.is_third_party ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          3rd-Party
                        </span>
                      ) : issue.fix_classification === "source_access_required" ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          Source Req
                        </span>
                      ) : null}
                    </div>

                    <p
                      className="text-xs font-semibold text-white truncate max-w-full"
                      title={issue.description}
                    >
                      {issue.analysis?.issue_summary || issue.description}
                    </p>

                    {isImp && issue.analysis?.benefit ? (
                      <p className="text-[10px] text-emerald-400/90 truncate mt-0.5 font-medium">
                        Benefit: {issue.analysis.benefit}
                      </p>
                    ) : (
                      <p className="text-[10px] font-mono text-[#64748b] truncate mt-0.5">
                        {truncateSelector(issue.element_selector)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status & Action */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium border flex items-center gap-1 ${statusColor(
                      issue.status
                    )}`}
                  >
                    {issue.status === "fixed" && <CheckCircle2 className="w-2.5 h-2.5" />}
                    {issue.status === "failed" && <XCircle className="w-2.5 h-2.5" />}
                    <span>{statusLabel(issue.status)}</span>
                  </span>

                  {issue.status !== "fixed" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFixIssue(issue.id);
                      }}
                      disabled={isFixing}
                      title={issue.dependency_status === "BLOCKED" ? (issue.blocking_reason || "Blocked: fix baseline issues first") : (issue.non_retryable_reason || "Auto-fix this issue")}
                      className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer ${
                        issue.dependency_status === "BLOCKED"
                          ? "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300"
                          : issue.is_retryable === false
                          ? "bg-[#16202c] border-[#334155] text-amber-400 hover:bg-[#1e2d3d]"
                          : isImp
                          ? "bg-purple-500/15 hover:bg-purple-500/25 border-purple-500/30 text-purple-300"
                          : "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-400"
                      }`}
                    >
                      {isFixing ? (
                        <div className="w-2.5 h-2.5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                      ) : issue.dependency_status === "BLOCKED" ? (
                        <Lock className="w-2.5 h-2.5 text-amber-400" />
                      ) : isImp ? (
                        <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                      ) : (
                        <Wrench className="w-2.5 h-2.5 text-emerald-400" />
                      )}
                      <span>
                        {isFixing ? "Fixing..." : issue.status === "failed" ? "Retry" : isImp ? "Apply" : "Fix"}
                      </span>
                    </button>
                  )}

                  <ChevronRight className="w-3.5 h-3.5 text-[#64748b]" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
