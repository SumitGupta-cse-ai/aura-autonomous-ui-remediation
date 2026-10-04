// AURA WebSocket Client for real-time agent timeline events

import type { TimelineEvent } from './types';

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export function connectScanWebSocket(
  scanId: string,
  onEvent: (event: TimelineEvent) => void,
  onStatusChange?: (status: string) => void,
  onError?: (error: Event) => void,
  onClose?: () => void
): WebSocket {
  const ws = new WebSocket(`${WS_BASE}/ws/scan/${scanId}`);

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
