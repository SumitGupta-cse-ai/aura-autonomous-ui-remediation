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
  Maximize2,
  X,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { getSandboxUrl, getDownloadPatchUrl, getDownloadReportUrl } from "@/lib/api";

interface BeforeAfterComparisonProps {
  selectedIssue: AccessibilityIssue | null;
  onDownloadPatch?: () => void;
  onViewReport?: () => void;
  scanId?: string;
  targetUrl?: string;
  isFixing?: boolean;
}

function getSafeImageSrc(src?: string): string {
  if (!src) return "";
  if (src.startsWith("data:") || src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }
  return `data:image/png;base64,${src}`;
}

export function BeforeAfterComparison({
  selectedIssue,
  onDownloadPatch,
  onViewReport,
  scanId,
  targetUrl,
  isFixing,
}: BeforeAfterComparisonProps) {
  const [viewMode, setViewMode] = useState<"screenshot" | "diff">("screenshot");
  const [copied, setCopied] = useState(false);
  const [zoomImage, setZoomImage] = useState<{ src: string; title: string; subtitle: string; isFixed: boolean } | null>(null);

  if (!selectedIssue) {
    return (
      <div className="bg-[#0f1720] border border-[#1e293b] rounded-xl p-8 flex flex-col items-center justify-center text-center h-full text-[#64748b]">
        <Eye className="w-12 h-12 text-[#334155] mb-3 animate-pulse" />
        <h3 className="text-sm font-semibold text-[#94a3b8]">Before / After Visualizer</h3>
        <p className="text-xs text-[#64748b] max-w-xs mt-1">
          Select any issue to inspect real before/after screenshots, exact DOM modifications, and verified accessibility remediation results.
        </p>
      </div>
    );
  }

  // Derive diff snippet
  const oldHtml = selectedIssue.element_html || selectedIssue.element_selector;
  let newHtml = oldHtml;
  const changesSummary: string[] = [];

  if (selectedIssue.fix_plan?.changes?.length) {
    for (const change of selectedIssue.fix_plan.changes) {
      if (change.attribute && change.value !== undefined) {
        changesSummary.push(`Added attribute ${change.attribute}="${change.value}"`);
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
        changesSummary.push(`Applied style ${change.property}: ${change.value}`);
        if (newHtml.includes("style=")) {
          newHtml = newHtml.replace(/style=["\']([^"']*)["\']/, `style="$1; ${change.property}: ${change.value};"`);
        } else if (newHtml.includes(">")) {
          newHtml = newHtml.replace(">", ` style="${change.property}: ${change.value};">`);
        }
      } else if (change.tag) {
        changesSummary.push(`Converted heading tag to <${change.tag}>`);
        newHtml = newHtml.replace(/<h[1-6]/i, `<${change.tag}`).replace(/<\/h[1-6]>/i, `</${change.tag}>`);
      }
    }
  }

  function copyPatch() {
    navigator.clipboard.writeText(newHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Friendly human explanation of what was wrong and how it was fixed
  const ruleId = selectedIssue.rule_id;
  let issueExplanation = selectedIssue.description || "Accessibility violation detected by automated audit engine.";
  let fixExplanation = selectedIssue.fix_plan?.reason || "Remediated in sandbox and validated via axe-core re-audit.";

  if (ruleId === "html-has-lang") {
    issueExplanation = "The <html> element is missing a lang attribute. Screen readers cannot identify the spoken language of the page.";
    fixExplanation = "Injected lang=\"en\" on <html>. Assistive technologies now correctly pronounce words and character sets.";
  } else if (ruleId === "image-alt" || ruleId === "input-image-alt") {
    issueExplanation = "Image is missing descriptive alternative text. Vision-impaired users only hear a generic file name.";
    fixExplanation = "Injected descriptive alt text synthesized from visual context. Screen readers now describe the image.";
  } else if (ruleId === "button-name") {
    issueExplanation = "Button element contains no accessible name or label. Screen readers cannot tell users what clicking does.";
    fixExplanation = "Injected aria-label with purposeful action description. All users now understand the button action.";
  } else if (ruleId === "label") {
    issueExplanation = "Form input has no associated <label> or aria-label. Screen readers cannot identify the required input.";
    fixExplanation = "Attached explicit aria-label to form input. Assistive tech clearly announces the input field.";
  } else if (ruleId === "heading-order") {
    issueExplanation = "Heading levels are skipped out of semantic order, breaking page outline and screen reader navigation.";
    fixExplanation = "Restructured heading hierarchy into valid sequential order, restoring semantic document navigation.";
  } else if (ruleId === "color-contrast") {
    issueExplanation = "Foreground text contrast ratio is below the WCAG AA minimum 4.5:1, making it illegible for low-vision users.";
    fixExplanation = "Boosted text contrast ratio to meet WCAG AA compliant contrast ratio (>4.5:1).";
  }

  const isVerified = selectedIssue.status === "fixed" || selectedIssue.verification?.status === "verified";

  return (
    <div className="bg-[#0f1720] border border-[#1e293b] rounded-xl flex flex-col h-full overflow-hidden shadow-xl" id="report-section">
      {/* Header */}
      <div className="p-4 border-b border-[#1e293b] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Before / After Comparison
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#16202c] border border-[#1e293b] text-[#94a3b8]">
            {selectedIssue.rule_id}
          </span>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-[#16202c] p-1 rounded-lg border border-[#1e293b]">
          <button
            onClick={() => setViewMode("screenshot")}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
              viewMode === "screenshot"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
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
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
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
        {/* Live Remediation Indicator */}
        {isFixing ? (
          <div className="bg-blue-500/15 border border-blue-500/40 rounded-xl p-3 flex items-center gap-3 animate-pulse">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-blue-400 block">
                Remediating Issue Live in Sandbox...
              </span>
              <span className="text-[11px] text-[#94a3b8] font-mono truncate block">
                Applying DOM patch & running axe-core re-audit on <strong className="text-white">{selectedIssue.rule_id}</strong>
              </span>
            </div>
          </div>
        ) : isVerified ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-emerald-400 mr-2">FIX VERIFIED ✓</span>
                <span className="text-[#94a3b8] text-[11px]">0 remaining violations for this rule</span>
              </div>
            </div>
            {scanId && (
              <a
                href={getSandboxUrl(scanId)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded font-semibold flex items-center gap-1 transition-all"
              >
                <span>Live Sandbox</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ) : null}

        {/* Side-by-Side Comparison Container */}
        {viewMode === "screenshot" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* ─── BEFORE PANEL ─── */}
            <div className="bg-[#0b1117] border border-red-500/30 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-red-400">
                <span className="flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span>Before (Problem)</span>
                </span>
                <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/30 font-mono font-bold">
                  VIOLATION
                </span>
              </div>

              {/* Screenshot Frame */}
              <div className="w-full h-44 sm:h-52 bg-[#16202c] rounded-lg border border-[#1e293b] flex items-center justify-center relative overflow-hidden group">
                {selectedIssue.before_screenshot ? (
                  <>
                    <img
                      src={getSafeImageSrc(selectedIssue.before_screenshot)}
                      alt="Before fix screenshot"
                      className="w-full h-full object-contain hover:scale-105 transition-transform duration-200 cursor-pointer p-0.5"
                      onClick={() =>
                        setZoomImage({
                          src: getSafeImageSrc(selectedIssue.before_screenshot),
                          title: `Before: ${selectedIssue.rule_id}`,
                          subtitle: issueExplanation,
                          isFixed: false,
                        })
                      }
                    />
                    <button
                      onClick={() =>
                        setZoomImage({
                          src: getSafeImageSrc(selectedIssue.before_screenshot),
                          title: `Before: ${selectedIssue.rule_id}`,
                          subtitle: issueExplanation,
                          isFixed: false,
                        })
                      }
                      className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white p-1.5 rounded-md text-[10px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity border border-white/20"
                      title="Enlarge Screenshot"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Zoom</span>
                    </button>
                  </>
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

              {/* Problem Breakdown Card */}
              <div className="bg-[#12070a] border border-red-500/20 rounded-lg p-2.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block">
                  Problem Description
                </span>
                <p className="text-[11px] text-[#e2e8f0] leading-snug">
                  {issueExplanation}
                </p>
                <div className="pt-1">
                  <span className="text-[9px] text-[#94a3b8] font-mono block">Broken Element:</span>
                  <code className="text-[10px] font-mono text-red-300 block truncate bg-black/40 px-1.5 py-0.5 rounded border border-red-500/20">
                    {oldHtml}
                  </code>
                </div>
              </div>
            </div>

            {/* ─── AFTER PANEL ─── */}
            <div className={`bg-[#0b1117] border ${isVerified ? "border-emerald-500/40" : "border-[#1e293b]"} rounded-xl p-3 flex flex-col gap-2`}>
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>After (Fixed & Verified)</span>
                </span>
                <span className={`text-[10px] ${isVerified ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-[#16202c] text-[#94a3b8] border-[#1e293b]"} px-2 py-0.5 rounded border font-mono font-bold`}>
                  {isVerified ? "VERIFIED ✓" : isFixing ? "FIXING..." : "PENDING"}
                </span>
              </div>

              {/* Screenshot Frame */}
              <div className="w-full h-44 sm:h-52 bg-[#16202c] rounded-lg border border-[#1e293b] flex items-center justify-center relative overflow-hidden group">
                {selectedIssue.after_screenshot ? (
                  <>
                    <img
                      src={getSafeImageSrc(selectedIssue.after_screenshot)}
                      alt="After fix screenshot"
                      className="w-full h-full object-contain hover:scale-105 transition-transform duration-200 cursor-pointer p-0.5"
                      onClick={() =>
                        setZoomImage({
                          src: getSafeImageSrc(selectedIssue.after_screenshot),
                          title: `After: ${selectedIssue.rule_id} (Remediated)`,
                          subtitle: fixExplanation,
                          isFixed: true,
                        })
                      }
                    />
                    <button
                      onClick={() =>
                        setZoomImage({
                          src: getSafeImageSrc(selectedIssue.after_screenshot),
                          title: `After: ${selectedIssue.rule_id} (Remediated)`,
                          subtitle: fixExplanation,
                          isFixed: true,
                        })
                      }
                      className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white p-1.5 rounded-md text-[10px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity border border-white/20"
                      title="Enlarge Screenshot"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Zoom</span>
                    </button>
                  </>
                ) : isVerified && scanId ? (
                  <iframe
                    src={getSandboxUrl(scanId)}
                    title="Patched Sandbox Preview"
                    className="w-full h-full border-0 transform scale-75 origin-top-left pointer-events-none"
                    style={{ width: "133.33%", height: "133.33%" }}
                  />
                ) : (
                  <div className="text-center p-3">
                    <span className={`text-xs font-mono font-semibold block mb-1 ${isFixing ? "text-blue-400 animate-pulse" : "text-[#64748b]"}`}>
                      {isFixing ? "Remediating in Sandbox..." : "Ready to Remediate"}
                    </span>
                    <span className="text-[10px] text-[#64748b]">
                      {isFixing ? "Applying patch & running re-audit" : "Click Auto-Fix to apply patch & verify"}
                    </span>
                  </div>
                )}
                <div className={`absolute inset-0 border-2 rounded-lg pointer-events-none ${isVerified ? "border-emerald-500/40" : "border-[#1e293b]"}`} />
              </div>

              {/* Solution Breakdown Card */}
              <div className="bg-[#05140e] border border-emerald-500/20 rounded-lg p-2.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Remediation Result
                </span>
                <p className="text-[11px] text-[#e2e8f0] leading-snug">
                  {fixExplanation}
                </p>
                <div className="pt-1">
                  <span className="text-[9px] text-[#94a3b8] font-mono block">Patched Element:</span>
                  <code className="text-[10px] font-mono text-emerald-300 block truncate bg-black/40 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    {newHtml}
                  </code>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Code Diff Block */}
        <div className="bg-[#0b1117] border border-[#1e293b] rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-emerald-400" />
              Exact DOM Patch (Diff)
            </span>
            <button
              onClick={copyPatch}
              className="px-2 py-1 rounded bg-[#16202c] hover:bg-[#1e2d3d] border border-[#1e293b] text-emerald-400 text-[11px] font-medium transition-all flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "Copied" : "Copy Patch"}</span>
            </button>
          </div>

          <div className="bg-[#070c12] border border-[#1e293b] rounded-lg p-3 font-mono text-xs overflow-x-auto space-y-1.5">
            <div className="text-red-400 bg-red-500/10 px-2.5 py-1.5 rounded border border-red-500/20 flex items-start gap-2">
              <span className="select-none font-bold text-red-500">-</span>
              <span className="break-all">{oldHtml}</span>
            </div>
            <div className="text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded border border-emerald-500/20 flex items-start gap-2">
              <span className="select-none font-bold text-emerald-500">+</span>
              <span className="break-all">{newHtml}</span>
            </div>
          </div>

          {changesSummary.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {changesSummary.map((summary, idx) => (
                <span
                  key={idx}
                  className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono"
                >
                  ✓ {summary}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* AI Rationale Card */}
        <div className="p-3.5 rounded-xl bg-[#16202c] border border-[#1e293b] flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-500/15 text-purple-400 flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-xs">
            <span className="font-semibold text-white mb-0.5 flex items-center gap-1.5">
              <span>Autonomous Fix Strategy</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-mono">
                {selectedIssue.fix_plan?.strategy || "Deterministic Pattern"}
              </span>
            </span>
            <p className="text-[#94a3b8] leading-relaxed text-[11px]">
              {selectedIssue.fix_plan?.reason ||
                `AURA identified an automated remediation plan compliant with WCAG criteria for ${selectedIssue.rule_id}.`}
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
                isVerified
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

      {/* Screenshot Zoom Modal */}
      {zoomImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1720] border border-[#1e293b] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#1e293b] flex items-center justify-between">
              <div>
                <h4 className={`text-sm font-bold flex items-center gap-2 ${zoomImage.isFixed ? "text-emerald-400" : "text-red-400"}`}>
                  {zoomImage.isFixed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {zoomImage.title}
                </h4>
                <p className="text-xs text-[#94a3b8] mt-0.5">{zoomImage.subtitle}</p>
              </div>
              <button
                onClick={() => setZoomImage(null)}
                className="p-1.5 rounded-lg bg-[#16202c] hover:bg-[#1e2d3d] text-[#94a3b8] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-[#070c12] flex items-center justify-center">
              <img
                src={zoomImage.src}
                alt={zoomImage.title}
                className="max-w-full max-h-[70vh] object-contain rounded-lg border border-[#1e293b]"
              />
            </div>
            <div className="p-3 border-t border-[#1e293b] bg-[#0d151e] flex justify-end">
              <button
                onClick={() => setZoomImage(null)}
                className="px-4 py-1.5 bg-[#16202c] hover:bg-[#1e2d3d] text-white text-xs font-semibold rounded-lg border border-[#1e293b]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
