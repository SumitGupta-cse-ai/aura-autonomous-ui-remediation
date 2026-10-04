"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  Scan,
  AlertCircle,
  Wrench,
  FileText,
  History,
  ExternalLink,
  BookOpen,
  HelpCircle,
  Sparkles,
  ChevronRight,
  X,
} from "lucide-react";

interface SidebarProps {
  unresolvedCount?: number;
  fixedCount?: number;
  onNewScanClick?: () => void;
  onDemoClick?: () => void;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  unresolvedCount = 0,
  fixedCount = 0,
  onNewScanClick,
  onDemoClick,
  mobileOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/",
      active: pathname === "/",
    },
    {
      label: "New Scan",
      icon: Scan,
      action: onNewScanClick,
      active: false,
    },
    {
      label: "Issues",
      icon: AlertCircle,
      href: "#issues-section",
      badge: unresolvedCount > 0 ? unresolvedCount : undefined,
      badgeColor: "bg-red-500/20 text-red-400 border border-red-500/30",
    },
    {
      label: "Fixes",
      icon: Wrench,
      href: "#issues-section",
      badge: fixedCount > 0 ? fixedCount : undefined,
      badgeColor: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    },
    {
      label: "Reports",
      icon: FileText,
      href: "#report-section",
    },
    {
      label: "History",
      icon: History,
      href: "#history",
    },
  ];

  const quickLinks = [
    { label: "Demo Website", icon: ExternalLink, onClick: onDemoClick },
    { label: "Sample Reports", icon: FileText, href: "#report-section" },
    { label: "How It Works", icon: HelpCircle, href: "#how-it-works" },
    { label: "Documentation", icon: BookOpen, href: "#docs" },
  ];

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full">
      {/* Top Branding & Main Nav */}
      <div className="p-4 flex flex-col gap-6 overflow-y-auto">
        {/* Brand Logo & Close button for mobile */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-3 px-2 py-1 group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/30 transition-all aura-glow-sm">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                AURA
              </span>
              <span className="text-[10px] text-[#94a3b8] font-medium leading-none">
                Autonomous UI Remediation
              </span>
            </div>
          </Link>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#16202c]"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <div className="flex flex-col gap-1">
          <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">
            Navigation
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;

            if (item.action) {
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    item.action?.();
                    onClose?.();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-[#94a3b8] hover:text-white hover:bg-[#16202c] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-[#64748b] group-hover:text-emerald-400 transition-colors" />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            }

            return (
              <a
                key={item.label}
                href={item.href || "#"}
                onClick={onClose}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                  item.active
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold"
                    : "text-[#94a3b8] hover:text-white hover:bg-[#16202c]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      item.active
                        ? "text-emerald-400"
                        : "text-[#64748b] group-hover:text-white"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </div>

        {/* Quick Links Section */}
        <div className="flex flex-col gap-1 pt-2 border-t border-[#1e293b]">
          <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">
            Quick Links
          </span>
          {quickLinks.map((link) => {
            const Icon = link.icon;
            if (link.onClick) {
              return (
                <button
                  key={link.label}
                  onClick={() => {
                    link.onClick?.();
                    onClose?.();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[#94a3b8] hover:text-white hover:bg-[#16202c] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-3.5 h-3.5 text-[#64748b] group-hover:text-emerald-400 transition-colors" />
                    <span>{link.label}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-[#64748b] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            }
            return (
              <a
                key={link.label}
                href={link.href || "#"}
                onClick={onClose}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[#94a3b8] hover:text-white hover:bg-[#16202c] transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-3.5 h-3.5 text-[#64748b] group-hover:text-emerald-400 transition-colors" />
                  <span>{link.label}</span>
                </div>
                <ChevronRight className="w-3 h-3 text-[#64748b] opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            );
          })}
        </div>
      </div>

      {/* Bottom Inclusive Banner Card */}
      <div className="p-4 border-t border-[#1e293b]">
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#13231c] to-[#0f1a26] border border-emerald-500/20 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center gap-2 mb-1.5 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Inclusive Web Agent</span>
          </div>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            AURA finds, fixes, and verifies accessibility issues automatically using AI.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#0d151e] border-r border-[#1e293b] flex-col justify-between h-screen sticky top-0 flex-shrink-0 z-30 select-none">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Panel */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          {/* Slide-out drawer */}
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#0d151e] border-r border-[#1e293b] flex flex-col z-50 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
