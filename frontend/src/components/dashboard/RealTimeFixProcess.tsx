"use client";

import React from "react";
import { CheckCircle2, Loader2, Circle, AlertCircle } from "lucide-react";
import type { TimelineEvent, IssueStatus } from "@/lib/types";

interface RealTimeFixProcessProps {
  status?: string;
  fixingIssueId?: string | null;
  issueStatus?: IssueStatus;
  timeline: TimelineEvent[];
}

export function RealTimeFixProcess({
  status,
  fixingIssueId,
  issueStatus,
  timeline,
}: RealTimeFixProcessProps) {
  const isFixing = Boolean(fixingIssueId);

  // Derive status of each step in the 8-step pipeline based on timeline events
  const steps = [
    { id: "analyze", label: "Analyzing issue...", eventMatch: "analysis" },
    { id: "plan", label: "AI generating fix plan...", eventMatch: "plan" },
    { id: "sandbox", label: "Creating sandbox...", eventMatch: "sandbox" },
    { id: "patch", label: "Applying patch...", eventMatch: "patch" },
    { id: "validate", label: "Validating DOM changes...", eventMatch: "dom" },
    { id: "reaudit", label: "Running re-audit...", eventMatch: "re-audit" },
    { id: "verify", label: "Verifying fix...", eventMatch: "verified" },
    { id: "evidence", label: "Generating evidence...", eventMatch: "complete" },
  ];

  // Helper to determine step state
  function getStepState(index: number, eventMatch: string) {
    const hasEvent = timeline.some(
      (e) => (e.message || "").toLowerCase().includes(eventMatch) || (e.details || "").toLowerCase().includes(eventMatch)
    );

    if (hasEvent || issueStatus === "fixed") {
      return "completed";
    }
    if (isFixing && (index === 0 || timeline.length >= index)) {
      return "running";
    }
    if (issueStatus === "failed") {
      return index <= timeline.length ? "failed" : "pending";
    }
    return "pending";
  }

  return (
    <div className="bg-[#0f1720] light:bg-white border border-[#1e293b] light:border-[#e2e8f0] rounded-xl p-4 shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-[#1e293b] light:border-[#e2e8f0] mb-3">
        <h4 className="text-xs font-bold text-white light:text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Real-time Fix Process
        </h4>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          {isFixing ? "FIX IN PROGRESS" : issueStatus === "fixed" ? "VERIFIED ✓" : "READY"}
        </span>
      </div>

      <div className="space-y-2.5 my-1">
        {steps.map((step, idx) => {
          const stepState = getStepState(idx, step.eventMatch);
          const matchedEvent = timeline.find(
            (e) => (e.message || "").toLowerCase().includes(step.eventMatch) || (e.details || "").toLowerCase().includes(step.eventMatch)
          );

          const timestamp = matchedEvent
            ? new Date(matchedEvent.timestamp || Date.now()).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })
            : "--:--:--";

          return (
            <div key={step.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {stepState === "completed" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : stepState === "running" ? (
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                ) : stepState === "failed" ? (
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-[#64748b] light:text-[#94a3b8] flex-shrink-0" />
                )}
                <span
                  className={`font-medium ${
                    stepState === "completed"
                      ? "text-emerald-400 font-semibold"
                      : stepState === "running"
                      ? "text-blue-400 font-semibold"
                      : stepState === "failed"
                      ? "text-red-400 font-semibold"
                      : "text-[#94a3b8] light:text-[#64748b]"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#64748b] light:text-[#94a3b8]">
                {stepState !== "pending" ? timestamp : "-"}
              </span>
            </div>
          );
        })}
      </div>

      {isFixing && (
        <div className="mt-3 pt-2 border-t border-[#1e293b] light:border-[#e2e8f0]">
          <div className="w-full py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-center text-[11px] font-bold rounded-lg">
            Agent Executing Active Remediation Loop
          </div>
        </div>
      )}
    </div>
  );
}
