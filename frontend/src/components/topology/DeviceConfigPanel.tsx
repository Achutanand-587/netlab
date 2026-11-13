import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Laptop,
  Network,
  Radio,
  Server,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { DeviceKind, TopologyLink, TopologyNode } from '../../services/topologyService';

interface DeviceConfigPanelProps {
  selectedNode: TopologyNode | null;
  selectedLink: TopologyLink | null;
  allNodes: TopologyNode[];
  onUpdateNode: (updated: Partial<TopologyNode>) => void;
  onDeleteNode: (id: string) => void;
  onUpdateLink: (updated: Partial<TopologyLink>) => void;
  onDeleteLink: (source: string, target: string) => void;
}

export const DeviceConfigPanel: React.FC<DeviceConfigPanelProps> = ({
  selectedNode,
  selectedLink,
  allNodes,
  onUpdateNode,
  onDeleteNode,
  onUpdateLink,
  onDeleteLink,
}) => {
  const isValidIp = (ip: string) => {
    if (!ip) return true; // Optional
    return /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(
      ip.trim()
    );
  };

  if (!selectedNode && !selectedLink) {
    return (
      <div className="card flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500">
        <Network size={28} className="text-slate-400 mb-2 opacity-50" />
        <p className="font-semibold text-slate-700 dark:text-slate-300">Nothing Selected</p>
        <p className="mt-1 max-w-[200px] text-slate-400">
          Click any device or connection line on the canvas to configure its properties.
        </p>
      </div>
    );
  }

  // Node Configuration Panel
  if (selectedNode) {
    const ipValid = isValidIp(selectedNode.ip || '');
    const gwValid = isValidIp(selectedNode.gateway || '');

    return (
      <div className="card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-500/15 text-cyan-400 font-bold">
              {selectedNode.kind === 'pc' && <Laptop size={15} />}
              {selectedNode.kind === 'server' && <Server size={15} />}
              {selectedNode.kind === 'router' && <Network size={15} />}
              {selectedNode.kind === 'switch' && <HardDrive size={15} />}
              {selectedNode.kind === 'hub' && <Radio size={15} />}
            </span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                {selectedNode.label}
              </h3>
              <p className="font-mono text-[10px] text-slate-400">ID: {selectedNode.id}</p>
            </div>
          </div>

          <button
            className="btn-ghost !p-1.5 text-rose-400 hover:bg-rose-500/10"
            onClick={() => onDeleteNode(selectedNode.id)}
            title="Delete this device"
            aria-label="Delete device"
          >
            <Trash2 size={15} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* Label Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Device Name / Label
            </label>
            <input
              type="text"
              className="input !py-1 text-xs"
              value={selectedNode.label}
              onChange={e => onUpdateNode({ label: e.target.value })}
            />
          </div>

          {/* Device Type */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Device Type
            </label>
            <select
              className="input !py-1 text-xs font-medium"
              value={selectedNode.kind}
              onChange={e => onUpdateNode({ kind: e.target.value as DeviceKind })}
            >
              <option value="pc">PC / Host Station (End Device)</option>
              <option value="server">Server (Application Host)</option>
              <option value="router">Router (Layer-3 Gateway)</option>
              <option value="switch">Switch (Layer-2 Bridge)</option>
              <option value="hub">Hub (Layer-1 Multi-port Repeater)</option>
            </select>
          </div>

          {/* IP Address */}
          <div className="space-y-1">
            <label className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              <span>IPv4 Address</span>
              {!ipValid && <span className="text-[10px] text-red-400">Invalid IP format</span>}
            </label>
            <input
              type="text"
              className={`input !py-1 font-mono text-xs ${
                !ipValid ? 'border-red-500 focus:ring-red-500' : ''
              }`}
              placeholder="e.g. 192.168.1.10"
              value={selectedNode.ip || ''}
              onChange={e => onUpdateNode({ ip: e.target.value })}
            />
          </div>

          {/* Subnet Mask */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Subnet Mask / Prefix
            </label>
            <input
              type="text"
              className="input !py-1 font-mono text-xs"
              placeholder="255.255.255.0 or /24"
              value={selectedNode.mask || ''}
              onChange={e => onUpdateNode({ mask: e.target.value })}
            />
          </div>

          {/* Default Gateway */}
          {selectedNode.kind !== 'switch' && selectedNode.kind !== 'hub' && (
            <div className="space-y-1">
              <label className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                <span>Default Gateway</span>
                {!gwValid && <span className="text-[10px] text-red-400">Invalid IP format</span>}
              </label>
              <input
                type="text"
                className={`input !py-1 font-mono text-xs ${
                  !gwValid ? 'border-red-500 focus:ring-red-500' : ''
                }`}
                placeholder="e.g. 192.168.1.1"
                value={selectedNode.gateway || ''}
                onChange={e => onUpdateNode({ gateway: e.target.value })}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Link Configuration Panel
  if (selectedLink) {
    const srcNode = allNodes.find(n => n.id === selectedLink.source);
    const dstNode = allNodes.find(n => n.id === selectedLink.target);
    const isUp = selectedLink.status === 'up';

    return (
      <div className="card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span
              className={`grid h-7 w-7 place-items-center rounded-lg font-bold ${
                isUp ? 'bg-cyan-500/15 text-cyan-400' : 'bg-rose-500/15 text-rose-400'
              }`}
            >
              {isUp ? <Network size={15} /> : <WifiOff size={15} />}
            </span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Connection Link
              </h3>
              <p className="font-mono text-[10px] text-slate-400">
                {srcNode?.label || selectedLink.source} ↔ {dstNode?.label || selectedLink.target}
              </p>
            </div>
          </div>

          <button
            className="btn-ghost !p-1.5 text-rose-400 hover:bg-rose-500/10"
            onClick={() => onDeleteLink(selectedLink.source, selectedLink.target)}
            title="Delete this connection link"
            aria-label="Delete link"
          >
            <Trash2 size={15} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* Link Status Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-white/5 dark:bg-navy-900/60">
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Link Operational State
              </span>
              <p className="text-[10px] text-slate-400">
                Toggle to simulate cable cuts or interface failure
              </p>
            </div>
            <button
              onClick={() => onUpdateLink({ status: isUp ? 'down' : 'up' })}
              className={`rounded-full px-3 py-1 font-mono text-xs font-bold transition ${
                isUp
                  ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30'
              }`}
            >
              {isUp ? 'ACTIVE (UP)' : 'FAILED (DOWN)'}
            </button>
          </div>

          {/* Latency (ms) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              <span>Link Latency (Propagation Delay)</span>
              <span className="font-mono text-cyan-400">{selectedLink.latency_ms} ms</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="50"
              step="0.5"
              className="w-full accent-cyan-500"
              value={selectedLink.latency_ms}
              onChange={e => onUpdateLink({ latency_ms: parseFloat(e.target.value) })}
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0.1 ms (LAN)</span>
              <span>25 ms</span>
              <span>50 ms (WAN)</span>
            </div>
          </div>

          {/* Packet Loss (%) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              <span>Packet Loss Probability</span>
              <span className="font-mono text-amber-400">{selectedLink.loss_pct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              className="w-full accent-amber-500"
              value={selectedLink.loss_pct}
              onChange={e => onUpdateLink({ loss_pct: parseFloat(e.target.value) })}
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0% (Clean)</span>
              <span>25%</span>
              <span>50% (Congested)</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
