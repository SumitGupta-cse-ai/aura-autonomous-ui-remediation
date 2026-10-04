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
    <div className="bg-[#0f1720] border border-[#1e293b] rounded-xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-[#1e293b] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${severityColor(
                issue.severity
              )}`}
            >
              {severityLabel(issue.severity)}
            </span>
            {issue.wcag_criteria?.map((c) => (
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

        <h2 className="text-base font-bold text-white">{issue.description}</h2>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-[#1e293b] -mb-4 pt-1">
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
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-all ${
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

      {/* Tab Content Body */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
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
              <div className="bg-[#16202c] border border-[#1e293b] rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AURA Contextual AI Analysis</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748b] uppercase tracking-wider block font-semibold">
                    Root Cause
                  </span>
                  <p className="text-xs text-white mt-0.5">{issue.analysis.root_cause}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748b] uppercase tracking-wider block font-semibold">
                    User Impact
                  </span>
                  <p className="text-xs text-white mt-0.5">{issue.analysis.user_impact}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748b] uppercase tracking-wider block font-semibold">
                    Recommended Fix Strategy
                  </span>
                  <p className="text-xs text-white mt-0.5">{issue.analysis.recommended_strategy}</p>
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
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="bg-[#0b1117] rounded-lg p-2 text-center">
                      <span className="text-[10px] text-[#64748b] block">Before</span>
                      <span className="text-sm font-bold text-red-400">{issue.verification.before_count} issues</span>
                    </div>
                    <div className="bg-[#0b1117] rounded-lg p-2 text-center">
                      <span className="text-[10px] text-[#64748b] block">After</span>
                      <span className="text-sm font-bold text-emerald-400">{issue.verification.after_count} issues</span>
                    </div>
                  </div>
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
          <button
            onClick={() => onFix(issue.id)}
            disabled={isFixing}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 aura-glow-sm shadow-lg cursor-pointer"
          >
            {isFixing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Fixing & Verifying Issue...</span>
              </>
            ) : (
              <>
                <Wrench className="w-3.5 h-3.5" />
                <span>{issue.status === "failed" ? "Retry Fix For This Issue" : "Auto Fix This Issue"}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
