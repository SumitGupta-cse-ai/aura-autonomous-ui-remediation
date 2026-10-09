"use client";

import React from "react";
import {
  AlertCircle,
  Wrench,
  Clock,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import type { ScanSummary, IssueSeverity } from "@/lib/types";

interface SummaryMetricsProps {
  summary?: ScanSummary;
  scanStatus?: string;
  durationMs?: number;
  onSelectFilter?: (filter: "all" | IssueSeverity | "fixed" | "unresolved" | "needs_review") => void;
  onOpenDocs?: () => void;
}

export function SummaryMetrics({
  summary,
  scanStatus = "complete",
  durationMs = 0,
  onSelectFilter,
  onOpenDocs,
}: SummaryMetricsProps) {
  const total = summary?.total_issues || 0;
  const critical = summary?.critical || 0;
  const serious = summary?.serious || 0;
  const moderate = summary?.moderate || 0;
  const minor = summary?.minor || 0;
  const fixed = summary?.fixed || 0;
  const unresolved = summary?.unresolved || 0;

  const fixPercentage = total > 0 ? Math.round((fixed / total) * 100) : 0;

  const isHealthy =
    summary !== undefined &&
    ((summary?.problems_count ?? 0) === 0 || (critical + serious + moderate + minor) === 0);

  const scrollToIssues = () => {
    document.getElementById("issues-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Positive Health Confirmation Banner when 0 technical errors found */}
      {isHealthy && (
        <div className="sm:col-span-2 lg:col-span-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg aura-glow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 flex-shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Your website is technically healthy.
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold uppercase tracking-wider">
                  0 Technical Errors
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] mt-1">
                Stage 1 audit confirmed 0 accessibility violations, broken resources, or semantic failures.
                However, AURA Stage 2 identified <strong className="text-emerald-400">{summary?.improvements_count ?? 5} opportunities</strong> to elevate visual hierarchy, color harmony, and conversion clarity.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[#0f1720] border border-[#1e293b] text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Accessibility
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[#0f1720] border border-[#1e293b] text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Technical Health
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[#0f1720] border border-[#1e293b] text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Responsive
            </span>
          </div>
        </div>
      )}

      {/* 1. Issues Found */}
      <div
        onClick={() => {
          onSelectFilter?.("unresolved");
          scrollToIssues();
        }}
        className="bg-[#0f1720] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between hover:border-red-500/40 hover:bg-[#131d27] transition-all cursor-pointer group shadow-lg"
        title="Click to view all unresolved issues"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider flex items-center gap-1.5 group-hover:text-red-400 transition-colors">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            Findings &amp; Issues
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-bold border border-blue-500/30">
              {summary?.problems_count ?? total} Problems
            </span>
            {Boolean(summary?.improvements_count) && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-bold border border-purple-500/30">
                {summary?.improvements_count} UI/UX
              </span>
            )}
          </div>
        </div>
        <div className="flex items-baseline gap-2 my-1 flex-wrap">
          <span className="text-3xl font-extrabold text-white">{total}</span>
          <span className="text-xs text-[#64748b]">Root Issues</span>
          {Boolean(summary?.total_occurrences && summary.total_occurrences > total) && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-medium">
              {summary?.total_occurrences} occurrences
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1 pt-2 border-t border-[#1e293b] text-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectFilter?.("critical");
              scrollToIssues();
            }}
            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded py-1 transition-all cursor-pointer"
            title="Filter by Critical issues"
          >
            <span className="block text-[11px] font-bold text-red-400">{critical}</span>
            <span className="block text-[9px] text-[#94a3b8]">Critical</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectFilter?.("serious");
              scrollToIssues();
            }}
            className="bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/40 rounded py-1 transition-all cursor-pointer"
            title="Filter by Serious issues"
          >
            <span className="block text-[11px] font-bold text-orange-400">{serious}</span>
            <span className="block text-[9px] text-[#94a3b8]">Serious</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectFilter?.("moderate");
              scrollToIssues();
            }}
            className="bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 hover:border-yellow-500/40 rounded py-1 transition-all cursor-pointer"
            title="Filter by Moderate issues"
          >
            <span className="block text-[11px] font-bold text-yellow-400">{moderate}</span>
            <span className="block text-[9px] text-[#94a3b8]">Moderate</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectFilter?.("minor");
              scrollToIssues();
            }}
            className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 rounded py-1 transition-all cursor-pointer"
            title="Filter by Minor issues"
          >
            <span className="block text-[11px] font-bold text-blue-400">{minor}</span>
            <span className="block text-[9px] text-[#94a3b8]">Minor</span>
          </button>
        </div>
      </div>

      {/* 2. Fixes Applied */}
      <div
        onClick={() => {
          onSelectFilter?.("fixed");
          scrollToIssues();
        }}
        className="bg-[#0f1720] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between hover:border-emerald-500/40 hover:bg-[#131d27] transition-all cursor-pointer group shadow-lg"
        title="Click to view verified fixes"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider flex items-center gap-1.5 group-hover:text-emerald-400 transition-colors">
            <Wrench className="w-3.5 h-3.5 text-emerald-400" />
            Fixes Applied
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
            {fixed} Verified
          </span>
        </div>
        <div className="flex items-baseline gap-2 my-1">
          <span className="text-3xl font-extrabold text-white group-hover:text-emerald-300 transition-colors">
            {fixed} <span className="text-lg text-[#64748b]">/ {total}</span>
          </span>
          <span className="text-xs text-emerald-400 font-semibold">
            {fixPercentage}% Fixed
          </span>
        </div>
        <div className="w-full bg-[#16202c] h-2 rounded-full overflow-hidden mt-2 border border-[#1e293b]">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${fixPercentage}%` }}
          />
        </div>
      </div>

      {/* 3. Scan Duration / Status */}
      <div
        onClick={() => {
          document.getElementById("agent-timeline")?.scrollIntoView({ behavior: "smooth" });
        }}
        className="bg-[#0f1720] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between hover:border-blue-500/40 hover:bg-[#131d27] transition-all cursor-pointer group shadow-lg"
        title="Click to scroll to Agent Execution Timeline"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider flex items-center gap-1.5 group-hover:text-blue-400 transition-colors">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            Scan Status
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
            scanStatus === "completed_with_warnings"
              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
              : scanStatus === "error"
              ? "bg-red-500/10 text-red-400 border-red-500/20"
              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
          }`}>
            {scanStatus === "completed_with_warnings" ? "WARNINGS" : scanStatus.toUpperCase()}
          </span>
        </div>
        <div className="flex items-baseline gap-2 my-1">
          <span className="text-2xl font-extrabold text-white capitalize group-hover:text-blue-300 transition-colors">
            {scanStatus === "complete"
              ? "Completed"
              : scanStatus === "completed_with_warnings"
              ? "Completed (Notes)"
              : scanStatus}
          </span>
        </div>
        <p className="text-[11px] text-[#64748b] mt-2">
          {scanStatus === "complete"
            ? "Audit engine completed re-verification checks. Click to inspect timeline."
            : scanStatus === "completed_with_warnings"
            ? "Audit finished with module notices. Click to inspect breakdown."
            : scanStatus === "error"
            ? "Scan interrupted. Click to inspect timeline diagnostics."
            : "Processing webpage DOM & running axe-core rules..."}
        </p>
      </div>

      {/* 4. Accessibility Health Score */}
      <div
        onClick={onOpenDocs}
        className="bg-[#0f1720] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between hover:border-emerald-500/40 hover:bg-[#131d27] transition-all cursor-pointer group shadow-lg"
        title="Click to open AURA System Documentation & Health Score Methodology"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider flex items-center gap-1.5 group-hover:text-emerald-400 transition-colors">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Accessibility Health
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
            {total > 0 && fixed > 0 ? `+${(summary?.health_score_current ?? 100) - (summary?.health_score_initial ?? 100)} pts` : "WCAG AA"}
          </span>
        </div>
        <div className="flex items-baseline gap-2 my-1">
          <span className="text-3xl font-extrabold text-emerald-400 group-hover:text-emerald-300 transition-colors">
            {total > 0
              ? `${summary?.health_score_current ?? 100}`
              : "100"}
          </span>
          <span className="text-xs text-[#64748b]">
            {total > 0 && (summary?.health_score_initial ?? 100) < (summary?.health_score_current ?? 100)
              ? `(was ${summary?.health_score_initial ?? 100}) / 100`
              : "/ 100"}
          </span>
        </div>
        <div className="w-full bg-[#16202c] h-2 rounded-full overflow-hidden mt-2 border border-[#1e293b]">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${summary?.health_score_current ?? 100}%` }}
          />
        </div>
        <p className="text-[11px] text-[#64748b] mt-2 group-hover:text-[#94a3b8] transition-colors">
          {total > 0 && fixed > 0
            ? `Health improved from ${summary?.health_score_initial ?? 100} to ${summary?.health_score_current ?? 100} across ${fixed} verified fixes.`
            : "Deterministic score calculated from axe-core severity weights. Click for specs."}
        </p>
      </div>
    </div>
  );
}
