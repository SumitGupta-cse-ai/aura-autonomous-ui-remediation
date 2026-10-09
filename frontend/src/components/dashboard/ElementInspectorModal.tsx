"use client";

import React from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  Wrench,
  ShieldAlert,
  ArrowRight,
  Code2,
} from "lucide-react";
import type { ElementInspectionData } from "@/lib/types";

interface ElementInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspection: ElementInspectionData | null;
  onPreviewFix?: () => void;
  onApplyFix?: () => void;
  isApplying?: boolean;
}

export function ElementInspectorModal({
  isOpen,
  onClose,
  inspection,
  onPreviewFix,
  onApplyFix,
  isApplying = false,
}: ElementInspectorModalProps) {
  if (!isOpen || !inspection) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-[#0f1720] border border-[#1e293b] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1e293b] bg-[#16202c]/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Element-Level AI Inspector</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {inspection.tag}
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] font-mono mt-0.5 truncate max-w-md">
                {inspection.selector}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748b] hover:text-white hover:bg-[#1e293b] transition-all"
            aria-label="Close inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Element Display Title */}
          <div className="bg-[#16202c]/50 border border-[#1e293b] rounded-xl p-3.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
              Inspected Element
            </span>
            <span className="text-sm font-bold text-white">
              {inspection.element_name}
            </span>
          </div>

          {/* Before vs After Metric Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Before Metric Card */}
            <div className="bg-[#141b24] border border-red-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                  Before (Current Website)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                  {inspection.before.wcag}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-[#1e293b]/50">
                  <span className="text-[#64748b]">Background Color</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full border border-white/20 inline-block"
                      style={{ backgroundColor: inspection.before.background }}
                    />
                    <code className="text-[#94a3b8] font-mono">{inspection.before.background}</code>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-[#1e293b]/50">
                  <span className="text-[#64748b]">Text Color</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full border border-white/20 inline-block"
                      style={{ backgroundColor: inspection.before.text }}
                    />
                    <code className="text-[#94a3b8] font-mono">{inspection.before.text}</code>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-[#1e293b]/50">
                  <span className="text-[#64748b]">Contrast Ratio</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-red-400 font-bold font-mono">{inspection.before.contrast}</span>
                    <span className="text-[10px] text-red-400 font-semibold uppercase">({inspection.before.contrast_status})</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-[#64748b]">Padding / Spacing</span>
                  <code className="text-[#94a3b8] font-mono">{inspection.before.padding}</code>
                </div>
              </div>
            </div>

            {/* After Metric Card */}
            <div className="bg-[#141b24] border border-emerald-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  After (Remediated)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {inspection.after.wcag}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-[#1e293b]/50">
                  <span className="text-[#64748b]">Background Color</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full border border-white/20 inline-block"
                      style={{ backgroundColor: inspection.after.background }}
                    />
                    <code className="text-[#94a3b8] font-mono">{inspection.after.background}</code>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-[#1e293b]/50">
                  <span className="text-[#64748b]">Text Color</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full border border-white/20 inline-block"
                      style={{ backgroundColor: inspection.after.text }}
                    />
                    <code className="text-[#94a3b8] font-mono">{inspection.after.text}</code>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-[#1e293b]/50">
                  <span className="text-[#64748b]">Contrast Ratio</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-bold font-mono">{inspection.after.contrast}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase">({inspection.after.contrast_status})</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-[#64748b]">Padding / Spacing</span>
                  <code className="text-[#94a3b8] font-mono">{inspection.after.padding}</code>
                </div>
              </div>
            </div>
          </div>

          {/* Explainable AI 5-Point Breakdown */}
          <div className="bg-[#121922] border border-[#1e293b] rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Explainable AI Analysis
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="bg-[#16202c]/70 rounded-lg p-2.5">
                <span className="font-bold text-blue-400 block mb-0.5">WHAT WAS DETECTED</span>
                <p className="text-[#94a3b8] leading-relaxed">{inspection.explainable_ai.what}</p>
              </div>

              <div className="bg-[#16202c]/70 rounded-lg p-2.5">
                <span className="font-bold text-amber-400 block mb-0.5">WHY IT MATTERS</span>
                <p className="text-[#94a3b8] leading-relaxed">{inspection.explainable_ai.why}</p>
              </div>

              <div className="bg-[#16202c]/70 rounded-lg p-2.5">
                <span className="font-bold text-purple-400 block mb-0.5">HOW AURA REMEDIATES IT</span>
                <p className="text-[#94a3b8] leading-relaxed">{inspection.explainable_ai.how}</p>
              </div>

              <div className="bg-[#16202c]/70 rounded-lg p-2.5">
                <span className="font-bold text-emerald-400 block mb-0.5">IMPACT ON USER EXPERIENCE</span>
                <p className="text-[#94a3b8] leading-relaxed">{inspection.explainable_ai.impact}</p>
              </div>

              <div className="bg-[#16202c]/70 rounded-lg p-2.5">
                <span className="font-bold text-cyan-400 block mb-0.5">VERIFICATION STATUS</span>
                <p className="text-[#94a3b8] leading-relaxed">{inspection.explainable_ai.verification}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-5 py-3.5 border-t border-[#1e293b] bg-[#16202c]/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-[#94a3b8] hover:text-white transition-colors"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            {onPreviewFix && (
              <button
                onClick={onPreviewFix}
                className="px-4 py-2 bg-[#1e2d3d] hover:bg-[#26374a] text-blue-400 border border-blue-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                Preview Fix
              </button>
            )}
            {onApplyFix && (
              <button
                onClick={onApplyFix}
                disabled={isApplying}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md"
              >
                <Wrench className="w-3.5 h-3.5" />
                {isApplying ? "Applying..." : "Apply Fix to Sandbox"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
