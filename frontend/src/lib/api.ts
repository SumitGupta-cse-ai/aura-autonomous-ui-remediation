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
  // 1. Explicit local backend request via query param or localStorage
  if (typeof window !== 'undefined') {
    if (window.location.search.includes('backend=local') || localStorage.getItem('aura_api_base') === 'local') {
      return 'http://localhost:8000';
    }
  }

  // 2. Check environment variables
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL;
  if (envUrl && envUrl.trim() && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 3. UNIVERSAL DEFAULT: Always connect to live Render backend
  // Ensures zero "Failed to fetch" errors whether running on Vercel, Netlify, or local dev
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

export function getDownloadReportUrl(scanId: string): string {
  return `${getApiBase()}/api/scan/${scanId}/report/download`;
}
