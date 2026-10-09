"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  Send,
  HelpCircle,
  ArrowRight,
  CheckCircle,
  Lightbulb,
  Eye,
  Loader2,
} from "lucide-react";
import type { AskAuraResponse } from "@/lib/types";

interface AskAuraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAsk: (question: string) => Promise<AskAuraResponse | null>;
  onPreviewAction?: (actionType: string, actionId: string) => void;
}

const PRESET_QUESTIONS = [
  "Why does this website look outdated?",
  "How can we improve CTA conversion and button contrast?",
  "Are card paddings and visual hierarchy balanced?",
  "How do we achieve WCAG AAA compliance across components?",
];

export function AskAuraModal({
  isOpen,
  onClose,
  onAsk,
  onPreviewAction,
}: AskAuraModalProps) {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AskAuraResponse | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (qToSubmit?: string) => {
    const activeQ = (qToSubmit || question).trim();
    if (!activeQ || isLoading) return;
    setIsLoading(true);
    setResponse(null);
    try {
      const res = await onAsk(activeQ);
      setResponse(res);
    } catch {
      // Handled in caller or error state
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-[#0f1720] border border-[#1e293b] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1e293b] bg-[#16202c]/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                Ask AURA Design Copilot
              </h3>
              <p className="text-xs text-[#94a3b8]">
                Real-time DOM & design intelligence for your scanned website
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748b] hover:text-white hover:bg-[#1e293b] transition-all"
            aria-label="Close Ask AURA"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Preset Questions */}
          <div>
            <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider block mb-2">
              Common Inquiries
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setQuestion(q);
                    handleSubmit(q);
                  }}
                  disabled={isLoading}
                  className="px-2.5 py-1.5 bg-[#16202c] hover:bg-[#1e2d3d] border border-[#1e293b] hover:border-blue-500/30 text-xs text-[#94a3b8] hover:text-white rounded-lg transition-all text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Question Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="Ask anything about design, accessibility, typography, or UX..."
              disabled={isLoading}
              className="flex-1 px-3.5 py-2.5 bg-[#0b1117] border border-[#1e293b] rounded-xl text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={() => handleSubmit()}
              disabled={isLoading || !question.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Ask</span>
            </button>
          </div>

          {/* Response Section */}
          {isLoading && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              <p className="text-xs text-[#94a3b8]">AURA is analyzing DOM tokens and design rules...</p>
            </div>
          )}

          {response && !isLoading && (
            <div className="bg-[#141b24] border border-[#1e293b] rounded-xl p-4 space-y-3.5 animate-fadeIn">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider block mb-1">
                  Analysis Summary
                </span>
                <p className="text-xs font-medium text-white leading-relaxed">
                  {response.summary}
                </p>
              </div>

              {response.reasons && response.reasons.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono text-[#64748b] uppercase tracking-wider block mb-1.5">
                    Empirical Factors Identified
                  </span>
                  <ul className="space-y-1">
                    {response.reasons.map((r, i) => (
                      <li key={i} className="text-xs text-[#94a3b8] flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {response.recommended_improvements && response.recommended_improvements.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block mb-1.5">
                    Recommended Fixes
                  </span>
                  <ul className="space-y-1">
                    {response.recommended_improvements.map((imp, i) => (
                      <li key={i} className="text-xs text-[#94a3b8] flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {response.suggested_action && onPreviewAction && (
                <div className="pt-2 border-t border-[#1e293b] flex items-center justify-between">
                  <span className="text-xs text-[#64748b]">
                    Ready to test this solution?
                  </span>
                  <button
                    onClick={() => onPreviewAction(response.suggested_action, response.suggested_id)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{response.action_label || "Preview Recommended Changes"}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1e293b] bg-[#16202c]/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[#94a3b8] hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
