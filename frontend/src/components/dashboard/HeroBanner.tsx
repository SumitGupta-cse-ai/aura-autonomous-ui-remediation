"use client";

import React, { useState } from "react";
import {
  Scan,
  Sparkles,
  ArrowRight,
  Globe,
  Eye,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface HeroBannerProps {
  url: string;
  setUrl: (url: string) => void;
  onScan: (e: React.FormEvent) => void;
  onQuickScan?: (url: string) => void;
  onDemo: () => void;
  onViewReport?: () => void;
  loading: boolean;
  demoLoading: boolean;
  error?: string;
}

export function HeroBanner({
  url,
  setUrl,
  onScan,
  onQuickScan,
  onDemo,
  onViewReport,
  loading,
  demoLoading,
  error,
}: HeroBannerProps) {
  // Slider position state for the interactive visual preview in the hero
  const [sliderPos, setSliderPos] = useState(55);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left / Center Banner Main */}
      <div className="lg:col-span-8 bg-gradient-to-br from-[#0f1720] via-[#111c28] to-[#0f1720] border border-[#1e293b] rounded-2xl p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl">
        {/* Background glow effects */}
        <div className="absolute top-0 right-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

        {/* Top Tagline Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            Agentic AI for a More Accessible Web
          </span>
        </div>

        {/* Headline & Subtitle */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3 leading-tight">
            Detect. <span className="text-emerald-400">Fix.</span> Verify.
          </h1>
          <p className="text-[#94a3b8] text-sm md:text-base max-w-xl leading-relaxed">
            Scan any website for accessibility and UI issues, automatically fix them using AI, and verify the results with real re-audits.
          </p>
        </div>

        {/* URL Scanner Input */}
        <form onSubmit={onScan} noValidate className="w-full mb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com or select a test site below"
                className="w-full pl-11 pr-4 py-3.5 bg-[#0b1117] border border-[#1e293b] focus:border-emerald-500 rounded-xl text-white placeholder-[#64748b] text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 aura-glow-sm shadow-lg flex-shrink-0 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <span>Scan Website</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* One-Click Quick Test Websites with Real Accessibility Violations */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-[11px] text-[#64748b] font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Quick Test Sites:
          </span>
          <button
            type="button"
            onClick={() => onQuickScan?.("demo-site/full_remediation.html")}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg bg-[#16202c] hover:bg-emerald-500/20 border border-[#1e293b] hover:border-emerald-500/40 text-[11px] font-semibold text-emerald-400 transition-all flex items-center gap-1 cursor-pointer"
            title="Featured Judge Demo with 7+ accessibility violations"
          >
            <span>ShopX Demo (7+ Issues)</span>
            <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">Featured</span>
          </button>
          <button
            type="button"
            onClick={() => onQuickScan?.("demo-site/demo1.html")}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg bg-[#16202c] hover:bg-blue-500/20 border border-[#1e293b] hover:border-blue-500/40 text-[11px] font-medium text-[#94a3b8] hover:text-white transition-all cursor-pointer"
          >
            <span>WCAG Basics (5 Issues)</span>
          </button>
          <button
            type="button"
            onClick={() => onQuickScan?.("https://www.w3.org/WAI/demos/bad/")}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg bg-[#16202c] hover:bg-amber-500/20 border border-[#1e293b] hover:border-amber-500/40 text-[11px] font-medium text-amber-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
            title="Official W3C Before/After Inaccessible Web Page Demo"
          >
            <Globe className="w-3 h-3 text-amber-400" />
            <span>W3C Inaccessible Demo</span>
          </button>
        </div>

        {/* Secondary Action Buttons & Error */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onDemo}
            disabled={demoLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#16202c] hover:bg-[#1e2d3d] border border-[#1e293b] hover:border-emerald-500/40 text-emerald-400 text-xs font-semibold rounded-lg transition-all"
          >
            {demoLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            <span>Try Demo Website</span>
          </button>

          <button
            type="button"
            onClick={onViewReport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#16202c] hover:bg-[#1e2d3d] border border-[#1e293b] text-[#94a3b8] hover:text-white text-xs font-medium rounded-lg transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View Sample Report</span>
          </button>
        </div>

        {error && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Right Column: How AURA Works Card */}
      <div id="how-it-works" className="lg:col-span-4 bg-[#0f1720] border border-[#1e293b] rounded-2xl p-6 flex flex-col justify-between shadow-xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          How AURA Works
        </h3>

        <div className="space-y-3.5">
          <WorkStep
            num={1}
            title="Scan Website"
            desc="Browser automation opens page & loads full DOM"
            color="bg-blue-500"
          />
          <WorkStep
            num={2}
            title="Detect Issues"
            desc="axe-core performs deterministic WCAG audit"
            color="bg-purple-500"
          />
          <WorkStep
            num={3}
            title="Understand"
            desc="AI analyzes root cause & element context"
            color="bg-emerald-500"
          />
          <WorkStep
            num={4}
            title="Fix Automatically"
            desc="Safety validator compiles safe DOM patch"
            color="bg-amber-500"
          />
          <WorkStep
            num={5}
            title="Re-Audit"
            desc="Runs audit again & verifies issue resolution"
            color="bg-emerald-400"
          />
        </div>

        <div className="mt-4 pt-3 border-t border-[#1e293b] text-[11px] text-[#94a3b8] flex items-center justify-between">
          <span>Closed-loop agent</span>
          <span className="text-emerald-400 font-medium">100% Real Audits</span>
        </div>
      </div>
    </div>
  );
}

function WorkStep({
  num,
  title,
  desc,
  color,
}: {
  num: number;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`w-6 h-6 rounded-full ${color} text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm`}
      >
        {num}
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-white">{title}</span>
        <span className="text-[11px] text-[#94a3b8] leading-snug">{desc}</span>
      </div>
    </div>
  );
}
