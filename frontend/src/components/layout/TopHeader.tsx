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
  Menu,
  Shield,
  User,
} from "lucide-react";
import { ConnectionStatus } from "./ConnectionStatus";
import { useTheme } from "../theme/ThemeProvider";

interface TopHeaderProps {
  currentUrl?: string;
  onDemoClick?: () => void;
  onReportClick?: () => void;
  onDocsClick?: () => void;
  onToggleMobileMenu?: () => void;
}

export function TopHeader({
  currentUrl,
  onDemoClick,
  onReportClick,
  onDocsClick,
  onToggleMobileMenu,
}: TopHeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 border-b border-[#1e293b] bg-[#0d151e]/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 select-none">
      {/* Left: Mobile Hamburger & Quick Nav Pills */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg bg-[#16202c] border border-[#1e293b] text-[#94a3b8] hover:text-white transition-colors flex-shrink-0 cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5 text-emerald-400" />
        </button>

        {/* Mobile Brand Title (when sidebar is hidden) */}
        <div className="flex items-center gap-2 lg:hidden flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="font-bold text-sm text-white">AURA</span>
        </div>

        {/* Quick Nav Pills (Desktop & Tablet) */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <a
            href="#scanner"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-all flex-shrink-0"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Scan</span>
          </a>
          <a
            href="#issues-section"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16202c] border border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#334155] text-xs font-medium transition-all flex-shrink-0"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Issues</span>
          </a>
          <a
            href="#issues-section"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16202c] border border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#334155] text-xs font-medium transition-all flex-shrink-0"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Fixes</span>
          </a>
          <button
            onClick={onReportClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16202c] border border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#334155] text-xs font-medium transition-all flex-shrink-0 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Reports</span>
          </button>
          <button
            onClick={onDemoClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16202c] border border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#334155] text-xs font-medium transition-all flex-shrink-0 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span>Demo</span>
          </button>
          <button
            onClick={onDocsClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16202c] border border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#334155] text-xs font-medium transition-all flex-shrink-0 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>Docs</span>
          </button>
        </div>
      </div>

      {/* Right: Status & Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Connection Status */}
        <div className="hidden xs:block">
          <ConnectionStatus />
        </div>

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
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#16202c] border border-[#1e293b] text-xs font-medium text-white">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <User className="w-3 h-3 text-emerald-400" />
          </div>
          <span className="hidden md:inline">Hackathon Team</span>
        </div>
      </div>
    </header>
  );
}
