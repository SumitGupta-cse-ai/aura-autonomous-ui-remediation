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
} from "lucide-react";

export type FilterType =
  | "all"
  | IssueSeverity
  | "fixed"
  | "unresolved"
  | "needs_review";

interface IssueExplorerProps {
  issues: AccessibilityIssue[];
  selectedIssueId?: string;
  onSelectIssue: (issue: AccessibilityIssue) => void;
  onFixIssue: (issueId: string) => void;
  fixingIssueId?: string | null;
  filter: FilterType;
  setFilter: (f: FilterType) => void;
}

export function IssueExplorer({
  issues,
  selectedIssueId,
  onSelectIssue,
  onFixIssue,
  fixingIssueId,
  filter,
  setFilter,
}: IssueExplorerProps) {
  const filtered = issues.filter((issue) => {
    if (filter === "all") return true;
    if (filter === "fixed") return issue.status === "fixed";
    if (filter === "unresolved") return issue.status === "unresolved";
    if (filter === "needs_review") return issue.status === "needs_review";
    return issue.severity === filter;
  });

  const filterTabs: [FilterType, string][] = [
    ["all", "All"],
    ["critical", "Critical"],
    ["serious", "Serious"],
    ["moderate", "Moderate"],
    ["minor", "Minor"],
    ["fixed", "Fixed"],
    ["unresolved", "Unresolved"],
  ];

  return (
    <div className="bg-[#0f1720] border border-[#1e293b] rounded-xl flex flex-col h-full overflow-hidden shadow-xl" id="issues-section">
      {/* Header & Filter Tabs */}
      <div className="p-4 border-b border-[#1e293b] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Issues ({issues.length})
            </h3>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {filterTabs.map(([key, label]) => {
            const count =
              key === "all"
                ? issues.length
                : key === "fixed"
                ? issues.filter((i) => i.status === "fixed").length
                : key === "unresolved"
                ? issues.filter((i) => i.status === "unresolved").length
                : issues.filter((i) => i.severity === key).length;

            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filter === key
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold"
                    : "text-[#94a3b8] hover:text-white hover:bg-[#16202c]"
                }`}
              >
                <span>{label}</span>
                <span className="text-[10px] text-[#64748b]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Issues List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1e293b]">
        {filtered.length === 0 ? (
          <div className="py-12 px-4 text-center text-[#64748b]">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No issues found for current filter.</p>
          </div>
        ) : (
          filtered.map((issue) => {
            const isSelected = selectedIssueId === issue.id;
            const isFixing = fixingIssueId === issue.id;

            return (
              <div
                key={issue.id}
                onClick={() => onSelectIssue(issue)}
                className={`p-4 cursor-pointer transition-all hover:bg-[#16202c] flex items-center justify-between gap-3 ${
                  isSelected
                    ? "bg-[#16202c] border-l-4 border-l-emerald-500"
                    : "border-l-4 border-l-transparent"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="pt-0.5 flex-shrink-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full inline-block ${severityDotColor(
                        issue.severity
                      )}`}
                    />
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${severityColor(
                          issue.severity
                        )}`}
                      >
                        {severityLabel(issue.severity)}
                      </span>
                      {issue.wcag_criteria?.length > 0 && (
                        <span className="px-2 py-0.5 rounded bg-[#16202c] text-[#94a3b8] border border-[#1e293b] text-[10px] font-mono">
                          WCAG {issue.wcag_criteria[0]}
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-[#64748b]">
                        {issue.rule_id}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-white truncate">
                      {issue.description}
                    </p>

                    <p className="text-[11px] font-mono text-[#64748b] truncate mt-0.5">
                      {truncateSelector(issue.element_selector)}
                    </p>
                  </div>
                </div>

                {/* Status & Action */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border flex items-center gap-1 ${statusColor(
                      issue.status
                    )}`}
                  >
                    {issue.status === "fixed" && <CheckCircle2 className="w-3 h-3" />}
                    {issue.status === "failed" && <XCircle className="w-3 h-3" />}
                    <span>{statusLabel(issue.status)}</span>
                  </span>

                  {issue.status === "unresolved" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFixIssue(issue.id);
                      }}
                      disabled={isFixing}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      {isFixing ? (
                        <div className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                      ) : (
                        <Wrench className="w-3 h-3" />
                      )}
                      <span>Fix</span>
                    </button>
                  )}

                  <ChevronRight className="w-4 h-4 text-[#64748b]" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
