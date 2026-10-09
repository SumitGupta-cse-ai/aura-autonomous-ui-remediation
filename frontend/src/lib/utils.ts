// AURA Utility Functions

import type { IssueSeverity, IssueStatus, VerificationStatus } from './types';
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function severityColor(severity: IssueSeverity): string {
  switch (severity) {
    case 'critical':
      return 'text-red-400 bg-red-400/10 border-red-400/30';
    case 'serious':
      return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
    case 'moderate':
      return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    case 'minor':
      return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
    default:
      return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
  }
}

export function severityDotColor(severity: IssueSeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-400';
    case 'serious':
      return 'bg-orange-400';
    case 'moderate':
      return 'bg-yellow-400';
    case 'minor':
      return 'bg-blue-400';
    default:
      return 'bg-gray-400';
  }
}

export function statusColor(status: IssueStatus): string {
  switch (status) {
    case 'fixed':
      return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
    case 'partially_fixed':
      return 'text-teal-400 bg-teal-400/10 border-teal-400/30';
    case 'source_required':
      return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/30';
    case 'third_party':
      return 'text-purple-400 bg-purple-400/10 border-purple-400/30';
    case 'blocked':
      return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
    case 'preview_ready':
      return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
    case 'applying':
    case 'verifying':
    case 'fixing':
      return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    case 'failed':
    case 'rolled_back':
    case 'verification_failed':
      return 'text-red-400 bg-red-400/10 border-red-400/30';
    case 'needs_review':
    case 'unverified':
      return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
    default:
      return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
  }
}

export function verificationColor(status: VerificationStatus): string {
  switch (status) {
    case 'verified':
      return 'text-emerald-400';
    case 'failed':
    case 'regression_detected':
      return 'text-red-400';
    case 'needs_review':
      return 'text-orange-400';
    default:
      return 'text-gray-400';
  }
}

export function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function truncateSelector(selector: string, maxLen = 50): string {
  if (selector.length <= maxLen) return selector;
  return selector.substring(0, maxLen) + '…';
}

export function truncateHtml(html: string, maxLen = 120): string {
  if (html.length <= maxLen) return html;
  return html.substring(0, maxLen) + '…';
}

export function severityLabel(severity: IssueSeverity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export function statusLabel(status: IssueStatus): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
