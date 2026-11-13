import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, Copy, Layers, ShieldCheck, X } from 'lucide-react';
import { PacketDetail } from '../../services/packetService';
import { toast } from '../Toaster';

interface PacketDetailsModalProps {
  packet: PacketDetail | null;
  totalPackets: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

export const PacketDetailsModal: React.FC<PacketDetailsModalProps> = ({
  packet,
  totalPackets,
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [copied, setCopied] = useState(false);
  const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({
    ethernet: true,
    ip: true,
    ipv6: true,
    tcp: true,
    udp: true,
    icmp: true,
    dns: true,
    arp: true,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !packet) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && packet.index > 0) onNavigate(packet.index - 1);
      if (e.key === 'ArrowRight' && packet.index < totalPackets - 1) onNavigate(packet.index + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, packet, totalPackets, onClose, onNavigate]);

  if (!isOpen || !packet) return null;

  const toggleLayer = (layerName: string) => {
    setExpandedLayers(prev => ({ ...prev, [layerName]: !prev[layerName] }));
  };

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(packet, null, 2)).then(() => {
      setCopied(true);
      toast('Packet JSON copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getProtocolBadge = (protocol: string) => {
    const p = protocol.toUpperCase();
    if (p === 'TCP') return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    if (p === 'UDP') return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    if (p === 'ICMP') return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    if (p === 'DNS') return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    if (p === 'ARP') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  };

  const layerTitles: Record<string, string> = {
    ethernet: 'Frame & Ethernet II (Data Link Layer)',
    arp: 'Address Resolution Protocol (ARP)',
    ip: 'Internet Protocol Version 4 (IPv4 - Network Layer)',
    ipv6: 'Internet Protocol Version 6 (IPv6 - Network Layer)',
    tcp: 'Transmission Control Protocol (TCP - Transport Layer)',
    udp: 'User Datagram Protocol (UDP - Transport Layer)',
    icmp: 'Internet Control Message Protocol (ICMP)',
    dns: 'Domain Name System (DNS - Application Layer)',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="card flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden !p-0 shadow-2xl ring-1 ring-white/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-white/10 dark:bg-navy-900/80">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-semibold text-cyan-400">
              Packet #{packet.index}
            </span>
            <span
              className={`rounded-md border px-2.5 py-0.5 text-xs font-semibold ${getProtocolBadge(
                packet.protocol
              )}`}
            >
              {packet.protocol}
            </span>
            {packet.status && packet.status !== 'ok' && (
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300 capitalize">
                {packet.status}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Stepper */}
            <div className="mr-2 flex items-center rounded-lg border border-slate-200 p-0.5 dark:border-white/10">
              <button
                className="btn-ghost !p-1.5 disabled:opacity-30"
                disabled={packet.index <= 0}
                onClick={() => onNavigate(packet.index - 1)}
                title="Previous Packet (Left Arrow)"
                aria-label="Previous Packet"
              >
                <ArrowLeft size={14} />
              </button>
              <span className="px-2 font-mono text-xs text-slate-400">
                {packet.index + 1} / {totalPackets}
              </span>
              <button
                className="btn-ghost !p-1.5 disabled:opacity-30"
                disabled={packet.index >= totalPackets - 1}
                onClick={() => onNavigate(packet.index + 1)}
                title="Next Packet (Right Arrow)"
                aria-label="Next Packet"
              >
                <ArrowRight size={14} />
              </button>
            </div>

            <button
              className="btn-ghost flex items-center gap-1.5 !px-2.5 !py-1.5 text-xs"
              onClick={copyJson}
              title="Copy raw JSON"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'JSON'}</span>
            </button>

            <button
              className="btn-ghost !p-1.5 text-slate-400 hover:text-white"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Summary Strip */}
        <div className="grid grid-cols-2 gap-3 border-b border-slate-200 bg-slate-100/50 px-6 py-3 text-xs dark:border-white/10 dark:bg-navy-950 sm:grid-cols-4">
          <div>
            <span className="text-slate-500">Source:</span>
            <p className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {packet.src_ip || '—'}
              {packet.src_port ? `:${packet.src_port}` : ''}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Destination:</span>
            <p className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {packet.dst_ip || '—'}
              {packet.dst_port ? `:${packet.dst_port}` : ''}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Length & TTL:</span>
            <p className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {packet.length} bytes {packet.ttl !== null ? `(TTL ${packet.ttl})` : ''}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Timestamp:</span>
            <p className="truncate font-mono font-medium text-slate-800 dark:text-slate-200" title={packet.timestamp_iso}>
              {packet.timestamp_iso ? packet.timestamp_iso.replace('T', ' ').replace('Z', ' UTC') : packet.timestamp.toFixed(4)}
            </p>
          </div>
        </div>

        {/* Content Body: Accordion Layers */}
        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          {packet.info && (
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs">
              <span className="font-semibold text-cyan-400">Protocol Summary: </span>
              <span className="font-mono text-slate-300">{packet.info}</span>
            </div>
          )}

          {packet.headers && Object.keys(packet.headers).length > 0 ? (
            Object.entries(packet.headers).map(([layerName, fields]) => {
              const isExpanded = expandedLayers[layerName] ?? true;
              const title = layerTitles[layerName] || `${layerName.toUpperCase()} Layer`;

              return (
                <div
                  key={layerName}
                  className="rounded-xl border border-slate-200 bg-white/50 dark:border-white/10 dark:bg-navy-900/50"
                >
                  <button
                    className="flex w-full items-center justify-between px-4 py-3 text-left font-medium transition hover:bg-slate-100/50 dark:hover:bg-white/5"
                    onClick={() => toggleLayer(layerName)}
                  >
                    <span className="flex items-center gap-2 text-sm text-cyan-400">
                      <Layers size={15} />
                      {title}
                    </span>
                    <span className="text-slate-400">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-200 px-4 py-3 dark:border-white/10">
                      <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                        {Object.entries(fields).map(([fieldName, val]) => (
                          <div
                            key={fieldName}
                            className="flex items-baseline justify-between rounded bg-slate-100/50 px-2.5 py-1.5 font-mono dark:bg-navy-950/60"
                          >
                            <span className="font-medium text-slate-500 dark:text-slate-400">
                              {fieldName}:
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {String(val)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Extra educational info for TCP flags */}
                      {layerName === 'tcp' && packet.tcp_flags && packet.tcp_flags.length > 0 && (
                        <div className="mt-3 rounded border border-cyan-500/20 bg-cyan-950/20 p-2 text-xs">
                          <span className="text-slate-400">Active TCP Flags: </span>
                          <span className="font-mono font-bold text-cyan-400">
                            {packet.tcp_flags.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">
              No detailed header layers extracted for this packet.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 dark:border-white/10 dark:bg-navy-900/60">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck size={14} className="text-cyan-400" />
            Verified via Scapy L2–L4 Dissection
          </span>
          <button className="btn !py-1.5 !px-4 text-xs" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
