"use client";

import React, { useState, useEffect } from "react";
import type { AccessibilityIssue } from "@/lib/types";
import {
  severityColor,
  statusColor,
  severityLabel,
  statusLabel,
} from "@/lib/utils";
import {
  FileText,
  Code,
  Sparkles,
  Wrench,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { getSandboxUrl } from "@/lib/api";

interface IssueDetailPanelProps {
  issue: AccessibilityIssue | null;
  onFix: (issueId: string) => void;
  isFixing: boolean;
  scanId?: string;
}

type TabType = "overview" | "evidence" | "analysis" | "fix" | "verification";

export function IssueDetailPanel({
  issue,
  onFix,
  isFixing,
  scanId,
}: IssueDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [copied, setCopied] = useState(false);

  // Automatically switch tab when fixing or when verification is ready
  useEffect(() => {
    if (issue?.verification || issue?.status === "fixed") {
      setActiveTab("verification");
    } else if (isFixing) {
      setActiveTab("fix");
    }
  }, [issue?.status, issue?.verification, isFixing]);

  if (!issue) {
    return (
      <div className="bg-[#0f1720] border border-[#1e293b] rounded-xl p-8 flex flex-col items-center justify-center text-center h-full text-[#64748b]">
        <FileText className="w-12 h-12 text-[#334155] mb-3" />
        <h3 className="text-sm font-semibold text-[#94a3b8]">No Issue Selected</h3>
        <p className="text-xs text-[#64748b] max-w-xs mt-1">
          Select an issue from the explorer list on the left to inspect detailed evidence, AI analysis, and fix verification.
        </p>
      </div>
    );
  }

  function copyCode(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-[#0f1720] border border-[#1e293b] rounded-xl flex flex-col h-full min-h-0 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-3.5 border-b border-[#1e293b] flex flex-col gap-2.5 flex-shrink-0 bg-[#0f1720]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {issue.category === "improvement" ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>AI Improvement Opportunity</span>
              </span>
            ) : (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${severityColor(
                  issue.severity
                )}`}
              >
                {severityLabel(issue.severity)}
              </span>
            )}

            {issue.category !== "improvement" && issue.wcag_criteria?.map((c) => (
              <span
                key={c}
                className="px-2 py-0.5 rounded bg-[#16202c] text-[#94a3b8] border border-[#1e293b] text-[10px] font-mono"
              >
                WCAG {c}
              </span>
            ))}
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              {issue.rule_id}
            </span>

            {/* Classification badge */}
            {issue.fix_classification && (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
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
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${statusColor(
              issue.status
            )}`}
          >
            {issue.status === "fixed" && <CheckCircle2 className="w-3 h-3" />}
            {issue.status === "failed" && <XCircle className="w-3 h-3" />}
            <span>{statusLabel(issue.status)}</span>
          </span>
        </div>

        <h2 className="text-sm font-bold text-white line-clamp-2">{issue.description}</h2>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-[#1e293b] -mb-3.5 pt-0.5 overflow-x-auto scrollbar-none flex-nowrap">
          {(
            [
              ["overview", "Overview"],
              ["evidence", "Evidence"],
              ["analysis", "AI Analysis"],
              ["fix", "Fix Plan"],
              ["verification", "Verification"],
            ] as [TabType, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === key
                  ? "border-emerald-500 text-emerald-400 font-semibold"
                  : "border-transparent text-[#94a3b8] hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content Body (Independently scrollable) */}
      <div className="p-4 flex-1 min-h-0 overflow-y-auto space-y-4 scrollbar-thin">
        {activeTab === "overview" && (
          <>
            {/* Problem */}
            <div>
              <h4 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">
                Problem
              </h4>
              <p className="text-xs text-[#f8fafc] leading-relaxed">
                {issue.rule_description || issue.description}
              </p>
            </div>

            {/* Occurrences & Component Root Cause Info */}
            {Boolean(issue.occurrence_count && issue.occurrence_count > 1) && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-blue-400">
                    {issue.occurrence_count} Occurrences Detected
                  </span>
                  <span className="text-[10px] text-blue-300 font-mono">
                    Component: {issue.affected_components?.[0] || "Shared Style"}
                  </span>
                </div>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                  This root issue groups {issue.occurrence_count} repeating violations originating from the shared {issue.affected_components?.[0] || "component"} structure. A single component-aware fix will remediate all instances simultaneously.
                </p>
                {issue.affected_elements && issue.affected_elements.length > 0 && (
                  <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
                    {issue.affected_elements.slice(0, 5).map((sel, idx) => (
                      <div key={idx} className="text-[10px] font-mono text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded truncate">
                        {sel}
                      </div>
                    ))}
                    {issue.affected_elements.length > 5 && (
                      <span className="text-[9px] text-[#64748b] italic">
                        + {issue.affected_elements.length - 5} more elements
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Affected Element Code Block */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                  Affected Element
                </h4>
                <button
                  onClick={() => copyCode(issue.element_html)}
                  className="text-[10px] text-[#64748b] hover:text-white flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <div className="bg-[#0b1117] border border-[#1e293b] rounded-lg p-3 font-mono text-xs text-emerald-400 overflow-x-auto">
                {issue.element_html || issue.element_selector}
              </div>
              <p className="text-[10px] font-mono text-[#64748b] mt-1">
                Selector: {issue.element_selector}
              </p>
            </div>

            {/* Impact */}
            <div>
              <h4 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">
                Impact & Severity
              </h4>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                This <span className="text-white font-medium">{issue.severity}</span> impact violation affects accessibility for screen reader users and keyboard navigation compliance under <span className="text-emerald-400 font-mono">WCAG {issue.wcag_criteria.join(", ") || "2.1"}</span>.
              </p>
            </div>
          </>
        )}

        {activeTab === "evidence" && (
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">
                DOM Selector
              </h4>
              <code className="text-xs text-emerald-400 bg-[#0b1117] border border-[#1e293b] rounded p-2 block font-mono">
                {issue.element_selector}
              </code>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">
                Full Element HTML
              </h4>
              <pre className="text-xs text-emerald-400 bg-[#0b1117] border border-[#1e293b] rounded p-3 overflow-x-auto font-mono whitespace-pre-wrap">
                {issue.element_html}
              </pre>
            </div>

            {issue.element_context && (
              <div>
                <h4 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">
                  DOM Context Info
                </h4>
                <pre className="text-[11px] text-[#94a3b8] bg-[#0b1117] border border-[#1e293b] rounded p-3 overflow-x-auto font-mono">
                  {issue.element_context}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === "analysis" && (
          <div className="space-y-3">
            {issue.analysis ? (
              <div className="bg-[#16202c] border border-[#1e293b] rounded-lg p-4 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {issue.category === "improvement"
                        ? "AI Design Rationale & Quality Strategy"
                        : "AI Root-Cause & Remediation Reasoning"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                        (issue.analysis.risk || "Low").toLowerCase() === "high"
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : (issue.analysis.risk || "Low").toLowerCase() === "medium"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}
                    >
                      Risk: {issue.analysis.risk || "Low"}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                      {Math.round((issue.analysis.confidence || 0.9) * 100)}% Confidence
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-[#64748b] uppercase tracking-wider block font-semibold">
                    {issue.category === "improvement" ? "1. What? (Proposed Improvement)" : "1. Issue Overview (What is wrong?)"}
                  </span>
                  <p className="text-xs text-white mt-0.5">
                    {issue.analysis.what || issue.analysis.issue_summary || issue.description}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-[#64748b] uppercase tracking-wider block font-semibold">
                    {issue.category === "improvement" ? "2. Why? (Design & UX Rationale)" : "2. Root Cause (Why is it happening?)"}
                  </span>
                  <p className="text-xs text-white mt-0.5">{issue.analysis.why || issue.analysis.root_cause}</p>
                </div>

                <div>
                  <span className="text-[10px] text-[#64748b] uppercase tracking-wider block font-semibold">
                    {issue.category === "improvement" ? "3. Expected Benefit (User & Conversion Value)" : "3. User Impact (Who is affected and how?)"}
                  </span>
                  <p className="text-xs text-white mt-0.5">{issue.analysis.benefit || issue.analysis.user_impact}</p>
                </div>

                <div>
                  <span className="text-[10px] text-[#64748b] uppercase tracking-wider block font-semibold">
                    {issue.category === "improvement" ? "4. Recommended Action (What changes?)" : "4. Recommended Fix (What should change?)"}
                  </span>
                  <p className="text-xs text-emerald-300 bg-[#0b1117] border border-[#1e293b] rounded p-2.5 mt-1 font-mono text-[11px]">
                    {issue.analysis.recommended_fix || issue.analysis.recommended_strategy}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-[#64748b] uppercase tracking-wider block font-semibold">
                    5. Verification Method (How AURA proves safety)
                  </span>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    {issue.analysis.verification_approach || "Deterministic re-audit with axe-core & visual check in isolated sandbox."}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#64748b]">AI analysis data is being generated...</p>
            )}
          </div>
        )}

        {activeTab === "fix" && (
          <div className="space-y-3">
            {issue.fix_plan ? (
              <div>
                <h4 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">
                  Structured Fix Plan (JSON)
                </h4>
                <pre className="text-[11px] text-emerald-400 bg-[#0b1117] border border-[#1e293b] rounded p-3 overflow-x-auto font-mono whitespace-pre-wrap">
                  {JSON.stringify(issue.fix_plan, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-xs text-[#64748b]">Fix plan will be compiled upon triggering auto-fix.</p>
            )}
          </div>
        )}

        {activeTab === "verification" && (
          <div className="space-y-3">
            {/* Target Mode & Strategy Metadata */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                Mode: {issue.target_mode === "authorized_source" ? "MODE A (Source Code)" : "MODE B (Sandbox Preview)"}
              </span>
              {(issue.strategy_used || issue.verification?.strategy) && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  Strategy: {issue.strategy_used || issue.verification?.strategy}
                </span>
              )}
            </div>

            {issue.verification ? (
              <>
                <div
                  className={`border rounded-lg p-4 ${
                    issue.verification.status === "verified"
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-red-500/10 border-red-500/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {issue.verification.status === "verified" ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    <span
                      className={`text-sm font-bold ${
                        issue.verification.status === "verified"
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {issue.verification.status === "verified"
                        ? "VERIFIED ✓"
                        : "NOT VERIFIED"}
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8]">{issue.verification.details}</p>

                  {/* Verification Metrics */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="bg-[#0b1117] rounded-lg p-2 text-center">
                      <span className="text-[10px] text-[#64748b] block">Before</span>
                      <span className="text-sm font-bold text-red-400">{issue.verification.before_count} issues</span>
                    </div>
                    <div className="bg-[#0b1117] rounded-lg p-2 text-center">
                      <span className="text-[10px] text-[#64748b] block">After</span>
                      <span className="text-sm font-bold text-emerald-400">{issue.verification.after_count} issues</span>
                    </div>
                    <div className="bg-[#0b1117] rounded-lg p-2 text-center">
                      <span className="text-[10px] text-[#64748b] block">Resolved Delta</span>
                      <span className="text-sm font-bold text-blue-400">
                        -{Math.max(0, issue.verification.before_count - issue.verification.after_count)}
                      </span>
                    </div>
                  </div>

                  {/* Empirical Evidence Checkpoints */}
                  {(issue.evidence_notes?.length || issue.verification.evidence?.length) ? (
                    <div className="mt-3 pt-3 border-t border-[#1e293b]/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] block mb-1.5">
                        Empirical Evidence Log
                      </span>
                      <ul className="space-y-1">
                        {(issue.evidence_notes || issue.verification.evidence || []).map((ev, idx) => (
                          <li key={idx} className="text-[11px] text-[#cbd5e1] flex items-start gap-1.5 font-mono">
                            <span className="text-emerald-400 font-bold">✓</span>
                            <span>{ev}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                {/* Open Fixed Website Button */}
                {issue.verification.status === "verified" && scanId && (
                  <a
                    href={getSandboxUrl(scanId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Fixed Website</span>
                  </a>
                )}

                {/* DOM Diff Preview */}
                {issue.dom_diff && (
                  <div className="bg-[#0b1117] border border-[#1e293b] rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Code className="w-3 h-3 text-emerald-400" />
                      DOM Diff
                    </h4>
                    <pre className="text-[10px] font-mono text-[#94a3b8] overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {issue.dom_diff}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-[#64748b]">Verification will run automatically after patch application.</p>
            )}
          </div>
        )}
      </div>

      {/* Footer Action */}
      {issue.status !== "fixed" && (
        <div className="p-4 border-t border-[#1e293b] bg-[#0d151e]">
          {issue.is_retryable === false ? (
            <div className="bg-[#16202c] border border-[#2d3f53] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {issue.fix_classification === "third_party"
                    ? "Third-Party Component (External)"
                    : issue.fix_classification === "source_access_required"
                    ? "Source Repository Access Required"
                    : issue.status === "failed"
                    ? "Manual Review Required"
                    : "Automated Fix Unavailable"}
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                {issue.non_retryable_reason ||
                  (issue.fix_classification === "third_party"
                    ? "This component is hosted by an external third-party provider and cannot be directly modified or patched by AURA."
                    : issue.fix_classification === "source_access_required"
                    ? "The public live website was safely analyzed, but AURA requires authorized source code access or build pipeline integration to apply permanent modifications."
                    : "Automated remediation attempts have been exhausted without verified resolution. Manual code inspection is recommended.")}
              </p>
              {issue.fix_strategies_tried && issue.fix_strategies_tried.length > 0 && (
                <div className="pt-1 text-[11px] text-[#64748b]">
                  <span className="font-semibold text-[#94a3b8]">Strategies attempted: </span>
                  {issue.fix_strategies_tried.join(", ")}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onFix(issue.id)}
              disabled={isFixing}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 aura-glow-sm shadow-lg cursor-pointer"
            >
              {isFixing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>
                    {issue.category === "improvement" ? "Applying Improvement in Sandbox..." : "Fixing & Verifying Issue..."}
                  </span>
                </>
              ) : (
                <>
                  {issue.category === "improvement" ? (
                    <Sparkles className="w-3.5 h-3.5" />
                  ) : (
                    <Wrench className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {issue.category === "improvement"
                      ? "Apply Improvement in Sandbox"
                      : issue.status === "failed"
                      ? "Retry Fix For This Issue"
                      : "Auto Fix This Issue"}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
