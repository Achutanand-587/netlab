import { get } from './api';

export interface ProtocolSummary {
  name: string;
  title: string;
  description: string;
  step_count: number;
  full_name: string;
  layer: string;
  transport: string;
  port: string;
  purpose: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  real_world_example: string;
  sample_pcap_filter: string;
}

export interface ProtocolNode {
  id: string;
  label: string;
  kind: 'pc' | 'router' | 'server' | string;
  ip: string;
}

export interface ProtocolPacketInfo {
  src_ip: string;
  dst_ip: string;
  fields: Record<string, string | number | boolean>;
}

export interface ProtocolStep {
  index: number;
  from: string;
  to: string;
  via: string[];
  title: string;
  protocol: string;
  summary: string;
  explanation: string;
  packet: ProtocolPacketInfo;
}

export interface ProtocolDetail extends ProtocolSummary {
  educational: boolean;
  nodes: ProtocolNode[];
  steps: ProtocolStep[];
  key_observations?: string[];
}

export const protocolService = {
  /** List all 7 educational protocol definitions and metadata */
  listProtocols: async (): Promise<ProtocolSummary[]> => {
    return get<ProtocolSummary[]>('/protocols');
  },

  /** Get complete simulation flow, nodes, and steps for a specific protocol */
  getProtocol: async (name: string): Promise<ProtocolDetail> => {
    return get<ProtocolDetail>(`/protocols/${encodeURIComponent(name)}`);
  },
};
