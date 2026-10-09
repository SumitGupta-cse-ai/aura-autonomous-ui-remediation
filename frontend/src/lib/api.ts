// AURA API Client

import type {
  ScanResponse,
  ScanData,
  FixResult,
  ScanReport,
} from './types';
import type { DemoSiteOption } from '@/components/dashboard/DemoSelectorModal';

export const PRODUCTION_API_URL = 'https://aura-autonomous-ui-remediation.onrender.com';

export function getApiBase(): string {
  // 1. Explicit override via query param or localStorage
  if (typeof window !== 'undefined') {
    if (window.location.search.includes('backend=remote') || localStorage.getItem('aura_api_base') === 'remote') {
      return PRODUCTION_API_URL;
    }
    if (window.location.search.includes('backend=local') || localStorage.getItem('aura_api_base') === 'local') {
      return 'http://localhost:8000';
    }
  }

  // 2. Explicit Environment variables (configured in deployment host or .env)
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 3. Browser local development or LAN device testing: connect to same host on backend port
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalNetwork =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.endsWith('.local');
    if (isLocalNetwork) {
      return `http://${host}:8000`;
    }
  }

  // 4. Default to live Render backend for production parity
  return PRODUCTION_API_URL;
}

export const API_BASE = PRODUCTION_API_URL;

