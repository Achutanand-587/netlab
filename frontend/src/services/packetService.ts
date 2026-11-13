import { api, del, get, req, upload } from './api';

export interface CaptureInfo {
  id: number;
  filename: string;
  source: 'upload' | 'sample' | string;
  size_bytes: number;
  packet_count: number;
  created_at: string;
}

export interface SampleInfo {
  name: string;
  title: string;
}

export interface TopSource {
  ip: string;
  packets: number;
}

export interface CaptureStats {
  capture_id: number;
  filename: string;
  packet_count: number;
  total_bytes: number;
  duration_seconds: number;
  protocols: Record<string, number>;
  top_sources: TopSource[];
}

export interface PacketSummary {
  index: number;
  timestamp: number;
  timestamp_iso: string;
  src_ip: string | null;
  dst_ip: string | null;
  protocol: string;
  length: number;
  src_port: number | null;
  dst_port: number | null;
  tcp_flags: string[];
  status: 'ok' | 'handshake' | 'closing' | 'reset' | string;
  info: string;
}

export interface PacketDetail extends PacketSummary {
  ttl: number | null;
  headers: Record<string, Record<string, string>>;
}

export interface PaginatedPackets {
  items: PacketSummary[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface PacketQueryParams {
  page?: number;
  page_size?: number;
  protocol?: string | null;
  src_ip?: string | null;
  dst_ip?: string | null;
  status?: string | null;
  search?: string | null;
  sort?: 'index' | 'timestamp' | 'length' | 'protocol' | 'src_ip' | 'dst_ip';
  order?: 'asc' | 'desc';
}

export const packetService = {
  /** Uploads a .pcap / .pcapng / .cap capture file */
  uploadPCAP: async (file: File): Promise<CaptureInfo> => {
    const formData = new FormData();
    formData.append('file', file);
    return upload<CaptureInfo>('/packets/upload', formData);
  },

  /** Retrieves available synthetic sample PCAPs on the server */
  getSamples: async (): Promise<SampleInfo[]> => {
    return get<SampleInfo[]>('/packets/samples');
  },

  /** Loads a synthetic sample capture into the database */
  loadSample: async (sampleName: string): Promise<CaptureInfo> => {
    return req<CaptureInfo>(`/packets/samples/${encodeURIComponent(sampleName)}/load`, {
      method: 'POST',
    });
  },

  /** Lists all previously uploaded / loaded captures */
  getCaptures: async (): Promise<CaptureInfo[]> => {
    return get<CaptureInfo[]>('/packets/captures');
  },

  /** Retrieves metadata for a specific capture */
  getCapture: async (captureId: number): Promise<CaptureInfo> => {
    return get<CaptureInfo>(`/packets/captures/${captureId}`);
  },

  /** Deletes a capture and its parsed packets from SQLite */
  deleteCapture: async (captureId: number): Promise<void> => {
    await del(`/packets/captures/${captureId}`);
  },

  /** Gets high-level protocol and volume statistics for a capture */
  getCaptureStats: async (captureId: number): Promise<CaptureStats> => {
    return get<CaptureStats>(`/packets/captures/${captureId}/stats`);
  },

  /** Retrieves paginated and filtered packets */
  getPackets: async (
    captureId: number,
    params: PacketQueryParams = {}
  ): Promise<PaginatedPackets> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.page_size) searchParams.set('page_size', String(params.page_size));
    if (params.protocol) searchParams.set('protocol', params.protocol);
    if (params.src_ip) searchParams.set('src_ip', params.src_ip);
    if (params.dst_ip) searchParams.set('dst_ip', params.dst_ip);
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.order) searchParams.set('order', params.order);

    const queryString = searchParams.toString();
    const endpoint = `/packets/captures/${captureId}/packets${queryString ? `?${queryString}` : ''}`;
    return get<PaginatedPackets>(endpoint);
  },

  /** Retrieves deep packet inspection detail including all parsed protocol layers */
  getPacketDetail: async (captureId: number, index: number): Promise<PacketDetail> => {
    return get<PacketDetail>(`/packets/captures/${captureId}/packets/${index}`);
  },

  /** Returns absolute URL for CSV download of capture records */
  getExportCsvUrl: (captureId: number, protocol?: string | null, search?: string | null): string => {
    const searchParams = new URLSearchParams();
    if (protocol) searchParams.set('protocol', protocol);
    if (search) searchParams.set('search', search);
    const queryString = searchParams.toString();
    const base = api.getBaseUrl();
    return `${base}/packets/captures/${captureId}/export.csv${queryString ? `?${queryString}` : ''}`;
  },
};
