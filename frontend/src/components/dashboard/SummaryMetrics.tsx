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
import type { ScanSummary } from "@/lib/types";

interface SummaryMetricsProps {
  summary?: ScanSummary;
  scanStatus?: string;
  durationMs?: number;
}

export function SummaryMetrics({
  summary,
  scanStatus = "complete",
  durationMs = 0,
}: SummaryMetricsProps) {
  const total = summary?.total_issues || 0;
  const critical = summary?.critical || 0;
  const serious = summary?.serious || 0;
  const moderate = summary?.moderate || 0;
  const minor = summary?.minor || 0;
  const fixed = summary?.fixed || 0;
  const unresolved = summary?.unresolved || 0;

  const fixPercentage = total > 0 ? Math.round((fixed / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Issues Found */}
      <div className="bg-[#0f1720] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between hover:border-[#334155] transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            Issues Found
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 font-bold border border-red-500/20">
            {unresolved} Unresolved
          </span>
        </div>
        <div className="flex items-baseline gap-2 my-1">
          <span className="text-3xl font-extrabold text-white">{total}</span>
          <span className="text-xs text-[#64748b]">Total Issues</span>
        </div>
        <div className="grid grid-cols-4 gap-1 pt-2 border-t border-[#1e293b] text-center">
          <div className="bg-red-500/10 border border-red-500/20 rounded py-1">
            <span className="block text-[11px] font-bold text-red-400">{critical}</span>
            <span className="block text-[9px] text-[#94a3b8]">Critical</span>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded py-1">
            <span className="block text-[11px] font-bold text-orange-400">{serious}</span>
            <span className="block text-[9px] text-[#94a3b8]">Serious</span>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded py-1">
            <span className="block text-[11px] font-bold text-yellow-400">{moderate}</span>
            <span className="block text-[9px] text-[#94a3b8]">Moderate</span>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded py-1">
            <span className="block text-[11px] font-bold text-blue-400">{minor}</span>
            <span className="block text-[9px] text-[#94a3b8]">Minor</span>
          </div>
        </div>
      </div>

      {/* 2. Fixes Applied */}
      <div className="bg-[#0f1720] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between hover:border-[#334155] transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-emerald-400" />
            Fixes Applied
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
            {fixed} Verified
          </span>
        </div>
        <div className="flex items-baseline gap-2 my-1">
          <span className="text-3xl font-extrabold text-white">
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
      <div className="bg-[#0f1720] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between hover:border-[#334155] transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            Scan Status
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
            {scanStatus.toUpperCase()}
          </span>
        </div>
        <div className="flex items-baseline gap-2 my-1">
          <span className="text-2xl font-extrabold text-white capitalize">
            {scanStatus === "complete" ? "Completed" : scanStatus}
          </span>
        </div>
        <p className="text-[11px] text-[#64748b] mt-2">
          {scanStatus === "complete"
            ? "Audit engine completed re-verification checks"
            : "Processing webpage DOM & running axe-core rules..."}
        </p>
      </div>

      {/* 4. Verification Rate */}
      <div className="bg-[#0f1720] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between hover:border-[#334155] transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Verification Engine
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
            axe-core v4.9
          </span>
        </div>
        <div className="flex items-baseline gap-2 my-1">
          <span className="text-3xl font-extrabold text-emerald-400">
            {total > 0 && fixed > 0 ? `${fixPercentage}%` : fixed === 0 && total > 0 ? "0%" : "Ready"}
          </span>
          <span className="text-xs text-[#64748b]">
            {fixed > 0 ? "Verified Fixes" : "Awaiting Fix"}
          </span>
        </div>
        <p className="text-[11px] text-[#64748b] mt-2">
          {fixed > 0
            ? `${fixed} of ${total} issue(s) confirmed resolved in sandbox.`
            : "Every fix is tested in a Playwright sandbox & verified by re-audit."}
        </p>
      </div>
    </div>
  );
}
