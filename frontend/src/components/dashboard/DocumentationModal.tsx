"use client";

import React, { useState } from "react";
import {
  BookOpen,
  X,
  Shield,
  Sparkles,
  CheckCircle2,
  Code,
  Layers,
  Cpu,
  Lock,
  ExternalLink,
} from "lucide-react";

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDemo?: () => void;
}

type DocTab = "architecture" | "wcag" | "safety" | "api";

export function DocumentationModal({
  isOpen,
  onClose,
  onOpenDemo,
}: DocumentationModalProps) {
  const [activeTab, setActiveTab] = useState<DocTab>("architecture");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn select-none">
      <div className="bg-[#0f1720] border border-[#1e293b] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#1e293b] flex items-center justify-between bg-[#0d151e]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>AURA System Documentation</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  v1.0
                </span>
              </h3>
              <p className="text-xs text-[#94a3b8]">
                Autonomous UI Accessibility Remediation Agent Reference & Specs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748b] hover:text-white hover:bg-[#16202c] transition-all"
            aria-label="Close Documentation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 border-b border-[#1e293b] px-5 bg-[#0b1117] overflow-x-auto scrollbar-none">
          {(
            [
              ["architecture", "Agent Architecture", Cpu],
              ["wcag", "WCAG Rules", Layers],
              ["safety", "Safety & Guardrails", Lock],
              ["api", "REST & WebSocket API", Code],
            ] as [DocTab, string, React.ComponentType<{ className?: string }>][]
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === key
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-[#94a3b8] hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-[#cbd5e1] leading-relaxed">
          {activeTab === "architecture" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Closed-Loop Autonomous Agent Design
                </h4>
                <p className="text-[#94a3b8]">
                  AURA is an active autonomous agent operating in a continuous four-stage execution loop:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#16202c] border border-[#1e293b]">
                  <span className="text-xs font-bold text-blue-400 block mb-1">
                    1. OBSERVE
                  </span>
                  <p className="text-[11px] text-[#94a3b8]">
                    Playwright Chromium loads target URL, captures viewport screenshots, and executes deterministic axe-core audits against the rendered live DOM.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#16202c] border border-[#1e293b]">
                  <span className="text-xs font-bold text-purple-400 block mb-1">
                    2. REASON
                  </span>
                  <p className="text-[11px] text-[#94a3b8]">
                    Extracts element ancestry, semantic roles, nearby headings, and visual context to synthesize WCAG-compliant remediation plans.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#16202c] border border-[#1e293b]">
                  <span className="text-xs font-bold text-amber-400 block mb-1">
                    3. ACT (SANDBOX)
                  </span>
                  <p className="text-[11px] text-[#94a3b8]">
                    Safety validator verifies proposed mutation against allowlisted rules, compiling and applying deterministic patches in an isolated per-scan sandbox.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#16202c] border border-[#1e293b]">
                  <span className="text-xs font-bold text-emerald-400 block mb-1">
                    4. VERIFY
                  </span>
                  <p className="text-[11px] text-[#94a3b8]">
                    Re-runs axe-core on patched sandbox. If violations decrease without regressions, status is marked VERIFIED; otherwise it triggers automated rollback.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "wcag" && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Supported WCAG 2.1 & 2.2 Guidelines
              </h4>
              <p className="text-[#94a3b8] mb-3">
                AURA handles critical accessibility compliance failures with deterministic, automated patches:
              </p>

              <div className="space-y-2">
                {[
                  {
                    rule: "html-has-lang",
                    wcag: "3.1.1",
                    severity: "Critical",
                    desc: "Ensures document defines spoken language attribute on <html> element for assistive screen readers.",
                  },
                  {
                    rule: "image-alt / input-image-alt",
                    wcag: "1.1.1",
                    severity: "Critical",
                    desc: "Injects descriptive alternative text for non-text image content based on visual and DOM context.",
                  },
                  {
                    rule: "button-name / link-name",
                    wcag: "4.1.2",
                    severity: "Serious",
                    desc: "Ensures interactive buttons and links have accessible names via explicit text or aria-label.",
                  },
                  {
                    rule: "label / select-name",
                    wcag: "1.3.1",
                    severity: "Serious",
                    desc: "Associates form controls with descriptive aria-label or matching <label> elements.",
                  },
                  {
                    rule: "heading-order",
                    wcag: "1.3.1",
                    severity: "Moderate",
                    desc: "Reorders skipped heading hierarchy tags (e.g. h1 to h4 -> h1 to h2) to restore document outline.",
                  },
                  {
                    rule: "color-contrast",
                    wcag: "1.4.3",
                    severity: "Serious",
                    desc: "Adjusts foreground text color to ensure minimum 4.5:1 contrast ratio against background.",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-[#16202c] border border-[#1e293b] flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-bold text-emerald-400 text-xs">
                          {item.rule}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-black/40 rounded text-[#94a3b8] font-mono">
                          WCAG {item.wcag}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/10 text-red-400 font-bold border border-red-500/20">
                          {item.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94a3b8]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "safety" && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                Zero-Risk Safety Engine & Sandbox Protection
              </h4>
              <p className="text-[#94a3b8]">
                AURA guarantees target applications remain unharmed through rigorous multi-layer guardrails:
              </p>

              <div className="space-y-2.5">
                <div className="p-3 rounded-lg bg-[#16202c] border border-[#1e293b] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Isolated Sandbox Execution</span>
                    <p className="text-[11px] text-[#94a3b8]">
                      Patches are never written directly to the user&apos;s production server. All mutations run inside an isolated per-scan sandbox directory served at <code>/sandbox/{`{scan_id}`}</code>.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#16202c] border border-[#1e293b] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Allowlisted Mutation Rules</span>
                    <p className="text-[11px] text-[#94a3b8]">
                      Only safe attributes (e.g. <code>alt</code>, <code>aria-label</code>, <code>lang</code>, <code>role</code>) and non-destructive styling or heading tag corrections are permitted. Script tags and remote injections are strictly rejected.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#16202c] border border-[#1e293b] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Automated Regression Rollback</span>
                    <p className="text-[11px] text-[#94a3b8]">
                      If a patch fails the axe-core re-audit or causes new accessibility violations, the engine automatically rolls back the DOM to its prior verified state.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "api" && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-400" />
                REST & WebSocket API Endpoints
              </h4>

              <div className="space-y-2 font-mono text-[11px]">
                <div className="p-2.5 rounded bg-[#16202c] border border-[#1e293b]">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded font-bold">POST</span>
                    <span className="text-white">/api/scan</span>
                  </div>
                  <p className="text-[10px] text-[#94a3b8] font-sans mt-1">
                    Start asynchronous accessibility audit for target URL.
                  </p>
                </div>

                <div className="p-2.5 rounded bg-[#16202c] border border-[#1e293b]">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-bold">GET</span>
                    <span className="text-white">/api/scan/{`{id}`}</span>
                  </div>
                  <p className="text-[10px] text-[#94a3b8] font-sans mt-1">
                    Retrieve full scan data, detected issues, and verification summaries.
                  </p>
                </div>

                <div className="p-2.5 rounded bg-[#16202c] border border-[#1e293b]">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded font-bold">POST</span>
                    <span className="text-white">/api/scan/{`{id}`}/fix/{`{issue_id}`}</span>
                  </div>
                  <p className="text-[10px] text-[#94a3b8] font-sans mt-1">
                    Remediate specific issue in sandbox and execute axe-core re-audit.
                  </p>
                </div>

                <div className="p-2.5 rounded bg-[#16202c] border border-[#1e293b]">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded font-bold">POST</span>
                    <span className="text-white">/api/scan/{`{id}`}/fix-all</span>
                  </div>
                  <p className="text-[10px] text-[#94a3b8] font-sans mt-1">
                    Automatically remediate all detected issues sequentially.
                  </p>
                </div>

                <div className="p-2.5 rounded bg-[#16202c] border border-[#1e293b]">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded font-bold">WS</span>
                    <span className="text-white">/ws/scan/{`{id}`}</span>
                  </div>
                  <p className="text-[10px] text-[#94a3b8] font-sans mt-1">
                    Live WebSocket streaming agent events and state transitions in real time.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1e293b] bg-[#0d151e] flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onOpenDemo?.();
            }}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Try Offline Demos</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#16202c] hover:bg-[#1e2d3d] text-white text-xs font-semibold rounded-xl border border-[#1e293b]"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
}
