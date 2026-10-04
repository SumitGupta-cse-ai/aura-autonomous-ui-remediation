"use client";

import React, { useRef, useEffect } from "react";
import { Activity, CheckCircle2, Clock, AlertTriangle, XCircle, ArrowRight, ShieldCheck } from "lucide-react";
import type { TimelineEvent } from "@/lib/types";
import { formatTimestamp, formatDuration } from "@/lib/utils";

interface AgentTimelineProps {
  timeline: TimelineEvent[];
  status?: string;
}

export function AgentTimeline({ timeline, status }: AgentTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest event
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [timeline]);

  return (
    <div id="agent-timeline" className="bg-[#0f1720] border border-[#1e293b] rounded-xl p-4 overflow-hidden shadow-xl">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Agent Execution Timeline
          </h3>
          <span className="text-[11px] text-[#64748b]">
            ({timeline.length} real system events)
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#94a3b8]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-emerald-400">WebSocket Stream</span>
        </div>
      </div>

      {/* Horizontal Flow Container */}
      <div
        ref={containerRef}
        className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-[#1e293b]"
      >
        {timeline.length === 0 ? (
          <div className="py-4 text-center text-xs text-[#64748b] w-full flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-[#64748b]" />
            <span>Waiting for agent events... Start a scan or demo to see real-time execution.</span>
          </div>
        ) : (
          timeline.map((event, index) => {
            const isLast = index === timeline.length - 1;
            const eventConfig = getEventConfig(event.event_type, event.message);

            return (
              <React.Fragment key={event.id || index}>
                <div className="flex flex-col flex-shrink-0 min-w-[170px] max-w-[220px] p-3 rounded-lg bg-[#16202c] border border-[#1e293b] relative group hover:border-[#334155] transition-all">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${eventConfig.badge}`}>
                      {eventConfig.label}
                    </span>
                    <span className="text-[10px] text-[#64748b] font-mono">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-white line-clamp-1 mb-1">
                    {event.message}
                  </p>

                  {event.details && (
                    <p className="text-[10px] text-[#94a3b8] line-clamp-1 mb-1">
                      {event.details}
                    </p>
                  )}

                  {event.duration_ms != null && (
                    <span className="text-[9px] text-[#64748b] font-mono mt-auto">
                      Took {formatDuration(event.duration_ms)}
                    </span>
                  )}
                </div>

                {!isLast && (
                  <ArrowRight className="w-4 h-4 text-[#334155] flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}

function getEventConfig(type: string, message: string) {
  const msgLower = (message || "").toLowerCase();

  if (type === "error" || msgLower.includes("failed")) {
    return {
      label: "ERROR",
      badge: "bg-red-500/20 text-red-400 border border-red-500/30",
    };
  }
  if (msgLower.includes("verified")) {
    return {
      label: "VERIFIED",
      badge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    };
  }
  if (type === "success" || msgLower.includes("completed")) {
    return {
      label: "SUCCESS",
      badge: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
    };
  }
  if (type === "warning") {
    return {
      label: "WARNING",
      badge: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    };
  }
  if (type === "action") {
    return {
      label: "ACTION",
      badge: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    };
  }

  return {
    label: "INFO",
    badge: "bg-[#1e293b] text-[#94a3b8] border border-[#334155]",
  };
}
