"use client";

import React, { useState } from "react";
import type { ScanReport } from "@/lib/types";
import {
  FileText,
  X,
  Download,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

interface ReportModalProps {
  report: ScanReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportModal({ report, isOpen, onClose }: ReportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !report) return null;

  function copyReportJson() {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadReportJson() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AURA-Report-${report.scan_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f1720] border border-[#1e293b] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#1e293b] flex items-center justify-between bg-[#0d151e]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                AURA Audit & Remediation Report
              </h3>
              <p className="text-xs text-[#94a3b8] font-mono">
                Scan ID: {report.scan_id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748b] hover:text-white hover:bg-[#16202c] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Target Info */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#0b1117] border border-[#1e293b] text-xs">
            <div>
              <span className="text-[#64748b] block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                Target URL
              </span>
              <span className="font-mono text-emerald-400 break-all">{report.url}</span>
            </div>
            <div>
              <span className="text-[#64748b] block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                Scan Timestamp
              </span>
              <span className="text-white font-mono">{report.scan_timestamp}</span>
            </div>
          </div>

          {/* Health Score Progression */}
          <div className="p-4 rounded-xl bg-[#0b1117] border border-[#1e293b] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#64748b] uppercase tracking-wider font-bold block">
                Accessibility Health Score
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-emerald-400">
                  {report.health_score_current ?? 100} / 100
                </span>
                {(report.health_score_initial ?? 100) < (report.health_score_current ?? 100) && (
                  <span className="text-xs text-[#94a3b8]">
                    (baseline was {report.health_score_initial})
                  </span>
                )}
              </div>
            </div>
            <div className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              {report.issues_fixed > 0
                ? `+${(report.health_score_current ?? 100) - (report.health_score_initial ?? 100)} pts gained`
                : "Baseline WCAG Audit"}
            </div>
          </div>

          {/* Overview Grid */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-[#16202c] border border-[#1e293b]">
              <span className="block text-2xl font-bold text-white">
                {report.total_issues}
              </span>
              <span className="text-[10px] text-[#94a3b8] font-medium">Total Issues</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="block text-2xl font-bold text-emerald-400">
                {report.issues_fixed}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium">Fixed & Verified</span>
            </div>
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <span className="block text-2xl font-bold text-red-400">
                {report.issues_unresolved}
              </span>
              <span className="text-[10px] text-red-400 font-medium">Unresolved</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="block text-2xl font-bold text-amber-400">
                {report.issues_needs_review}
              </span>
              <span className="text-[10px] text-amber-400 font-medium">Needs Review</span>
            </div>
          </div>

          {/* Limitations Disclaimer */}
          <div className="p-4 rounded-xl bg-[#16202c] border border-[#1e293b] space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Automated Audit Limitations & Disclaimer</span>
            </div>
            <ul className="list-disc list-inside text-xs text-[#94a3b8] space-y-1 pl-1">
              {report.limitations?.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#1e293b] bg-[#0d151e] flex items-center justify-between">
          <button
            onClick={copyReportJson}
            className="px-4 py-2 rounded-xl bg-[#16202c] hover:bg-[#1e2d3d] border border-[#1e293b] text-[#94a3b8] hover:text-white text-xs font-medium transition-all flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copied JSON" : "Copy Report JSON"}</span>
          </button>

          <button
            onClick={downloadReportJson}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all flex items-center gap-2 aura-glow-sm shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Download Report (JSON)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
