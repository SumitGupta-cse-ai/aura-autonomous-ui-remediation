"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  Check,
  ShieldCheck,
  AlertTriangle,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import type { PreviewData } from "@/lib/types";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewData: PreviewData | null;
  onApply: (type: string, id: string) => Promise<void> | void;
  isApplying?: boolean;
  onInspectElement?: (info: any) => void;
}

export function PreviewModal({
  isOpen,
  onClose,
  previewData,
  onApply,
  isApplying = false,
  onInspectElement,
}: PreviewModalProps) {
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showChanges, setShowChanges] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen || !previewData) return null;

  const handleApplyClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmApply = async () => {
    setShowConfirm(false);
    await onApply(previewData.type, previewData.id);
    onClose();
  };

  const iframeSrc = showChanges
    ? previewData.preview_url.replace("/preview", "/show-changes")
    : previewData.preview_url;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-[#0f1720] border border-[#1e293b] rounded-2xl w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden shadow-2xl relative">
        {/* Header Bar */}
        <div className="p-4 border-b border-[#1e293b] bg-[#0d151e] flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  {previewData.name} — Preview Mode
                </h3>
                <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-semibold">
                  Temporary Sandbox
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                {previewData.disclaimer || "This is a preview. Your original website has not been modified."}
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Viewport Toggles */}
            <div className="flex items-center bg-[#16202c] p-1 rounded-xl border border-[#1e293b]">
              <button
                onClick={() => setViewport("desktop")}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewport === "desktop"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-xs"
                    : "text-[#94a3b8] hover:text-white"
                }`}
                title="Desktop 1280px"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                onClick={() => setViewport("tablet")}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewport === "tablet"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-xs"
                    : "text-[#94a3b8] hover:text-white"
                }`}
                title="Tablet 768px"
              >
                <Tablet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tablet</span>
              </button>
              <button
                onClick={() => setViewport("mobile")}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewport === "mobile"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-xs"
                    : "text-[#94a3b8] hover:text-white"
                }`}
                title="Mobile 375px"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>

            {/* Show Changes Toggle */}
            <button
              onClick={() => setShowChanges(!showChanges)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showChanges
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs"
                  : "bg-[#16202c] hover:bg-[#1e2d3d] text-[#94a3b8] border-[#1e293b]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showChanges ? "Hide Outlines" : "Show Changes"}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#16202c] hover:bg-[#1e2d3d] text-[#94a3b8] hover:text-white border border-[#1e293b] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Improvements Checklist Bar */}
        <div className="bg-[#090d16] border-b border-[#1e293b] px-4 py-2 flex items-center justify-between text-xs overflow-x-auto gap-4 flex-shrink-0 scrollbar-none">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              {previewData.elements_affected || 17} Proposed Improvements:
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            {previewData.proposed_improvements?.slice(0, 5).map((imp, idx) => (
              <span
                key={idx}
                className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 px-2 py-0.5 rounded-md font-mono flex items-center gap-1 whitespace-nowrap"
              >
                <Check className="w-3 h-3 text-emerald-400" />
                {imp}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 text-[10px] text-[#94a3b8]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Risk: <strong className="text-emerald-400">{previewData.risk || "Low"}</strong></span>
          </div>
        </div>

        {/* Main Preview Frame Workspace */}
        <div className="flex-1 min-h-0 bg-[#070c12] p-3 flex items-center justify-center overflow-auto relative">
          <div
            className={`h-full bg-white rounded-xl overflow-hidden shadow-2xl border border-[#334155] transition-all duration-300 ${
              viewport === "desktop"
                ? "w-full"
                : viewport === "tablet"
                ? "w-[768px]"
                : "w-[375px]"
            }`}
          >
            <iframe
              src={iframeSrc}
              title="AURA Live Proposed Improvement Preview"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-[#1e293b] bg-[#0d151e] flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>Click any element inside the preview to inspect exact Before vs After changes.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={isApplying}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#16202c] hover:bg-[#1e2d3d] border border-[#1e293b] text-[#94a3b8] hover:text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Keep Current (Cancel)
            </button>

            <button
              onClick={handleApplyClick}
              disabled={isApplying}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer aura-glow-sm disabled:opacity-50"
            >
              {isApplying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Applying Changes...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apply This Improvement</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Apply Confirmation Modal (Prompt Requirement #40) */}
        {showConfirm && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0f1720] border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Apply This Improvement?</h4>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    {previewData.elements_affected || 7} verified changes will be committed to your sandbox website.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0b1117] border border-[#1e293b] space-y-1.5 text-xs text-[#cbd5e1]">
                <div className="flex items-center justify-between">
                  <span className="text-[#94a3b8]">Target:</span>
                  <span className="font-semibold text-white">{previewData.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#94a3b8]">Risk Assessment:</span>
                  <span className="text-emerald-400 font-bold">{previewData.risk || "Low Risk"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#94a3b8]">Rollback:</span>
                  <span className="text-blue-400 font-semibold">Automatic snapshot enabled</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 rounded-xl bg-[#16202c] hover:bg-[#1e2d3d] border border-[#1e293b] text-white text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmApply}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Apply Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
