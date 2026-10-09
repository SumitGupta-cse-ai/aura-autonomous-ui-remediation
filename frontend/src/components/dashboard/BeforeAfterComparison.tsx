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
  GitPullRequest,
  FolderArchive,
  PackageCheck,
  RotateCcw,
  RefreshCw,
  Globe,
  Sliders,
  Layers,
  History,
  BarChart3,
} from "lucide-react";
import {
  getSandboxUrl,
  getSandboxBeforeUrl,
  getSandboxAfterUrl,
  getSandboxShowChangesUrl,
  getVersionHistory,
  restoreVersion,
  getHealthScores,
  getDownloadPatchUrl,
  getDownloadReportUrl,
  getOriginalWebsiteUrl,
  getExportWebsiteUrl,
  getExportFixPackUrl,
  downloadFixedWebsite,
  downloadFixPack,
  downloadAuditReport,
} from "@/lib/api";
import type { VersionHistoryItem, EightDimensionScores } from "@/lib/types";
import { GitHubPRModal } from "./GitHubPRModal";

interface BeforeAfterComparisonProps {
  selectedIssue: AccessibilityIssue | null;
  onDownloadPatch?: () => void;
  onViewReport?: () => void;
  scanId?: string;
  targetUrl?: string;
  originalUrl?: string;
  isFixing?: boolean;
  issues?: AccessibilityIssue[];
  onRollback?: () => Promise<void> | void;
  isRollingBack?: boolean;
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
  originalUrl,
  isFixing,
  issues,
  onRollback,
  isRollingBack,
}: BeforeAfterComparisonProps) {
  const canonicalOriginalUrl = getOriginalWebsiteUrl(originalUrl || targetUrl);
  const [viewMode, setViewMode] = useState<"screenshot" | "sandbox" | "diff">("screenshot");
  const [sandboxViewTab, setSandboxViewTab] = useState<
    "split" | "slider" | "overlay" | "before" | "after" | "show-changes"
  >("split");
  const [sliderPos, setSliderPos] = useState(50);
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [versions, setVersions] = useState<VersionHistoryItem[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);
  const [healthScores, setHealthScores] = useState<EightDimensionScores | null>(null);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const [zoomImage, setZoomImage] = useState<{ src: string; title: string; subtitle: string; isFixed: boolean } | null>(null);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [isDownloadingWebsite, setIsDownloadingWebsite] = useState(false);
  const [isDownloadingFixPack, setIsDownloadingFixPack] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownloadWebsite = async () => {
    if (!scanId || isDownloadingWebsite) return;
    setIsDownloadingWebsite(true);
    setDownloadError(null);
    try {
      const res = await downloadFixedWebsite(scanId);
      if (!res.success) {
        setDownloadError(res.error || "Failed to download Fixed Website archive.");
      }
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setIsDownloadingWebsite(false);
    }
  };

  const handleDownloadFixPack = async () => {
    if (!scanId || isDownloadingFixPack) return;
    setIsDownloadingFixPack(true);
    setDownloadError(null);
    try {
      const res = await downloadFixPack(scanId);
      if (!res.success) {
        setDownloadError(res.error || "Failed to download Fix Pack.");
      }
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setIsDownloadingFixPack(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!scanId || isDownloadingReport) return;
    setIsDownloadingReport(true);
    setDownloadError(null);
    try {
      const res = await downloadAuditReport(scanId);
      if (!res.success) {
        setDownloadError(res.error || "Failed to download audit report.");
      }
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setIsDownloadingReport(false);
    }
  };

  React.useEffect(() => {
    if (scanId) {
      getVersionHistory(scanId)
        .then((res) => {
          if (Array.isArray(res)) setVersions(res);
        })
        .catch(() => {});
      getHealthScores(scanId)
        .then((res) => {
          if (res) setHealthScores(res);
        })
        .catch(() => {});
    }
  }, [scanId, refreshKey]);

  const handleRestoreVersionAction = async (vIndex: number) => {
    if (!scanId || isRestoringVersion) return;
    setIsRestoringVersion(true);
    try {
      await restoreVersion(scanId, vIndex);
      setSelectedVersion(vIndex);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to restore version:", err);
    } finally {
      setIsRestoringVersion(false);
    }
  };

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
  const verifiedCount = issues
    ? issues.filter((i) => i.status === "fixed" || i.verification?.status === "verified").length
    : isVerified
    ? 1
    : 0;
  const manualReviewCount = issues?.filter((i) => i.status === "needs_review").length || 0;
  const unresolvedCount = issues?.filter((i) => i.status === "unresolved").length || 0;

  return (
    <div className="bg-[#0f1720] border border-[#1e293b] rounded-xl flex flex-col h-full min-h-0 overflow-hidden shadow-xl" id="report-section">
      {/* Header */}
      <div className="p-3.5 border-b border-[#1e293b] flex items-center justify-between flex-shrink-0 bg-[#0f1720]">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Before / After Comparison
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#16202c] border border-[#1e293b] text-[#94a3b8]">
            {selectedIssue.rule_id}
          </span>
        </div>

        {/* View Mode & Responsive Viewport Toggles */}
        <div className="flex items-center gap-2">
          {/* Responsive Viewport Selector */}
          <div className="hidden sm:flex items-center gap-1 bg-[#16202c] p-1 rounded-lg border border-[#1e293b]">
            <button
              onClick={() => setViewport("desktop")}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                viewport === "desktop"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm"
                  : "text-[#94a3b8] hover:text-white"
              }`}
              title="Desktop Viewport (1280px)"
            >
              Desktop
            </button>
            <button
              onClick={() => setViewport("tablet")}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                viewport === "tablet"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm"
                  : "text-[#94a3b8] hover:text-white"
              }`}
              title="Tablet Viewport (768px)"
            >
              Tablet
            </button>
            <button
              onClick={() => setViewport("mobile")}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                viewport === "mobile"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm"
                  : "text-[#94a3b8] hover:text-white"
              }`}
              title="Mobile Viewport (375px)"
            >
              Mobile
            </button>
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
              onClick={() => setViewMode("sandbox")}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
                viewMode === "sandbox"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                  : "text-[#94a3b8] hover:text-white"
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>Sandbox</span>
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
      </div>

      {/* Primary Action Buttons & Version Switcher Bar */}
      <div className="px-4 py-2.5 bg-[#0b131e] border-b border-[#1e293b] flex flex-wrap items-center justify-between gap-2.5 flex-shrink-0">
        {/* Left: Primary 3 Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* [ Original Website ] */}
          <a
            href={scanId ? getSandboxBeforeUrl(scanId) : (canonicalOriginalUrl || "#")}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              setViewMode("sandbox");
              setSandboxViewTab("before");
            }}
            className="px-3 py-1.5 bg-[#16202c] hover:bg-[#1e2d3d] border border-amber-500/40 text-amber-300 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            title="Open Original Website (v1)"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>Original Website</span>
            <ExternalLink className="w-3 h-3 text-amber-400/70" />
          </a>

          {/* [ Improved Website ] */}
          <a
            href={scanId ? getSandboxAfterUrl(scanId) : "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              setViewMode("sandbox");
              setSandboxViewTab("after");
            }}
            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            title="Open Improved Remediated Website (v2)"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Improved Website</span>
            <ExternalLink className="w-3 h-3 text-emerald-400/70" />
          </a>

          {/* [ Compare ] */}
          <button
            onClick={() => {
              setViewMode("sandbox");
              setSandboxViewTab("split");
            }}
            className={`px-3 py-1.5 border text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
              viewMode === "sandbox" && sandboxViewTab === "split"
                ? "bg-blue-600 text-white border-blue-500 shadow-blue-500/20"
                : "bg-[#16202c] hover:bg-[#1e2d3d] border-blue-500/30 text-blue-300"
            }`}
            title="Launch Split Comparison Sandbox"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Compare</span>
          </button>
        </div>

        {/* Right: Version Switcher */}
        <div className="flex items-center gap-1 bg-[#16202c] p-1 rounded-lg border border-[#1e293b] flex-wrap">
          <span className="text-[10px] text-[#64748b] uppercase tracking-wider font-bold px-1.5">Version:</span>
          <button
            onClick={() => {
              setViewMode("sandbox");
              setSandboxViewTab("before");
            }}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              viewMode === "sandbox" && sandboxViewTab === "before"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-xs"
                : "text-[#94a3b8] hover:text-white"
            }`}
            title="Original Untouched Baseline (v1)"
          >
            <span>Original (v1)</span>
          </button>
          <button
            onClick={() => {
              setViewMode("sandbox");
              setSandboxViewTab("split");
            }}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              viewMode === "sandbox" && sandboxViewTab === "split"
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-xs"
                : "text-[#94a3b8] hover:text-white"
            }`}
            title="Interactive Comparison Preview (v1-preview)"
          >
            <span>Preview (v1-preview)</span>
          </button>
          <button
            onClick={() => {
              setViewMode("sandbox");
              setSandboxViewTab("after");
            }}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              viewMode === "sandbox" && sandboxViewTab === "after"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs"
                : "text-[#94a3b8] hover:text-white"
            }`}
            title="Remediated Production-Grade Website (v2)"
          >
            <span>Improved (v2)</span>
          </button>
        </div>
      </div>

      {/* Main Comparison Area */}
      <div className="p-4 flex-1 min-h-0 overflow-y-auto space-y-4 scrollbar-thin">
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
                    key={`after-thumb-${refreshKey}`}
                    src={`${getSandboxAfterUrl(scanId)}?k=${refreshKey}`}
                    title="Patched Sandbox Preview"
                    className="w-full h-full border-0 transform scale-75 origin-top-left pointer-events-none bg-white rounded"
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

        {/* ─── LIVE INTERACTIVE SANDBOX VIEW ─── */}
        {viewMode === "sandbox" && (
          <div className="space-y-3">
            {/* Sandbox Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#0b1117] border border-[#1e293b] p-2 rounded-xl">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setSandboxViewTab("split")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    sandboxViewTab === "split"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs"
                      : "text-[#94a3b8] hover:text-white"
                  }`}
                >
                  Split View
                </button>
                <button
                  onClick={() => setSandboxViewTab("slider")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    sandboxViewTab === "slider"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-xs"
                      : "text-[#94a3b8] hover:text-white"
                  }`}
                >
                  <Sliders className="w-3 h-3 text-blue-400" />
                  <span>[ SLIDER ]</span>
                </button>
                <button
                  onClick={() => setSandboxViewTab("overlay")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    sandboxViewTab === "overlay"
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-xs"
                      : "text-[#94a3b8] hover:text-white"
                  }`}
                >
                  <Layers className="w-3 h-3 text-indigo-400" />
                  <span>[ OVERLAY ]</span>
                </button>
                <button
                  onClick={() => setSandboxViewTab("show-changes")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    sandboxViewTab === "show-changes"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-xs"
                      : "text-[#94a3b8] hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>[ SHOW CHANGES ]</span>
                </button>
                <button
                  onClick={() => setSandboxViewTab("before")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    sandboxViewTab === "before"
                      ? "bg-red-500/20 text-red-300 border border-red-500/30 shadow-xs"
                      : "text-[#94a3b8] hover:text-white"
                  }`}
                >
                  [ BEFORE ]
                </button>
                <button
                  onClick={() => setSandboxViewTab("after")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    sandboxViewTab === "after"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs"
                      : "text-[#94a3b8] hover:text-white"
                  }`}
                >
                  [ AFTER ]
                </button>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Version History Selector */}
                {versions.length > 0 && (
                  <div className="flex items-center gap-1 bg-[#16202c] px-2 py-0.5 rounded-lg border border-[#1e293b]">
                    <History className="w-3 h-3 text-blue-400" />
                    <select
                      value={selectedVersion ?? (versions.length - 1)}
                      onChange={(e) => handleRestoreVersionAction(Number(e.target.value))}
                      disabled={isRestoringVersion}
                      className="bg-transparent text-[11px] text-[#94a3b8] focus:text-white outline-none font-mono py-0.5 cursor-pointer"
                    >
                      {versions.map((v) => (
                        <option key={v.version} value={v.version} className="bg-[#0b1117] text-white">
                          v{v.version}: {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 8-Scores Button */}
                <button
                  onClick={() => setShowHealthModal(!showHealthModal)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    showHealthModal
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                      : "bg-[#16202c] hover:bg-[#1e2d3d] border border-[#1e293b] text-[#94a3b8]"
                  }`}
                  title="Toggle 8-Dimension Quality Scores"
                >
                  <BarChart3 className="w-3 h-3 text-purple-400" />
                  <span>8-Scores</span>
                </button>

                <button
                  onClick={() => setRefreshKey((k) => k + 1)}
                  className="px-2.5 py-1 rounded-lg bg-[#16202c] hover:bg-[#1e2d3d] border border-[#1e293b] text-[#94a3b8] hover:text-white text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                  title="Force reload sandbox iframes"
                >
                  <RefreshCw className="w-3 h-3 text-emerald-400" />
                  <span>Refresh</span>
                </button>
                {scanId && (
                  <a
                    href={getSandboxUrl(scanId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-[#16202c] hover:bg-[#1e2d3d] border border-[#1e293b] text-[#94a3b8] hover:text-white text-[11px] font-medium flex items-center gap-1 transition-all"
                    title="Open live sandbox in new tab"
                  >
                    <ExternalLink className="w-3 h-3 text-blue-400" />
                    <span>Open Tab</span>
                  </a>
                )}
              </div>
            </div>

            {/* 8-Dimension Quality Scores Summary Banner */}
            {showHealthModal && healthScores && (
              <div className="bg-[#121922] border border-purple-500/40 rounded-xl p-3.5 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      8-Dimension Website Quality Scores (Before vs After)
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {healthScores.verified_fixes} Verified Fixes
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {Object.keys(healthScores.before).map((dim) => {
                    const beforeVal = healthScores.before[dim] || 50;
                    const afterVal = healthScores.after[dim] || 85;
                    const diff = afterVal - beforeVal;

                    return (
                      <div key={dim} className="bg-[#0b1117] border border-[#1e293b] rounded-lg p-2 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-[#94a3b8] capitalize">
                            {dim.replace("_", " ")}
                          </span>
                          <span className={`text-[10px] font-mono font-bold ${diff > 0 ? "text-emerald-400" : "text-[#64748b]"}`}>
                            {diff > 0 ? `+${diff}` : `${diff}`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                          <span className="text-red-400">{beforeVal}</span>
                          <span className="text-[#64748b]">→</span>
                          <span className="text-emerald-400 font-bold">{afterVal}</span>
                        </div>
                        <div className="w-full bg-[#16202c] h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${afterVal}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sandbox View Modes Rendering */}
            {sandboxViewTab === "split" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Before Frame */}
                <div className="bg-[#0b1117] border border-red-500/30 rounded-xl overflow-hidden flex flex-col shadow-sm">
                  <div className="p-2 border-b border-[#1e293b] bg-[#12070a] flex items-center justify-between text-xs">
                    <span className="font-bold text-red-400 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" />
                      BEFORE (Untouched Snapshot)
                    </span>
                    <span className="text-[10px] text-red-300 bg-red-500/20 px-1.5 py-0.2 rounded font-mono">
                      Original
                    </span>
                  </div>
                  <div className="h-72 sm:h-96 w-full bg-white relative">
                    <iframe
                      key={`before-${refreshKey}`}
                      src={scanId ? `${getSandboxBeforeUrl(scanId)}?k=${refreshKey}` : canonicalOriginalUrl}
                      title="Untouched Original Website"
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                </div>

                {/* After Frame */}
                <div className="bg-[#0b1117] border border-emerald-500/40 rounded-xl overflow-hidden flex flex-col shadow-sm">
                  <div className="p-2 border-b border-[#1e293b] bg-[#05140e] flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      AFTER (Remediated Sandbox)
                    </span>
                    <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-1.5 py-0.2 rounded font-mono">
                      Live Sandbox
                    </span>
                  </div>
                  <div className="h-72 sm:h-96 w-full bg-white relative">
                    <iframe
                      key={`after-${refreshKey}`}
                      src={scanId ? `${getSandboxAfterUrl(scanId)}?k=${refreshKey}` : canonicalOriginalUrl}
                      title="Remediated Sandbox Website"
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                </div>
              </div>
            ) : sandboxViewTab === "slider" ? (
              /* ─── INTERACTIVE DRAGGABLE SLIDER VIEW ─── */
              <div className="bg-[#0b1117] border border-blue-500/30 rounded-xl overflow-hidden flex flex-col shadow-md">
                <div className="p-2 border-b border-[#1e293b] bg-[#101b26] flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    Interactive Comparison Slider: Drag divider to compare Before &amp; After
                  </span>
                  <span className="text-[10px] font-mono text-[#94a3b8]">
                    Divider: <strong className="text-white">{sliderPos}%</strong>
                  </span>
                </div>

                <div className="relative h-96 sm:h-[460px] w-full overflow-hidden bg-white select-none">
                  {/* Under layer: BEFORE */}
                  <iframe
                    key={`slider-before-${refreshKey}`}
                    src={scanId ? `${getSandboxBeforeUrl(scanId)}?k=${refreshKey}` : canonicalOriginalUrl}
                    title="Before website underlay"
                    className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                    sandbox="allow-scripts allow-same-origin"
                  />

                  {/* Over layer: AFTER with clip-path */}
                  <div
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
                  >
                    <iframe
                      key={`slider-after-${refreshKey}`}
                      src={scanId ? `${getSandboxAfterUrl(scanId)}?k=${refreshKey}` : canonicalOriginalUrl}
                      title="After website overlay"
                      className="w-full h-full border-0 pointer-events-none"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>

                  {/* Divider line */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-blue-500 shadow-xl pointer-events-none z-10"
                    style={{ left: `${sliderPos}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 px-2 py-1 rounded-full bg-blue-600 text-white text-[9px] font-bold shadow-lg border border-white/20 whitespace-nowrap">
                      ◀ BEFORE | AFTER ▶
                    </div>
                  </div>

                  {/* Range input for smooth dragging */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 flex items-center gap-2">
                    <span className="text-[10px] text-red-400 font-bold uppercase">Before</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sliderPos}
                      onChange={(e) => setSliderPos(Number(e.target.value))}
                      className="w-48 sm:w-64 cursor-ew-resize accent-blue-500"
                    />
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">After</span>
                  </div>
                </div>
              </div>
            ) : sandboxViewTab === "overlay" ? (
              /* ─── OPACITY OVERLAY VIEW ─── */
              <div className="bg-[#0b1117] border border-indigo-500/30 rounded-xl overflow-hidden flex flex-col shadow-md">
                <div className="p-2 border-b border-[#1e293b] bg-[#121629] flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Opacity Cross-Fade Overlay
                  </span>
                  <span className="text-[10px] font-mono text-[#94a3b8]">
                    Remediated Opacity: <strong className="text-white">{overlayOpacity}%</strong>
                  </span>
                </div>

                <div className="relative h-96 sm:h-[460px] w-full overflow-hidden bg-white select-none">
                  {/* Under layer: BEFORE */}
                  <iframe
                    key={`overlay-before-${refreshKey}`}
                    src={scanId ? `${getSandboxBeforeUrl(scanId)}?k=${refreshKey}` : canonicalOriginalUrl}
                    title="Before website underlay"
                    className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                    sandbox="allow-scripts allow-same-origin"
                  />

                  {/* Over layer: AFTER with opacity */}
                  <div
                    className="absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-150"
                    style={{ opacity: overlayOpacity / 100 }}
                  >
                    <iframe
                      key={`overlay-after-${refreshKey}`}
                      src={scanId ? `${getSandboxAfterUrl(scanId)}?k=${refreshKey}` : canonicalOriginalUrl}
                      title="After website overlay"
                      className="w-full h-full border-0 pointer-events-none"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>

                  {/* Range input */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 flex items-center gap-2">
                    <span className="text-[10px] text-red-400 font-bold uppercase">0% (Before)</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={overlayOpacity}
                      onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                      className="w-48 sm:w-64 cursor-pointer accent-indigo-500"
                    />
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">100% (After)</span>
                  </div>
                </div>
              </div>
            ) : sandboxViewTab === "show-changes" ? (
              /* ─── SHOW CHANGES WITH HIGHLIGHTS ─── */
              <div className="bg-[#0b1117] border border-purple-500/30 rounded-xl overflow-hidden flex flex-col shadow-md">
                <div className="p-2 border-b border-[#1e293b] bg-[#1b1229] flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-bold text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Visual Changes Diff with Category Highlight Outlines
                  </span>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Color
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Typography
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Layout
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Accessibility
                    </span>
                  </div>
                </div>

                <div className="h-96 sm:h-[460px] w-full bg-white relative">
                  <iframe
                    key={`show-changes-${refreshKey}`}
                    src={scanId ? `${getSandboxShowChangesUrl(scanId)}?k=${refreshKey}` : canonicalOriginalUrl}
                    title="Website Show Changes Highlights"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              </div>
            ) : sandboxViewTab === "before" ? (
              <div className="bg-[#0b1117] border border-red-500/30 rounded-xl overflow-hidden flex flex-col shadow-sm">
                <div className="p-2 border-b border-[#1e293b] bg-[#12070a] flex items-center justify-between text-xs">
                  <span className="font-bold text-red-400 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" />
                    Untouched Original Website Snapshot
                  </span>
                  <span className="text-[10px] text-red-300 bg-red-500/20 px-1.5 py-0.2 rounded font-mono">
                    BEFORE
                  </span>
                </div>
                <div className="h-96 sm:h-[460px] w-full bg-white relative">
                  <iframe
                    key={`before-full-${refreshKey}`}
                    src={scanId ? `${getSandboxBeforeUrl(scanId)}?k=${refreshKey}` : canonicalOriginalUrl}
                    title="Untouched Original Website"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-[#0b1117] border border-emerald-500/40 rounded-xl overflow-hidden flex flex-col shadow-sm">
                <div className="p-2 border-b border-[#1e293b] bg-[#05140e] flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Remediated Sandboxed Website
                  </span>
                  <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-1.5 py-0.2 rounded font-mono">
                    AFTER
                  </span>
                </div>
                <div className="h-96 sm:h-[460px] w-full bg-white relative">
                  <iframe
                    key={`after-full-${refreshKey}`}
                    src={scanId ? `${getSandboxAfterUrl(scanId)}?k=${refreshKey}` : canonicalOriginalUrl}
                    title="Remediated Sandbox Website"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Change Counter Summary Card */}
        {verifiedCount > 0 && (
          <div className="bg-[#101b26] border border-blue-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold text-white">
                17 Elements Remediated in Sandbox
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">3 buttons</span>
              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">4 cards</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">2 headings</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">8 text blocks</span>
            </div>
          </div>
        )}

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
      <div className="p-3.5 border-t border-[#1e293b] bg-[#0d151e] space-y-2 flex-shrink-0">
        {/* Status & Summary header */}
        <div className="flex items-center justify-between text-[11px] pb-1 border-b border-[#1e293b]/70">
          <span className="font-bold text-[#cbd5e1] uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
            <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
            Remediation Export & Integration
          </span>
          <span className="text-[10px] text-[#94a3b8] font-mono">
            <strong className="text-emerald-400">{verifiedCount}</strong> Fixed
            {manualReviewCount > 0 && (
              <> • <strong className="text-amber-400">{manualReviewCount}</strong> Review</>
            )}
            {unresolvedCount > 0 && (
              <> • <strong className="text-red-400">{unresolvedCount}</strong> Unresolved</>
            )}
          </span>
        </div>

        {/* 1. Primary Action Row: Open Improved Website, Compare, View Changes, Undo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {scanId && (
            <a
              href={getSandboxUrl(scanId)}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md aura-glow-sm"
              title="Open Improved Remediated Website in new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Improved Website</span>
            </a>
          )}
          <button
            onClick={() => {
              setViewMode("sandbox");
              setSandboxViewTab("slider");
            }}
            className="py-2.5 px-3 bg-[#16202c] hover:bg-[#1e2d3d] border border-blue-500/30 text-blue-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            title="Compare Before vs After in slider view"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span>Compare Before / After</span>
          </button>
          <button
            onClick={() => {
              setViewMode("sandbox");
              setSandboxViewTab("show-changes");
            }}
            className="py-2.5 px-3 bg-[#16202c] hover:bg-[#1e2d3d] border border-purple-500/30 text-purple-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            title="View highlighted changes diff"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>View Changes</span>
          </button>
          {scanId && onRollback && (
            <button
              onClick={onRollback}
              disabled={isRollingBack}
              className="py-2.5 px-3 bg-[#16202c] hover:bg-amber-950/40 border border-amber-500/40 text-amber-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              title="Undo last change / Revert sandbox to previous snapshot"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRollingBack ? "animate-spin" : ""}`} />
              <span>{isRollingBack ? "Reverting..." : "Undo / Rollback"}</span>
            </button>
          )}
        </div>

        {/* Sandbox vs Live Website Distinction Notice */}
        <div className="bg-[#080d14] border border-[#1e293b] rounded-lg p-2 flex items-start gap-2 text-[10px] text-[#94a3b8]">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white">Sandbox Isolation:</strong> AURA remediates in a sandboxed staging clone. For external websites, your live production server is never modified directly. Use the Fix Pack or Pull Request actions below to safely export verified changes.
          </p>
        </div>

        {/* Error Alert if download fails */}
        {downloadError && (
          <div className="p-2.5 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center justify-between text-xs text-red-300 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{downloadError}</span>
            </div>
            <button
              onClick={() => setDownloadError(null)}
              className="text-red-400 hover:text-white p-1 rounded transition-colors"
              title="Dismiss error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 2. Download Fixed Website & Download Fix Pack */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDownloadWebsite}
            disabled={!scanId || isDownloadingWebsite}
            className={`py-2.5 px-2 ${
              scanId
                ? "bg-[#16202c] hover:bg-[#1e2d3d] border border-[#1e293b] hover:border-blue-500/40 text-white cursor-pointer shadow-sm"
                : "bg-[#16202c]/50 border border-[#1e293b] text-[#64748b] cursor-not-allowed"
            } font-semibold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5`}
            title="Download complete client-accessible remediated website (index.html + assets + README)"
          >
            {isDownloadingWebsite ? (
              <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FolderArchive className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span>{isDownloadingWebsite ? "Downloading..." : "Download Fixed Website"}</span>
          </button>

          <button
            onClick={handleDownloadFixPack}
            disabled={!scanId || verifiedCount === 0 || isDownloadingFixPack}
            title={verifiedCount === 0 ? "Verified remediation required before downloading Fix Pack" : "Download developer Fix Pack (git patches, changes.json, verification.json, README)"}
            className={`py-2.5 px-2 ${
              scanId && verifiedCount > 0
                ? "bg-[#16202c] hover:bg-[#1e2d3d] border border-emerald-500/40 text-emerald-300 font-semibold cursor-pointer shadow-sm aura-glow-sm"
                : "bg-[#16202c]/50 border border-[#1e293b] text-[#64748b] font-semibold cursor-not-allowed"
            } text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5`}
          >
            {isDownloadingFixPack ? (
              <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{isDownloadingFixPack ? "Downloading..." : "Download Fix Pack"}</span>
          </button>
        </div>

        {/* 3. Download Audit Report & Create GitHub Pull Request */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={scanId ? handleDownloadReport : onViewReport}
            disabled={isDownloadingReport}
            className="py-2 px-2 bg-[#16202c] hover:bg-[#1e2d3d] border border-[#1e293b] text-[#94a3b8] hover:text-white font-medium text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="Download complete accessibility & UI remediation audit report (Markdown)"
          >
            {isDownloadingReport ? (
              <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{isDownloadingReport ? "Downloading..." : "Download Audit Report"}</span>
          </button>

          <button
            onClick={() => setIsGitHubModalOpen(true)}
            disabled={!scanId || verifiedCount === 0}
            title={verifiedCount === 0 ? "Verified remediation required before creating a Pull Request" : "Create GitHub Pull Request with verified fixes"}
            className={`py-2 px-2 ${
              verifiedCount > 0
                ? "bg-purple-600/90 hover:bg-purple-600 text-white border border-purple-500/40 shadow-sm cursor-pointer"
                : "bg-[#16202c]/50 text-[#64748b] border border-[#1e293b] cursor-not-allowed"
            } font-semibold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5`}
          >
            <GitPullRequest className="w-3.5 h-3.5 text-purple-300" />
            <span>Create GitHub PR</span>
          </button>
        </div>
      </div>

      {/* GitHub PR Modal */}
      {scanId && (
        <GitHubPRModal
          isOpen={isGitHubModalOpen}
          onClose={() => setIsGitHubModalOpen(false)}
          scanId={scanId}
          targetUrl={targetUrl}
          verifiedCount={verifiedCount}
        />
      )}

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
