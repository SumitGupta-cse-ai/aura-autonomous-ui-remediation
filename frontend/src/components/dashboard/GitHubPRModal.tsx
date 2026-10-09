"use client";

import React, { useState } from "react";
import {
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  X,
  ShieldCheck,
  Lock,
  Terminal,
  Code2,
} from "lucide-react";
import { createGitHubPullRequest, GitHubPRResponse } from "@/lib/api";

interface GitHubPRModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanId: string;
  targetUrl?: string;
  verifiedCount: number;
}

export function GitHubPRModal({
  isOpen,
  onClose,
  scanId,
  targetUrl = "https://example.com",
  verifiedCount,
}: GitHubPRModalProps) {
  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [baseBranch, setBaseBranch] = useState("main");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GitHubPRResponse | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const defaultBranchName = `aura/remediation/${scanId.slice(0, 8)}`;

  async function handleCreatePR(e: React.FormEvent) {
    e.preventDefault();
    if (!repo.trim()) {
      setError("Please provide a repository name (e.g. owner/repo).");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await createGitHubPullRequest(scanId, {
        repo: repo.trim(),
        token: token.trim() || undefined,
        base_branch: baseBranch.trim() || "main",
      });
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create GitHub Pull Request";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function copyGitInstructions() {
    if (!result?.git_instructions) return;
    navigator.clipboard.writeText(result.git_instructions.join("\n"));
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f1720] border border-[#1e293b] rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-[#1e293b] flex items-center justify-between bg-[#16202c]/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <GitPullRequest className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Create GitHub Pull Request</h3>
              <p className="text-[11px] text-[#94a3b8]">Export verified remediation to your source repository</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#16202c] hover:bg-[#1e2d3d] text-[#94a3b8] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* Safety & Status Banner */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-[#cbd5e1] leading-relaxed">
              <span className="font-semibold text-emerald-300 block mb-0.5">
                Safe Branch Isolation Guaranteed
              </span>
              AURA never touches your default branch directly. Changes are committed to isolated branch{" "}
              <code className="text-emerald-300 font-mono bg-black/40 px-1 py-0.5 rounded">{defaultBranchName}</code> for developer review.
            </div>
          </div>

          {result ? (
            /* Success / PR Result View */
            <div className="space-y-4">
              <div className="bg-[#121c27] border border-emerald-500/30 rounded-xl p-4 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">
                  {result.is_simulation ? "Pull Request Payload Ready" : "Pull Request Created Successfully!"}
                </h4>
                <p className="text-[11px] text-[#94a3b8] max-w-md mx-auto">
                  {result.is_simulation
                    ? "A complete verified PR package and git patch have been compiled for your repository."
                    : `Pull Request #${result.pr_number} is open and ready for team review on GitHub.`}
                </p>

                {result.pr_url && (
                  <div className="pt-2">
                    <a
                      href={result.pr_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md transition-all text-xs"
                    >
                      <span>View Pull Request on GitHub</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Git CLI Instructions */}
              {result.git_instructions && (
                <div className="bg-[#0b1117] border border-[#1e293b] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#94a3b8] flex items-center gap-1 text-[11px]">
                      <Terminal className="w-3.5 h-3.5 text-blue-400" />
                      Command Line Integration:
                    </span>
                    <button
                      onClick={copyGitInstructions}
                      className="px-2 py-1 bg-[#16202c] hover:bg-[#1e2d3d] text-white rounded text-[10px] flex items-center gap-1 border border-[#1e293b]"
                    >
                      {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCmd ? "Copied" : "Copy Commands"}</span>
                    </button>
                  </div>
                  <pre className="p-2.5 bg-black/60 rounded-lg text-emerald-300 font-mono text-[10px] overflow-x-auto whitespace-pre">
                    {result.git_instructions.join("\n")}
                  </pre>
                </div>
              )}

              {/* PR Description Preview */}
              <div className="bg-[#0b1117] border border-[#1e293b] rounded-xl p-3 space-y-1">
                <span className="font-semibold text-[#94a3b8] flex items-center gap-1 text-[11px]">
                  <Code2 className="w-3.5 h-3.5 text-purple-400" />
                  Generated PR Title:
                </span>
                <p className="text-white font-mono text-[11px] bg-black/40 p-2 rounded border border-[#1e293b]">
                  {result.title}
                </p>
              </div>
            </div>
          ) : (
            /* Form View */
            <form onSubmit={handleCreatePR} className="space-y-3.5">
              {/* Target Repository */}
              <div>
                <label className="block text-[#94a3b8] font-semibold mb-1 text-[11px]">
                  GitHub Repository <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. acme-corp/storefront"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  className="w-full bg-[#0b1117] border border-[#1e293b] focus:border-purple-500 rounded-lg px-3 py-2 text-white text-xs outline-none transition-colors"
                  required
                />
                <span className="text-[10px] text-[#64748b] mt-0.5 block">Format: owner/repository-name</span>
              </div>

              {/* Base Branch */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#94a3b8] font-semibold mb-1 text-[11px]">
                    Base Branch
                  </label>
                  <input
                    type="text"
                    value={baseBranch}
                    onChange={(e) => setBaseBranch(e.target.value)}
                    placeholder="main"
                    className="w-full bg-[#0b1117] border border-[#1e293b] focus:border-purple-500 rounded-lg px-3 py-2 text-white text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#94a3b8] font-semibold mb-1 text-[11px]">
                    Remediation Branch
                  </label>
                  <input
                    type="text"
                    value={defaultBranchName}
                    disabled
                    className="w-full bg-[#121c27] border border-[#1e293b] rounded-lg px-3 py-2 text-[#94a3b8] font-mono text-[11px] cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Personal Access Token (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[#94a3b8] font-semibold text-[11px] flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" />
                    Personal Access Token (Optional)
                  </label>
                  <span className="text-[10px] text-amber-400 font-mono">Never stored</span>
                </div>
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (Leave blank for CLI preview)"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full bg-[#0b1117] border border-[#1e293b] focus:border-purple-500 rounded-lg px-3 py-2 text-white text-xs outline-none"
                />
                <span className="text-[10px] text-[#64748b] mt-0.5 block">
                  Required only for direct GitHub API write access. If omitted, AURA generates complete git CLI instructions & PR diff.
                </span>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Verified Fixes Count Badge */}
              <div className="bg-[#121c27] rounded-lg p-2.5 border border-[#1e293b] flex items-center justify-between">
                <span className="text-[#94a3b8]">Verified Fixes to Include:</span>
                <span className="font-bold text-emerald-400 font-mono">{verifiedCount} changes</span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 bg-[#16202c] hover:bg-[#1e2d3d] text-[#94a3b8] hover:text-white rounded-lg transition-colors font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || verifiedCount === 0}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-md transition-all flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Branch & PR...</span>
                    </>
                  ) : (
                    <>
                      <GitPullRequest className="w-3.5 h-3.5" />
                      <span>{token ? "Create Pull Request" : "Generate PR Package"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
