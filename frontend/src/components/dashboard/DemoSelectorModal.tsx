"use client";

import React from "react";
import {
  Eye,
  X,
  ShoppingBag,
  LayoutDashboard,
  FileCode,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { getApiBase } from "@/lib/api";

export interface DemoSiteOption {
  id: string;
  name: string;
  description: string;
  url: string;
  expected_issues: string;
  difficulty: string;
  demonstrates: string;
}

interface DemoSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  demos: DemoSiteOption[];
  onSelectDemo: (demoUrl: string) => void;
  loadingDemoId?: string | null;
}

export function DemoSelectorModal({
  isOpen,
  onClose,
  demos,
  onSelectDemo,
  loadingDemoId,
}: DemoSelectorModalProps) {
  if (!isOpen) return null;

  const base = getApiBase();

  const defaultDemos: DemoSiteOption[] = [
    {
      id: "full_remediation",
      name: "ShopX Full Remediation Demo",
      description: "Featured Judge Demo: Realistic ShopX e-commerce website with 7+ accessibility violations (missing lang, low contrast, unlabelled inputs, unlabelled icon buttons, missing image alt, heading hierarchy skip).",
      url: "demo-site/full_remediation.html",
      expected_issues: "7+ findings",
      difficulty: "Judge Demo",
      demonstrates: "Full closed-loop agent: Observe -> Reason -> Patch -> Sandbox -> Re-audit -> Verify",
    },
    {
      id: "demo1",
      name: "1. Accessibility Basics",
      description: "Standard WCAG accessibility violations (missing alt, no form labels, icon button missing name, heading order skip, low contrast).",
      url: "demo-site/demo1.html",
      expected_issues: "5-7 findings",
      difficulty: "Essential",
      demonstrates: "axe-core audit, DOM context analysis, alt-text patching, label association",
    },
    {
      id: "demo2",
      name: "2. E-Commerce Shop",
      description: "Realistic shopping page with product cards, category filters, search bar, and cart actions.",
      url: "demo-site/demo2.html",
      expected_issues: "6-8 findings",
      difficulty: "Intermediate",
      demonstrates: "Product image vision analysis, search label remediation, cart icon name generation",
    },
    {
      id: "demo3",
      name: "3. SaaS Dashboard",
      description: "Cloud infrastructure analytics dashboard with sidebar navigation, metric cards, and data table.",
      url: "demo-site/demo3.html",
      expected_issues: "5-7 findings",
      difficulty: "Advanced",
      demonstrates: "Table button ARIA labeling, dark theme contrast audit, avatar alt text fix",
    },
    {
      id: "clean_site",
      name: "4. Clean Website (Zero-Error Showcase)",
      description: "Apex Studio: Fully accessible, zero WCAG error modern website. Demonstrates Stage 2 AI Website Improvement Advisor, 9-dimension design assessment, and 4 authentic brand color palettes.",
      url: "demo-site/clean_site.html",
      expected_issues: "0 errors, 5 AI improvements",
      difficulty: "Zero-Error Showcase",
      demonstrates: "Zero Errors != Zero Value: AI Website Improvement Advisor & Brand Palettes",
    },
  ];

  const sourceList = demos.length > 0 ? demos : defaultDemos;
  const demoList = sourceList.map((d) => {
    let cleanUrl = d.url;
    if (cleanUrl.includes("demo-site/")) {
      cleanUrl = cleanUrl.substring(cleanUrl.indexOf("demo-site/"));
    } else if (cleanUrl.match(/^(demo[123]|full_remediation|clean_site)(\.html)?$/i)) {
      cleanUrl = `demo-site/${cleanUrl.endsWith(".html") ? cleanUrl : cleanUrl + ".html"}`;
    }
    return {
      ...d,
      url: cleanUrl,
    };
  });

  const icons: Record<string, React.ReactNode> = {
    full_remediation: <Sparkles className="w-5 h-5 text-emerald-400" />,
    demo1: <FileCode className="w-5 h-5 text-emerald-400" />,
    demo2: <ShoppingBag className="w-5 h-5 text-blue-400" />,
    demo3: <LayoutDashboard className="w-5 h-5 text-purple-400" />,
    clean_site: <Sparkles className="w-5 h-5 text-amber-400" />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn select-none">
      <div className="bg-[#0f1720] border border-[#1e293b] dark:bg-[#0f1720] dark:border-[#1e293b] rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#1e293b] flex items-center justify-between bg-[#0d151e]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Choose an Offline Demo Environment
              </h3>
              <p className="text-xs text-[#94a3b8]">
                100% local static HTML pages — zero internet connectivity required for hackathon testing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748b] hover:text-white hover:bg-[#16202c] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Cards Grid */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {demoList.map((demo) => {
            const isLoading = loadingDemoId === demo.id;

            return (
              <div
                key={demo.id}
                onClick={() => onSelectDemo(demo.url)}
                className="p-4 rounded-xl bg-[#16202c] border border-[#1e293b] hover:border-emerald-500/40 cursor-pointer transition-all flex flex-col gap-3 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#0b1117] border border-[#1e293b]">
                      {icons[demo.id] || <Eye className="w-5 h-5 text-emerald-400" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {demo.name}
                      </h4>
                      <span className="text-[11px] text-[#64748b]">
                        Expected: {demo.expected_issues}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {demo.difficulty}
                  </span>
                </div>

                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  {demo.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-[#1e293b]/60 text-[11px]">
                  <span className="text-[#64748b] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    {demo.demonstrates}
                  </span>

                  <button
                    disabled={isLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDemo(demo.url);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center gap-1 group-hover:aura-glow-sm cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Scan This Demo</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
