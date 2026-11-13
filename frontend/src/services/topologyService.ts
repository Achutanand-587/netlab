import { api, del, get, post } from './api';

export type DeviceKind = 'pc' | 'router' | 'switch' | 'server' | 'hub';

export interface TopologyNode {
  id: string;
  label: string;
  kind: DeviceKind;
  x: number;
  y: number;
  ip?: string;
  mask?: string;
  gateway?: string;
}

export interface TopologyLink {
  id?: number;
  source: string;
  target: string;
  latency_ms: number;
  loss_pct: number;
  status: 'up' | 'down';
}

export interface TopologySummary {
  id: number;
  name: string;
  description: string;
  updated_at: string;
}

export interface TopologyDetail {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  nodes: TopologyNode[];
  links: TopologyLink[];
}

export interface PathHop {
  hop: number;
  from: string;
  to: string;
  link_id: number;
  latency_ms: number;
  cumulative_latency_ms: number;
  event: 'forward' | 'deliver' | string;
}

export interface SimulationResult {
  source: string;
  target: string;
  protocol: string;
  size_bytes: number;
  delivered: boolean;
  reason: string;
  path: string[];
  hops: PathHop[];
  total_latency_ms: number | null;
  delivery_probability: number;
  connectivity: {
    connected: boolean;
    component_count: number;
    components: string[][];
    isolated_nodes: string[];
  };
}

export interface PredefinedTemplate {
  name: string;
  description: string;
  category: string;
  nodes: TopologyNode[];
  links: TopologyLink[];
}

export const PREDEFINED_TEMPLATES: PredefinedTemplate[] = [
  {
    name: 'Basic LAN Network',
    category: 'Local Area Network',
    description: 'Two computers communicating within the same local subnet via an unmanaged Layer-2 switch.',
    nodes: [
      { id: 'pc1', label: 'Workstation 1', kind: 'pc', x: 140, y: 220, ip: '192.168.1.10', mask: '255.255.255.0' },
      { id: 'sw1', label: 'LAN Switch', kind: 'switch', x: 380, y: 220 },
      { id: 'pc2', label: 'Workstation 2', kind: 'pc', x: 620, y: 220, ip: '192.168.1.20', mask: '255.255.255.0' },
    ],
    links: [
      { source: 'pc1', target: 'sw1', latency_ms: 1.0, loss_pct: 0.0, status: 'up' },
      { source: 'sw1', target: 'pc2', latency_ms: 1.0, loss_pct: 0.0, status: 'up' },
    ],
  },
  {
    name: 'Star Network Topology',
    category: 'LAN Architecture',
    description: 'Centralized star topology where all hosts and servers radiate from a central core switch.',
    nodes: [
      { id: 'sw1', label: 'Core Switch', kind: 'switch', x: 380, y: 240 },
      { id: 'pc1', label: 'Engineering PC', kind: 'pc', x: 160, y: 110, ip: '10.0.1.10', mask: '255.255.255.0' },
      { id: 'pc2', label: 'Finance PC', kind: 'pc', x: 600, y: 110, ip: '10.0.1.20', mask: '255.255.255.0' },
      { id: 'pc3', label: 'HR Workstation', kind: 'pc', x: 160, y: 370, ip: '10.0.1.30', mask: '255.255.255.0' },
      { id: 'srv1', label: 'Intranet Server', kind: 'server', x: 600, y: 370, ip: '10.0.1.100', mask: '255.255.255.0' },
    ],
    links: [
      { source: 'pc1', target: 'sw1', latency_ms: 1.0, loss_pct: 0.0, status: 'up' },
      { source: 'pc2', target: 'sw1', latency_ms: 1.0, loss_pct: 0.0, status: 'up' },
      { source: 'pc3', target: 'sw1', latency_ms: 1.0, loss_pct: 0.0, status: 'up' },
      { source: 'srv1', target: 'sw1', latency_ms: 0.5, loss_pct: 0.0, status: 'up' },
    ],
  },
  {
    name: 'Router-to-Router Inter-Network',
    category: 'Wide Area Network (WAN)',
    description: 'Two separate LAN subnets connected via a WAN point-to-point link between two routing gateways.',
    nodes: [
      { id: 'pc1', label: 'Site A Client', kind: 'pc', x: 100, y: 240, ip: '192.168.10.5', mask: '255.255.255.0', gateway: '192.168.10.1' },
      { id: 'r1', label: 'Site A Gateway', kind: 'router', x: 280, y: 240, ip: '192.168.10.1' },
      { id: 'r2', label: 'Site B Gateway', kind: 'router', x: 500, y: 240, ip: '10.10.0.1' },
      { id: 'pc2', label: 'Site B Client', kind: 'pc', x: 680, y: 240, ip: '10.10.0.5', mask: '255.255.255.0', gateway: '10.10.0.1' },
    ],
    links: [
      { source: 'pc1', target: 'r1', latency_ms: 2.0, loss_pct: 0.0, status: 'up' },
      { source: 'r1', target: 'r2', latency_ms: 15.0, loss_pct: 1.0, status: 'up' },
      { source: 'r2', target: 'pc2', latency_ms: 2.0, loss_pct: 0.0, status: 'up' },
    ],
  },
  {
    name: 'Small Office Enterprise (SOHO)',
    category: 'Enterprise Network',
    description: 'Office network featuring local desktop workstations, an edge router, and a DMZ application server.',
    nodes: [
      { id: 'pc1', label: 'Office PC 1', kind: 'pc', x: 120, y: 150, ip: '172.16.1.10', mask: '255.255.255.0' },
      { id: 'pc2', label: 'Office PC 2', kind: 'pc', x: 120, y: 330, ip: '172.16.1.11', mask: '255.255.255.0' },
      { id: 'sw1', label: 'Office Switch', kind: 'switch', x: 320, y: 240 },
      { id: 'r1', label: 'Edge Router', kind: 'router', x: 500, y: 240, ip: '172.16.1.1' },
      { id: 'srv1', label: 'App Server', kind: 'server', x: 680, y: 240, ip: '203.0.113.80' },
    ],
    links: [
      { source: 'pc1', target: 'sw1', latency_ms: 1.0, loss_pct: 0.0, status: 'up' },
      { source: 'pc2', target: 'sw1', latency_ms: 1.0, loss_pct: 0.0, status: 'up' },
      { source: 'sw1', target: 'r1', latency_ms: 1.0, loss_pct: 0.0, status: 'up' },
      { source: 'r1', target: 'srv1', latency_ms: 8.0, loss_pct: 0.0, status: 'up' },
    ],
  },
  {
    name: 'Multi-Router Redundant Mesh',
    category: 'Dynamic Routing & Failover',
    description: 'Demonstrates Dijkstra shortest path selection and failover. Path 1 has low latency (3ms); Path 2 is redundant (12ms). Disable Path 1 to see instant reroute!',
    nodes: [
      { id: 'src_host', label: 'Origin Host', kind: 'pc', x: 80, y: 240, ip: '192.168.1.10' },
      { id: 'r_ingress', label: 'Ingress Router', kind: 'router', x: 260, y: 240, ip: '10.0.0.1' },
      { id: 'r_primary', label: 'Primary Hop (Fast)', kind: 'router', x: 440, y: 130, ip: '10.0.1.1' },
      { id: 'r_backup', label: 'Backup Hop (Slow)', kind: 'router', x: 440, y: 350, ip: '10.0.2.1' },
      { id: 'r_egress', label: 'Egress Router', kind: 'router', x: 620, y: 240, ip: '10.0.3.1' },
      { id: 'dst_host', label: 'Target Server', kind: 'server', x: 780, y: 240, ip: '198.51.100.25' },
    ],
    links: [
      { source: 'src_host', target: 'r_ingress', latency_ms: 1.0, loss_pct: 0.0, status: 'up' },
      { source: 'r_ingress', target: 'r_primary', latency_ms: 2.0, loss_pct: 0.0, status: 'up' },
      { source: 'r_primary', target: 'r_egress', latency_ms: 2.0, loss_pct: 0.0, status: 'up' },
      { source: 'r_ingress', target: 'r_backup', latency_ms: 12.0, loss_pct: 0.0, status: 'up' },
      { source: 'r_backup', target: 'r_egress', latency_ms: 12.0, loss_pct: 0.0, status: 'up' },
      { source: 'r_egress', target: 'dst_host', latency_ms: 1.0, loss_pct: 0.0, status: 'up' },
    ],
  },
];

