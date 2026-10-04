"use client";

import React from "react";
import {
  Scan,
  AlertCircle,
  Wrench,
  FileText,
  ExternalLink,
  BookOpen,
  Sun,
  Moon,
} from "lucide-react";
import { ConnectionStatus } from "./ConnectionStatus";
import { useTheme } from "../theme/ThemeProvider";

interface TopHeaderProps {
  currentUrl?: string;
  onDemoClick?: () => void;
}

export function TopHeader({
  currentUrl,
  onDemoClick,
}: TopHeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 border-b border-[#1e293b] bg-[#0d151e]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20 select-none">
      {/* Quick Nav Pills */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
        <a
          href="#scanner"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-all"
        >
          <Scan className="w-3.5 h-3.5" />
          <span>Scan</span>
        </a>
        <a
          href="#issues-section"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16202c] border border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#334155] text-xs font-medium transition-all"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Issues</span>
        </a>
        <a
          href="#issues-section"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16202c] border border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#334155] text-xs font-medium transition-all"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Fixes</span>
        </a>
        <a
          href="#report-section"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16202c] border border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#334155] text-xs font-medium transition-all"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Reports</span>
        </a>
        <button
          onClick={onDemoClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16202c] border border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#334155] text-xs font-medium transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
          <span>Demo</span>
        </button>
        <a
          href="#docs"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16202c] border border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#334155] text-xs font-medium transition-all"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Docs</span>
        </a>
      </div>

      {/* Status & Profile Section */}
      <div className="flex items-center gap-3">
        {/* Stable Connection Status Component */}
        <ConnectionStatus />

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-[#16202c] border border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#334155] transition-all cursor-pointer"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-emerald-400" />
          )}
        </button>

        {/* User / Team Profile */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#16202c] border border-[#1e293b] text-xs font-medium text-white">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px]">
            WCC
          </div>
          <span className="hidden sm:inline">Hackathon Team</span>
        </div>
      </div>
    </header>
  );
}
