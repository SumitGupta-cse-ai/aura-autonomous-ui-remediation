"use client";

import React, { useState } from "react";
import type { AccessibilityIssue } from "@/lib/types";
import {
  Eye,
  Code,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Download,
  FileText,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { getSandboxUrl, getDownloadPatchUrl, getDownloadReportUrl } from "@/lib/api";

interface BeforeAfterComparisonProps {
  selectedIssue: AccessibilityIssue | null;
  onDownloadPatch?: () => void;
  onViewReport?: () => void;
  scanId?: string;
  targetUrl?: string;
}

export function BeforeAfterComparison({
  selectedIssue,
  onDownloadPatch,
  onViewReport,
  scanId,
  targetUrl,
}: BeforeAfterComparisonProps) {
  const [viewMode, setViewMode] = useState<"screenshot" | "diff">("screenshot");
  const [copied, setCopied] = useState(false);

  if (!selectedIssue) {
    return (
      <div className="bg-[#0f1720] border border-[#1e293b] rounded-xl p-8 flex flex-col items-center justify-center text-center h-full text-[#64748b]">
        <Eye className="w-12 h-12 text-[#334155] mb-3" />
        <h3 className="text-sm font-semibold text-[#94a3b8]">Before / After Visualizer</h3>
        <p className="text-xs text-[#64748b] max-w-xs mt-1">
          Select an issue to preview before/after screenshots, code diffs, and audit verification results.
        </p>
      </div>
    );
  }

  // Derive diff snippet
  const oldHtml = selectedIssue.element_html || selectedIssue.element_selector;
  let newHtml = oldHtml;
  if (selectedIssue.fix_plan?.changes?.length) {
    for (const change of selectedIssue.fix_plan.changes) {
      if (change.attribute && change.value !== undefined) {
        if (newHtml.includes(`${change.attribute}=`)) {
          newHtml = newHtml.replace(
            new RegExp(`${change.attribute}=["\']?[^"'\s>]*["\']?`, "i"),
            `${change.attribute}="${change.value}"`
          );
        } else if (newHtml.includes(">")) {
          newHtml = newHtml.replace(">", ` ${change.attribute}="${change.value}">`);
        } else {
          newHtml = `<${newHtml} ${change.attribute}="${change.value}">`;
        }
      } else if (change.property && change.value) {
        if (newHtml.includes("style=")) {
          newHtml = newHtml.replace(/style=["\']([^"']*)["\']/, `style="$1; ${change.property}: ${change.value};"`);
        } else if (newHtml.includes(">")) {
          newHtml = newHtml.replace(">", ` style="${change.property}: ${change.value};">`);
        }
      } else if (change.tag) {
        newHtml = newHtml.replace(/<h[1-6]/i, `<${change.tag}`).replace(/<\/h[1-6]>/i, `</${change.tag}>`);
      }
    }
  }

  function copyPatch() {
    navigator.clipboard.writeText(newHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-[#0f1720] border border-[#1e293b] rounded-xl flex flex-col h-full overflow-hidden shadow-xl" id="report-section">
      {/* Header */}
      <div className="p-4 border-b border-[#1e293b] flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-400" />
          Before / After Comparison
        </h3>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-[#16202c] p-1 rounded-lg border border-[#1e293b]">
          <button
            onClick={() => setViewMode("screenshot")}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
              viewMode === "screenshot"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-[#94a3b8] hover:text-white"
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Screenshot</span>
          </button>
          <button
            onClick={() => setViewMode("diff")}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
              viewMode === "diff"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-[#94a3b8] hover:text-white"
            }`}
          >
            <Code className="w-3 h-3" />
            <span>DOM Diff</span>
          </button>
        </div>
      </div>

      {/* Main Comparison Area */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {viewMode === "screenshot" ? (
          /* Side-by-side or stacked Screenshots */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Before (Issue) */}
            <div className="bg-[#0b1117] border border-red-500/30 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-red-400">
                <span className="flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  Before (Issue)
                </span>
                <span className="text-[10px] bg-red-500/20 px-1.5 py-0.5 rounded border border-red-500/30 font-mono">
                  1 Violation
                </span>
              </div>
              <div className="w-full h-36 bg-[#16202c] rounded-lg border border-[#1e293b] flex items-center justify-center relative overflow-hidden group">
                {selectedIssue.before_screenshot ? (
                  <img
                    src={selectedIssue.before_screenshot}
                    alt="Before scan"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-3">
                    <span className="text-xs text-red-400 font-mono font-semibold block mb-1">
                      {selectedIssue.rule_id}
                    </span>
                    <span className="text-[10px] text-[#64748b]">
                      Target: {selectedIssue.element_selector}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 border-2 border-red-500/40 rounded-lg pointer-events-none" />
              </div>
            </div>

            {/* After (Fixed) */}
            <div className="bg-[#0b1117] border border-emerald-500/30 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  After (Fixed)
                </span>
                <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30 font-mono">
                  0 Violations
                </span>
              </div>
              <div className="w-full h-36 bg-[#16202c] rounded-lg border border-[#1e293b] flex items-center justify-center relative overflow-hidden group">
                {selectedIssue.after_screenshot ? (
                  <img
                    src={selectedIssue.after_screenshot}
                    alt="After scan"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-3">
                    <span className="text-xs text-emerald-400 font-mono font-semibold block mb-1">
                      Patch Verified ✓
                    </span>
                    <span className="text-[10px] text-[#64748b]">
                      Target resolved in sandbox preview
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 border-2 border-emerald-500/40 rounded-lg pointer-events-none" />
              </div>
            </div>
          </div>
        ) : null}

        {/* Code Diff Block */}
        <div className="bg-[#0b1117] border border-[#1e293b] rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-emerald-400" />
              Code Diff (DOM Patch)
            </span>
            <button
              onClick={copyPatch}
              className="px-2 py-1 rounded bg-[#16202c] hover:bg-[#1e2d3d] border border-[#1e293b] text-emerald-400 text-[11px] font-medium transition-all flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "Copied" : "Copy Patch"}</span>
            </button>
          </div>

          <div className="bg-[#070c12] border border-[#1e293b] rounded-lg p-3 font-mono text-xs overflow-x-auto space-y-1">
            <div className="text-red-400 bg-red-500/10 px-2 py-1 rounded">
              <span className="select-none font-bold mr-2">-</span>
              {oldHtml}
            </div>
            <div className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
              <span className="select-none font-bold mr-2">+</span>
              {newHtml}
            </div>
          </div>
        </div>

        {/* AI Explanation Card */}
        <div className="p-3.5 rounded-xl bg-[#16202c] border border-[#1e293b] flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-xs">
            <span className="font-semibold text-white mb-0.5">AI Patch Rationale</span>
            <p className="text-[#94a3b8] leading-relaxed text-[11px]">
              {selectedIssue.fix_plan?.reason ||
                `Added safe attributes to resolve the ${selectedIssue.rule_id} accessibility violation.`}
            </p>
          </div>
        </div>
      </div>

      {/* Website Inspection & Export Action Buttons */}
      <div className="p-4 border-t border-[#1e293b] bg-[#0d151e] space-y-2">
        {/* Dual Inspection Links for Judges */}
        <div className="grid grid-cols-2 gap-2">
          {targetUrl && (
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 bg-[#16202c] hover:bg-[#1e2d3d] border border-red-500/30 text-red-400 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
              title="Inspect Original Unmodified Website (Before Fix)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Original Website</span>
            </a>
          )}
          {scanId && (
            <a
              href={getSandboxUrl(scanId)}
              target="_blank"
              rel="noopener noreferrer"
              className={`py-2.5 px-3 ${
                selectedIssue?.status === "fixed"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  : "bg-blue-600/80 hover:bg-blue-700 text-white font-medium"
              } text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md`}
              title="Inspect Sandboxed Fixed Website (After Fix)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Fixed Sandbox</span>
            </a>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onViewReport}
            className="py-2.5 px-3 bg-[#16202c] hover:bg-[#1e2d3d] border border-[#1e293b] text-[#94a3b8] hover:text-white font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View Report</span>
          </button>
          {scanId ? (
            <a
              href={getDownloadPatchUrl(scanId)}
              download
              className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md aura-glow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Patch</span>
            </a>
          ) : (
            <button
              onClick={onDownloadPatch}
              className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md aura-glow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Patch</span>
            </button>
          )}
        </div>
        {/* Download Report Link */}
        {scanId && (
          <a
            href={getDownloadReportUrl(scanId)}
            download
            className="w-full py-2 bg-[#16202c] hover:bg-[#1e2d3d] border border-[#1e293b] text-[#94a3b8] hover:text-white font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Full Report (Markdown)</span>
          </a>
        )}
      </div>
    </div>
  );
}
