import { api, get, post } from './api';
import { PacketSummary } from './packetService';

export interface InterfaceInfo {
  id: string;
  name: string;
  description: string;
  ip: string | null;
  mac: string | null;
  is_wireless: boolean;
  is_loopback: boolean;
  status: 'up' | 'ready' | string;
}

export interface CaptureStartRequest {
  interface: string;
  bpf_filter?: string | null;
  packet_limit?: number;
}

export interface CaptureStartResponse {
  session_id: string;
  capture_id: number;
  interface: string;
  bpf_filter: string | null;
  packet_limit: number;
  status: string;
  started_at: string;
}

export interface CaptureStopResponse {
  session_id: string;
  capture_id: number;
  status: string;
  packet_count: number;
  total_bytes: number;
  duration_seconds: number;
}

export interface CaptureStatusResponse {
  is_running: boolean;
  session_id?: string | null;
  capture_id?: number | null;
  interface?: string | null;
  bpf_filter?: string | null;
  packet_count: number;
  total_bytes: number;
  duration_seconds: number;
  packet_limit: number;
}

export interface WebSocketStatusMessage {
  type: 'status';
  status: 'connected' | 'stopped' | 'error' | string;
  session_id?: string;
  interface?: string;
  packet_count?: number;
  total_bytes?: number;
  duration_seconds?: number;
  message?: string;
  reason?: string;
}

export interface WebSocketPacketMessage {
  type: 'packet';
  data: PacketSummary;
}

export type CaptureWebSocketMessage = WebSocketStatusMessage | WebSocketPacketMessage;

export const captureService = {
  /** Fetch all available network interfaces on the host */
  getInterfaces: async (): Promise<InterfaceInfo[]> => {
    return get<InterfaceInfo[]>('/capture/interfaces');
  },

  /** Start a new live packet capture session */
  startCapture: async (req: CaptureStartRequest): Promise<CaptureStartResponse> => {
    return post<CaptureStartResponse>('/capture/start', req);
  },

  /** Stop the running capture session */
  stopCapture: async (sessionId?: string): Promise<CaptureStopResponse> => {
    const endpoint = sessionId ? `/capture/${encodeURIComponent(sessionId)}/stop` : '/capture/stop';
    return post<CaptureStopResponse>(endpoint, {});
  },

  /** Get live capture status and stats */
  getStatus: async (sessionId?: string): Promise<CaptureStatusResponse> => {
    const endpoint = sessionId ? `/capture/status/${encodeURIComponent(sessionId)}` : '/capture/status';
    return get<CaptureStatusResponse>(endpoint);
  },

  /** Connect to the live capture WebSocket stream */
  connectWebSocket: (
    sessionId: string,
    callbacks: {
      onPacket?: (packet: PacketSummary) => void;
      onStatus?: (status: WebSocketStatusMessage) => void;
      onError?: (error: Event) => void;
      onClose?: (event: CloseEvent) => void;
    }
  ): WebSocket => {
    const baseUrl = api.getBaseUrl();
    const wsProto = baseUrl.startsWith('https') ? 'wss:' : 'ws:';
    const hostAndPath = baseUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProto}//${hostAndPath}/capture/ws/${encodeURIComponent(sessionId)}`;

    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as CaptureWebSocketMessage;
        if (msg.type === 'packet' && callbacks.onPacket) {
          callbacks.onPacket(msg.data);
        } else if (msg.type === 'status' && callbacks.onStatus) {
          callbacks.onStatus(msg);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message', err);
      }
    };

    if (callbacks.onError) socket.onerror = callbacks.onError;
    if (callbacks.onClose) socket.onclose = callbacks.onClose;

    return socket;
  },
};
