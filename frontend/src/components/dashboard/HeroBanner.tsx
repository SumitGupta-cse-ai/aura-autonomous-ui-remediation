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
  scanStatus?: string;
  hasVerifiedFixes?: boolean;
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
  scanStatus = "ready",
  hasVerifiedFixes = false,
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
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            Agentic AI for Autonomous UI Remediation
          </span>
        </div>

        {/* 6-Step Autonomous Workflow Progress Indicator */}
        <div className="bg-[#0b1117] border border-[#1e293b] rounded-xl p-2.5 mb-4 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[560px] text-[11px] font-mono">
            {[
              { id: "scan", label: "1. SCAN", active: !scanStatus || scanStatus === "ready" || scanStatus === "pending" },
              { id: "analyze", label: "2. ANALYZE", active: scanStatus === "scanning" || scanStatus === "analyzing" },
              { id: "preview", label: "3. PREVIEW", active: scanStatus === "complete" && !hasVerifiedFixes },
              { id: "apply", label: "4. APPLY", active: scanStatus === "remediating" || scanStatus === "fixing" },
              { id: "verify", label: "5. VERIFY", active: scanStatus === "complete" && hasVerifiedFixes },
              { id: "improved", label: "6. IMPROVED WEBSITE", active: Boolean(hasVerifiedFixes) },
            ].map((step, idx, arr) => (
              <React.Fragment key={step.id}>
                <div
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all ${
                    step.active
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold shadow-xs"
                      : "text-[#64748b]"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${step.active ? "bg-emerald-400 animate-pulse" : "bg-[#334155]"}`} />
                  <span>{step.label}</span>
                </div>
                {idx < arr.length - 1 && <span className="text-[#334155] select-none font-sans">→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Headline & Subtitle */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3 leading-tight">
            Detect. <span className="text-emerald-400">Fix.</span> Verify.
          </h1>
          <p className="text-[#94a3b8] text-sm md:text-base max-w-xl leading-relaxed">
            AURA autonomously analyzes accessibility, visual design, UX, responsiveness, performance and consistency — previewing and verifying every remediation in an isolated sandbox before export.
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
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3.5 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          How AURA Works
        </h3>

        <div className="space-y-2.5">
          <WorkStep
            num={1}
            title="Scan Website"
            desc="Browser automation loads the target website and captures its DOM, styles and assets."
            color="bg-blue-500"
          />
          <WorkStep
            num={2}
            title="Analyze"
            desc="AURA combines deterministic accessibility checks, DOM/CSS analysis and contextual AI analysis."
            color="bg-indigo-500"
          />
          <WorkStep
            num={3}
            title="Identify Issues"
            desc="Detects accessibility, contrast, image, structure and supported UI/UX problems."
            color="bg-purple-500"
          />
          <WorkStep
            num={4}
            title="Generate Safe Improvements"
            desc="AI identifies remediation and UI/UX improvement opportunities and creates safe change plans."
            color="bg-amber-500"
          />
          <WorkStep
            num={5}
            title="Apply in Sandbox"
            desc="Changes are applied to an isolated copy of the same target website."
            color="bg-teal-500"
          />
          <WorkStep
            num={6}
            title="Re-Audit & Verify"
            desc="AURA checks accessibility, visuals, responsiveness and regressions after the changes."
            color="bg-emerald-500"
          />
          <WorkStep
            num={7}
            title="Report Results"
            desc="Shows improvements, fixed issues, remaining issues, regressions and manual-review items."
            color="bg-emerald-400"
          />
        </div>

        <div className="mt-4 pt-3 border-t border-[#1e293b] text-[11px] text-[#94a3b8] flex items-center justify-between">
          <span>Closed-loop remediation</span>
          <span className="text-emerald-400 font-medium">Scan → Understand → Improve → Verify</span>
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