export const topologyService = {
  /** Stateless simulation: runs BFS connectivity and Dijkstra shortest path */
  simulateStateless: async (
    nodes: TopologyNode[],
    links: TopologyLink[],
    source: string,
    target: string,
    sizeBytes = 64,
    protocol = 'ICMP'
  ): Promise<SimulationResult> => {
    return post<SimulationResult>('/topology/simulate', {
      nodes: nodes.map(n => ({
        id: n.id,
        label: n.label,
        kind: n.kind,
        x: n.x,
        y: n.y,
      })),
      links: links.map(l => ({
        source: l.source,
        target: l.target,
        latency_ms: l.latency_ms,
        loss_pct: l.loss_pct,
        status: l.status,
      })),
      source,
      target,
      size_bytes: sizeBytes,
      protocol,
    });
  },

  /** Lists saved topologies stored in SQLite */
  listTopologies: async (): Promise<TopologySummary[]> => {
    return get<TopologySummary[]>('/topology');
  },

  /** Fetches a saved topology by database ID */
  getTopology: async (id: number): Promise<TopologyDetail> => {
    return get<TopologyDetail>(`/topology/${id}`);
  },

  /** Persists a new topology configuration to SQLite */
  createTopology: async (
    name: string,
    description: string,
    nodes: TopologyNode[],
    links: TopologyLink[]
  ): Promise<TopologyDetail> => {
    return post<TopologyDetail>('/topology', {
      name,
      description,
      nodes: nodes.map(n => ({
        id: n.id,
        label: n.label,
        kind: n.kind,
        x: n.x,
        y: n.y,
      })),
      links: links.map(l => ({
        source: l.source,
        target: l.target,
        latency_ms: l.latency_ms,
        loss_pct: l.loss_pct,
        status: l.status,
      })),
    });
  },

  /** Deletes a saved topology from SQLite */
  deleteTopology: async (id: number): Promise<void> => {
    await del(`/topology/${id}`);
  },
};
