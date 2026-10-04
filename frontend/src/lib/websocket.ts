// AURA WebSocket Client for real-time agent timeline events

import type { TimelineEvent } from './types';
import { getApiBase } from './api';

export function resolveWsBase(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL.replace(/\/+$/, '');
  }

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
): WebSocket {
  const wsBase = resolveWsBase();
  const ws = new WebSocket(`${wsBase}/ws/scan/${scanId}`);

  ws.onopen = () => {
    console.log(`[AURA WS] Connected to scan ${scanId}`);
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
        console.error('[AURA WS] Error:', data.message);
      }
    } catch (e) {
      console.error('[AURA WS] Failed to parse message:', e);
    }
  };

  ws.onerror = (error) => {
    console.error('[AURA WS] WebSocket error:', error);
    onError?.(error);
  };

  ws.onclose = () => {
    console.log(`[AURA WS] Disconnected from scan ${scanId}`);
    onClose?.();
  };

  return ws;
}
