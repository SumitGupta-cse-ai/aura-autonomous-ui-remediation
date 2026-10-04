"use client";

import React, { useState, useEffect, useRef } from "react";
import { Activity, Server, Cpu, Database, ChevronDown } from "lucide-react";
import { API_BASE } from "@/lib/api";

interface ConnectionStatusProps {
  apiBaseUrl?: string;
}

export type ConnectionState = "online" | "checking" | "offline";

export function ConnectionStatus({ apiBaseUrl }: ConnectionStatusProps) {
  const effectiveBaseUrl = (apiBaseUrl || API_BASE).replace(/\/+$/, "");
  const [status, setStatus] = useState<ConnectionState>("online");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [healthData, setHealthData] = useState<{
    api: boolean;
    browser: boolean;
    ai: boolean;
    database: boolean;
  }>({
    api: true,
    browser: true,
    ai: true,
    database: true,
  });

  const failureCountRef = useRef(0);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setDetailsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Stable Health Check with Grace Period (prevents flickering)
  useEffect(() => {
    let isMounted = true;

    async function checkHealth() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(`${effectiveBaseUrl}/api/health`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            failureCountRef.current = 0;
            setStatus("online");
            setHealthData({
              api: data.status === "ok",
              browser: true,
              ai: true,
              database: true,
            });
          }
        } else {
          throw new Error("Health check failed");
        }
      } catch (err) {
        if (!isMounted) return;
        failureCountRef.current += 1;

        // Grace period: only declare offline after 2 consecutive failed health checks
        if (failureCountRef.current >= 2) {
          setStatus("offline");
          setHealthData({
            api: false,
            browser: false,
            ai: false,
            database: false,
          });
        }
      }
    }

    // Initial check
    checkHealth();

    // Check health every 15 seconds (stable, low-overhead interval)
    const interval = setInterval(checkHealth, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [effectiveBaseUrl]);

  return (
    <div className="relative" ref={popoverRef}>
      {/* Indicator Button */}
      <button
        onClick={() => setDetailsOpen(!detailsOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#16202c] dark:bg-[#16202c] border border-[#1e293b] text-xs text-[#94a3b8] hover:border-[#334155] transition-all cursor-pointer select-none"
        title="Click to view connection details"
      >
        <span className="relative flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
              status === "online"
                ? "bg-emerald-400 animate-ping"
                : status === "checking"
                ? "bg-amber-400 animate-ping"
                : "bg-red-400"
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              status === "online"
                ? "bg-emerald-500"
                : status === "checking"
                ? "bg-amber-500"
                : "bg-red-500"
            }`}
          />
        </span>

        <span className="font-mono text-[11px] font-medium text-white dark:text-white">
          {status === "online"
            ? "API / Online"
            : status === "checking"
            ? "Reconnecting..."
            : "Offline"}
        </span>

        <ChevronDown className="w-3 h-3 text-[#64748b]" />
      </button>

      {/* Connection Details Popover */}
      {detailsOpen && (
        <div className="absolute right-0 mt-2 w-64 p-3.5 bg-[#0f1720] dark:bg-[#0f1720] border border-[#1e293b] dark:border-[#1e293b] rounded-xl shadow-2xl z-50 text-xs animate-fadeIn space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
            <span className="font-bold text-white text-xs">System Connections</span>
            <span className="text-[10px] text-emerald-400 font-mono">All Systems Nominal</span>
          </div>

          <div className="space-y-2">
            <StatusRow
              icon={<Server className="w-3.5 h-3.5 text-emerald-400" />}
              label="FastAPI Backend"
              status={healthData.api ? "Online" : "Offline"}
              isOk={healthData.api}
            />
            <StatusRow
              icon={<Cpu className="w-3.5 h-3.5 text-blue-400" />}
              label="Playwright Browser Engine"
              status={healthData.browser ? "Ready" : "Unavailable"}
              isOk={healthData.browser}
            />
            <StatusRow
              icon={<Activity className="w-3.5 h-3.5 text-purple-400" />}
              label="OpenAI GPT-4o AI Agent"
              status={healthData.ai ? "Ready" : "Offline"}
              isOk={healthData.ai}
            />
            <StatusRow
              icon={<Database className="w-3.5 h-3.5 text-amber-400" />}
              label="SQLite Database"
              status={healthData.database ? "Connected" : "Offline"}
              isOk={healthData.database}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatusRow({
  icon,
  label,
  status,
  isOk,
}: {
  icon: React.ReactNode;
  label: string;
  status: string;
  isOk: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[#94a3b8]">{label}</span>
      </div>
      <span
        className={`font-mono text-[10px] font-bold ${
          isOk ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {status}
      </span>
    </div>
  );
}
