// AURA WebSocket Client for real-time agent timeline events

import type { TimelineEvent } from './types';
import { getApiBase } from './api';

export function resolveWsBase(): string {
  // 1. Explicit override via query param or localStorage
  if (typeof window !== 'undefined') {
    if (window.location.search.includes('backend=remote') || localStorage.getItem('aura_api_base') === 'remote') {
      return 'wss://aura-autonomous-ui-remediation.onrender.com';
    }
    if (window.location.search.includes('backend=local') || localStorage.getItem('aura_api_base') === 'local') {
      return 'ws://localhost:8000';
    }
  }

  // 2. Explicit Environment variables
  if (process.env.NEXT_PUBLIC_WS_URL) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL.trim().replace(/\/+$/, '');
    if (wsUrl) return wsUrl;
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
      return `ws://${host}:8000`;
    }
  }

  // 4. Derive from getApiBase()
  const base = getApiBase();
  if (base.startsWith('https://')) {
    return base.replace('https://', 'wss://');
  }

  if (base.startsWith('http://')) {
    return base.replace('http://', 'ws://');
  }

  return 'wss://aura-autonomous-ui-remediation.onrender.com';
}

export function connectScanWebSocket(
  scanId: string,
  onEvent: (event: TimelineEvent) => void,
  onStatusChange?: (status: string) => void,
  onError?: (error: Event) => void,
  onClose?: () => void
): WebSocket | null {
  if (!scanId) return null;

  try {
    const wsBase = resolveWsBase();
    const ws = new WebSocket(`${wsBase}/ws/scan/${scanId}`);

    ws.onopen = () => {
      console.log(`[AURA WS] Connected to scan ${scanId} at ${wsBase}`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'timeline_event') {
          onEvent(data.event as TimelineEvent);
        } else if (data.type === 'status_change') {
          onStatusChange?.(data.status);
        } else if (data.type === 'scan_complete') {
          onStatusChange?.('complete');
        } else if (data.type === 'error') {
          console.warn('[AURA WS] Notification:', data.message);
        }
      } catch (e) {
        console.warn('[AURA WS] Failed to parse message:', e);
      }
    };

    ws.onerror = (error) => {
      // Degrade gracefully to HTTP polling without unhandled UI errors
      console.warn(`[AURA WS] Notice: scan ${scanId} using HTTP polling fallback`);
      onError?.(error);
    };

    ws.onclose = () => {
      onClose?.();
    };

    return ws;
  } catch (err) {
    console.warn(`[AURA WS] Could not initialize WebSocket for scan ${scanId}:`, err);
    return null;
  }
}