async function apiFetch<T>(path: string, options?: RequestInit, retries = 3): Promise<T> {
  const base = getApiBase();
  const url = `${base}${path.startsWith('/') ? path : '/' + path}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        ...options,
      });
      if (!res.ok) {
        // If a newly created scan is being polled right away, handle 404 with progressive backoff retry
        if (res.status === 404 && path.startsWith('/api/scan/') && attempt < retries) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          continue;
        }
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || `API Error: ${res.status}`);
      }
      return await res.json();
    } catch (err: unknown) {
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error && (
          err.message.includes('fetch') ||
          err.message.includes('network') ||
          err.message.includes('Failed')
        ));

      if (attempt < retries && isNetworkError) {
        // Wait with progressive backoff (Render spin-up recovery)
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
        continue;
      }

      if (isNetworkError) {
        throw new Error(
          `Unable to connect to AURA Backend at ${base}. If Render was inactive, it may be waking up — please click "Scan Website" again in a few seconds.`
        );
      }
      throw err;
    }
  }
  throw new Error("Unable to connect to AURA API");
}

export async function startScan(url: string): Promise<ScanResponse> {
  return apiFetch<ScanResponse>('/api/scan', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export async function getScan(scanId: string): Promise<ScanData> {
  return apiFetch<ScanData>(`/api/scan/${scanId}`);
}

export async function getScans(): Promise<ScanData[]> {
  return apiFetch<ScanData[]>('/api/scans');
}

export async function fixIssue(
  scanId: string,
  issueId: string
): Promise<FixResult> {
  return apiFetch<FixResult>(`/api/scan/${scanId}/fix/${issueId}`, {
    method: 'POST',
  });
}

export async function fixAllIssues(scanId: string): Promise<FixResult[]> {
  return apiFetch<FixResult[]>(`/api/scan/${scanId}/fix-all`, {
    method: 'POST',
  });
}

export async function applyPalette(
  scanId: string,
  paletteId: string
): Promise<{ success: boolean; palette_id: string; palette_name: string; sandbox_url?: string }> {
  return apiFetch<{ success: boolean; palette_id: string; palette_name: string; sandbox_url?: string }>(
    `/api/scan/${scanId}/palette/${paletteId}`,
    {
      method: 'POST',
    }
  );
}

export async function getScanReport(scanId: string): Promise<ScanReport> {
  return apiFetch<ScanReport>(`/api/scan/${scanId}/report`);
}

export async function getDemoSiteUrl(): Promise<{ url: string }> {
  return apiFetch<{ url: string }>('/api/demo-site-url');
}

export async function getDemoSites(): Promise<DemoSiteOption[]> {
  return apiFetch<DemoSiteOption[]>('/api/demo-sites');
}

export async function getIssueDiff(scanId: string, issueId: string): Promise<{ diff: string; has_diff: boolean }> {
  return apiFetch<{ diff: string; has_diff: boolean }>(`/api/scan/${scanId}/diff/${issueId}`);
}

export function getSandboxUrl(scanId: string): string {
  return `${getApiBase()}/sandbox/${scanId}`;
}

export function getDownloadPatchUrl(scanId: string): string {
  return `${getApiBase()}/api/scan/${scanId}/download`;
}

export function getExportWebsiteUrl(scanId: string): string {
  return `${getApiBase()}/api/scan/${scanId}/export/website`;
}

export async function applyBundle(
  scanId: string,
  bundleId: string
): Promise<{
  success: boolean;
  bundle_id: string;
  applied_count: number;
  total_count: number;
  message: string;
  sandbox_url?: string;
}> {
  return apiFetch<{
    success: boolean;
    bundle_id: string;
    applied_count: number;
    total_count: number;
    message: string;
    sandbox_url?: string;
  }>(`/api/scan/${scanId}/bundle/${bundleId}`, {
    method: 'POST',
  });
}

export async function rollbackScan(
  scanId: string
): Promise<{
  success: boolean;
  message: string;
  remaining_snapshots: number;
  sandbox_url?: string;
}> {
  return apiFetch<{
    success: boolean;
    message: string;
    remaining_snapshots: number;
    sandbox_url?: string;
  }>(`/api/scan/${scanId}/rollback`, {
    method: 'POST',
  });
}

export function getSandboxBeforeUrl(scanId: string): string {
  return `${getApiBase()}/sandbox/${scanId}/before`;
}

export function getSandboxAfterUrl(scanId: string): string {
  return `${getApiBase()}/sandbox/${scanId}/after`;
}

export function getSandboxPreviewUrl(scanId: string): string {
  return `${getApiBase()}/sandbox/${scanId}/preview`;
}

export function getSandboxShowChangesUrl(scanId: string): string {
  return `${getApiBase()}/sandbox/${scanId}/show-changes`;
}

export async function generatePreview(
  scanId: string,
  type: string,
  id: string
): Promise<import('./types').PreviewData> {
  return apiFetch<import('./types').PreviewData>(`/api/scan/${scanId}/preview`, {
    method: 'POST',
    body: JSON.stringify({ type, id }),
  });
}

export async function inspectElement(
  scanId: string,
  selector: string,
  elementText?: string,
  tag?: string
): Promise<import('./types').ElementInspectionData> {
  return apiFetch<import('./types').ElementInspectionData>(`/api/scan/${scanId}/inspect-element`, {
    method: 'POST',
    body: JSON.stringify({ selector, element_text: elementText || '', tag: tag || '' }),
  });
}

export async function askAura(
  scanId: string,
  question: string
): Promise<import('./types').AskAuraResponse> {
  return apiFetch<import('./types').AskAuraResponse>(`/api/scan/${scanId}/ask`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}

export async function getDesignVariants(
  scanId: string
): Promise<import('./types').DesignVariant[]> {
  return apiFetch<import('./types').DesignVariant[]>(`/api/scan/${scanId}/variants`);
}

export async function getVersionHistory(
  scanId: string
): Promise<import('./types').VersionHistoryItem[]> {
  return apiFetch<import('./types').VersionHistoryItem[]>(`/api/scan/${scanId}/versions`);
}

export async function restoreVersion(
  scanId: string,
  versionIndex: number
): Promise<{ success: boolean; version: number; message: string; sandbox_url?: string }> {
  return apiFetch(`/api/scan/${scanId}/restore/${versionIndex}`, {
    method: 'POST',
  });
}

export async function getHealthScores(
  scanId: string
): Promise<import('./types').EightDimensionScores> {
  return apiFetch<import('./types').EightDimensionScores>(`/api/scan/${scanId}/health-scores`);
}

export function getExportFixPackUrl(scanId: string): string {
  return `${getApiBase()}/api/scan/${scanId}/export/fix-pack`;
}

export function getDownloadReportUrl(scanId: string): string {
  return `${getApiBase()}/api/scan/${scanId}/report/download`;
}

/**
 * Perform safe binary download with proper blob handling,
 * error interception, Content-Disposition filename extraction, and DOM cleanup.
 */
export async function downloadBinaryFile(
  endpointPath: string,
  fallbackFilename: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const base = getApiBase();
    const url = `${base}${endpointPath.startsWith('/') ? endpointPath : '/' + endpointPath}`;
    const res = await fetch(url, {
      method: 'GET',
    });

    if (!res.ok) {
      let errorMsg = `Download failed (HTTP ${res.status})`;
      try {
        const errorJson = await res.json();
        errorMsg = errorJson.detail || errorMsg;
      } catch {
        const errorText = await res.text();
        if (errorText) errorMsg = errorText;
      }
      return { success: false, error: errorMsg };
    }

    // Determine filename from header if available
    let filename = fallbackFilename;
    const disposition = res.headers.get('content-disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename=["']?([^"';]+)["']?/);
      if (match && match[1]) {
        filename = match[1].trim();
      }
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function downloadFixedWebsite(scanId: string): Promise<{ success: boolean; error?: string }> {
  return downloadBinaryFile(`/api/scan/${scanId}/export/website`, `aura-fixed-website-${scanId}.zip`);
}

export async function downloadFixPack(scanId: string): Promise<{ success: boolean; error?: string }> {
  return downloadBinaryFile(`/api/scan/${scanId}/export/fix-pack`, `aura-fix-pack-${scanId}.zip`);
}

export async function downloadAuditReport(scanId: string): Promise<{ success: boolean; error?: string }> {
  return downloadBinaryFile(`/api/scan/${scanId}/report/download`, `AURA-Audit-Report-${scanId}.md`);
}

export interface GitHubPRPayload {
  repo: string;
  token?: string;
  base_branch?: string;
}

export interface GitHubPRResponse {
  success: boolean;
  is_simulation?: boolean;
  pr_url?: string;
  pr_number?: number;
  branch: string;
  title: string;
  body: string;
  git_instructions?: string[];
  verified_fixes_count?: number;
  error?: string;
}

export async function getGitHubStatus(scanId: string): Promise<{
  scan_id: string;
  can_create_pr: boolean;
  verified_count: number;
  suggested_branch: string;
  requires_verification: boolean;
}> {
  return apiFetch(`/api/scan/${scanId}/github/status`);
}

export async function createGitHubPullRequest(
  scanId: string,
  payload: GitHubPRPayload
): Promise<GitHubPRResponse> {
  return apiFetch<GitHubPRResponse>(`/api/scan/${scanId}/github/pr`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getOriginalWebsiteUrl(targetUrl?: string): string {
  if (!targetUrl) return '';
  const trimmed = targetUrl.trim();

  // Handle synthetic bundled demo URLs
  if (trimmed.includes('aura-bundled-demo.local')) {
    const match = trimmed.match(/demo-site\/(.+)$/);
    return match ? `/demo-site/${match[1]}` : '/demo-site/full_remediation.html';
  }

  // Handle fully qualified HTTP/HTTPS URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Handle relative demo paths consistently with root-relative leading slash
  const clean = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  if (clean.startsWith('demo-site/')) {
    return `/${clean}`;
  }
  return `/demo-site/${clean}`;
}

export async function fixBlockingIssues(scanId: string): Promise<any> {
  return apiFetch(`/api/scan/${scanId}/fix-blocking`, {
    method: 'POST',
  });
}

