// AURA API Client

import type {
  ScanResponse,
  ScanData,
  FixResult,
  ScanReport,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API Error: ${res.status}`);
  }
  return res.json();
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

export async function getIssueDiff(scanId: string, issueId: string): Promise<{ diff: string; has_diff: boolean }> {
  return apiFetch<{ diff: string; has_diff: boolean }>(`/api/scan/${scanId}/diff/${issueId}`);
}

export function getSandboxUrl(scanId: string): string {
  return `${API_BASE}/sandbox/${scanId}`;
}

export function getDownloadPatchUrl(scanId: string): string {
  return `${API_BASE}/api/scan/${scanId}/download`;
}

export function getDownloadReportUrl(scanId: string): string {
  return `${API_BASE}/api/scan/${scanId}/report/download`;
}

export { API_BASE };
