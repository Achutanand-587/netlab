import { api, get, post } from './api';

export interface LiveInterface {
  name: string;
  description: string;
  ip?: string | null;
  mac?: string | null;
  is_up: boolean;
  speed_mbps: number;
  mtu: number;
  is_wireless: boolean;
  bytes_sent: number;
  bytes_recv: number;
  packets_sent: number;
  packets_recv: number;
}

export interface LiveMetricPoint {
  time: number;
  timestamp: number;
  download_mbps: number;
  upload_mbps: number;
  total_recv_bytes: number;
  total_sent_bytes: number;
}

export interface LiveStatusResponse {
  active: boolean;
  session_id?: string | null;
  interface?: string | null;
  download_mbps: number;
  upload_mbps: number;
  total_recv_bytes: number;
  total_sent_bytes: number;
  avg_download_mbps: number;
  avg_upload_mbps: number;
  peak_download_mbps: number;
  peak_upload_mbps: number;
  duration_seconds: number;
  points: LiveMetricPoint[];
}

export interface VirtualExperimentParams {
  link_bandwidth_mbps: number;
  latency_ms: number;
  router_hops: number;
  protocol: 'TCP' | 'UDP';
  transfer_size_mb: number;
  packet_loss_pct: number;
}

export interface VirtualExperimentPoint {
  time_sec: number;
  throughput_mbps: number;
  cwnd_kb: number;
  cumulative_bytes: number;
  rtt_ms: number;
}

export interface VirtualExperimentResult {
  source: string;
  simulated: boolean;
  protocol: string;
  parameters: VirtualExperimentParams & { calculated_rtt_ms: number };
  summary: {
    configured_bandwidth_mbps: number;
    achieved_avg_throughput_mbps: number;
    efficiency_pct: number;
    duration_seconds: number;
    total_bytes: number;
    total_packets: number;
    retransmissions: number;
    explanation: string;
  };
  points: VirtualExperimentPoint[];
}

export interface ProtocolTrafficStats {
  protocol: string;
  packets: number;
  packet_pct: number;
  bytes: number;
  byte_pct: number;
  avg_packet_size: number;
}

export interface TalkerStats {
  ip: string;
  packets: number;
  bytes: number;
}

export interface ConversationStats {
  src: string;
  dst: string;
  protocol: string;
  packets: number;
  bytes: number;
}

export interface PcapTimePoint {
  timestamp: number;
  bytes: number;
  packets: number;
  throughput_bps: number;
  throughput_mbps: number;
  packets_per_sec: number;
}

export interface PcapAnalysisResult {
  source: string;
  simulated: boolean;
  filename: string;
  capture_id: number;
  summary: {
    total_bytes: number;
    total_packets: number;
    duration_seconds: number;
    avg_throughput_mbps: number;
    peak_throughput_mbps: number;
    avg_packet_size: number;
  };
  interval_seconds: number;
  points: PcapTimePoint[];
  protocols: ProtocolTrafficStats[];
  top_sources: TalkerStats[];
  top_destinations: TalkerStats[];
  conversations: ConversationStats[];
}

export interface CaptureSummaryItem {
  id: number;
  filename: string;
  packet_count: number;
  total_bytes: number;
  created_at: string;
}

export const bandwidthService = {
  /** 1. LIVE Network Interface Monitoring */
  getLiveInterfaces: async (): Promise<LiveInterface[]> => {
    return get<LiveInterface[]>('/bandwidth/live/interfaces');
  },

  startLiveMonitoring: async (interfaceName: string): Promise<LiveStatusResponse> => {
    return post<LiveStatusResponse>('/bandwidth/live/start', { interface: interfaceName });
  },

  stopLiveMonitoring: async (): Promise<LiveStatusResponse> => {
    return post<LiveStatusResponse>('/bandwidth/live/stop', {});
  },

  getLiveStatus: async (): Promise<LiveStatusResponse> => {
    return get<LiveStatusResponse>('/bandwidth/live/status');
  },

  connectLiveWebSocket: (callbacks: {
    onMetric?: (metric: LiveStatusResponse & { point?: LiveMetricPoint }) => void;
    onStatus?: (status: { type: string; status: string; session_id?: string }) => void;
    onError?: (err: Event) => void;
    onClose?: (event: CloseEvent) => void;
  }): WebSocket => {
    const baseUrl = api.getBaseUrl();
    const wsProto = baseUrl.startsWith('https') ? 'wss:' : 'ws:';
    const hostAndPath = baseUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProto}//${hostAndPath}/bandwidth/ws/live`;

    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'metric' && callbacks.onMetric) {
          callbacks.onMetric(data);
        } else if (data.type === 'status' && callbacks.onStatus) {
          callbacks.onStatus(data);
        }
      } catch (e) {
        console.error('Error parsing live bandwidth WebSocket frame:', e);
      }
    };

    if (callbacks.onError) socket.onerror = callbacks.onError;
    if (callbacks.onClose) socket.onclose = callbacks.onClose;

    return socket;
  },

  /** 2. VIRTUAL Bandwidth Simulation Experiments */
  runVirtualExperiment: async (
    params: VirtualExperimentParams
  ): Promise<VirtualExperimentResult> => {
    return post<VirtualExperimentResult>('/bandwidth/experiment', params);
  },

  /** 3. IMPORTED PCAP Bandwidth Analysis */
  listCaptures: async (): Promise<CaptureSummaryItem[]> => {
    return get<CaptureSummaryItem[]>('/packets/captures');
  },

  analyzePcap: async (
    captureId: number,
    intervalSeconds: number = 1.0
  ): Promise<PcapAnalysisResult> => {
    return get<PcapAnalysisResult>(
      `/bandwidth/captures/${captureId}/analysis?interval_seconds=${intervalSeconds}`
    );
  },
};
