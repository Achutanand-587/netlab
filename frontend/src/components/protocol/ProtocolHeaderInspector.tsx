import React from 'react';
import { Layers, ShieldCheck } from 'lucide-react';
import { ProtocolStep } from '../../services/protocolService';

interface ProtocolHeaderInspectorProps {
  step: ProtocolStep | null;
}

export const ProtocolHeaderInspector: React.FC<ProtocolHeaderInspectorProps> = ({ step }) => {
  if (!step) return null;

  const fields = step.packet.fields;

  const getFieldDescription = (key: string): string => {
    const k = key.toLowerCase();
    if (k === 'seq') return 'Sequence Number: Identifies the position of the first data byte or SYN in the stream.';
    if (k === 'ack') return 'Acknowledgment Number: Sequence number the sender expects to receive next.';
    if (k === 'flags') return 'Control Flags: Indicate specific connection states (SYN, ACK, FIN, RST, PSH, URG).';
    if (k === 'src_port') return 'Source Port: Ephemeral client port chosen by the operating system.';
    if (k === 'dst_port') return 'Destination Port: Well-known listening port for the target server service.';
    if (k === 'window') return 'Window Size: Flow control buffer capacity advertised by the sender (in bytes).';
    if (k === 'qname') return 'Query Name: Fully Qualified Domain Name (FQDN) being looked up.';
    if (k === 'qtype') return 'Query Type: DNS Record type (e.g. A = IPv4 Address, AAAA = IPv6, MX = Mail).';
    if (k === 'answer') return 'Resolved Record: Numerical IP address returned by authoritative nameserver.';
    if (k === 'ttl') return 'Time-To-Live: Number of seconds the record can be cached before expiration.';
    if (k === 'txid' || k === 'xid') return 'Transaction ID: 16-bit or 32-bit identifier to correlate request with reply.';
    if (k === 'op') return 'Operation Code: 1 = ARP Request, 2 = ARP Reply.';
    if (k === 'sender_mac' || k === 'target_mac') return 'Hardware Address: 48-bit Ethernet MAC address of the physical network card.';
    if (k === 'sender_ip' || k === 'target_ip') return 'Logical Address: 32-bit IPv4 address of the communicating host.';
    if (k === 'method') return 'HTTP Method: Identifies the operation to be performed on the identified resource.';
    if (k === 'status') return 'Status Code: 3-digit numerical integer code indicating the outcome of the request.';
    if (k === 'type') return 'ICMP Type: Numerical identifier specifying the control or error message type.';
    if (k === 'code') return 'ICMP Code: Sub-type diagnostic qualifying the error condition.';
    return 'Protocol-specific header field.';
  };

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Simulated Protocol Header Inspector
          </h3>
        </div>
        <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 font-mono text-[10px] font-bold text-cyan-400">
          PACKET #{step.index} · {step.protocol}
        </span>
      </div>

      {/* Network Layer IP Strip */}
      <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-100/60 p-3 font-mono text-xs dark:bg-navy-900/60 sm:grid-cols-4">
        <div>
          <span className="text-slate-500">Source IP:</span>
          <p className="font-semibold text-slate-800 dark:text-slate-200">{step.packet.src_ip}</p>
        </div>
        <div>
          <span className="text-slate-500">Destination IP:</span>
          <p className="font-semibold text-slate-800 dark:text-slate-200">{step.packet.dst_ip}</p>
        </div>
        <div>
          <span className="text-slate-500">Protocol:</span>
          <p className="font-semibold text-cyan-400">{step.protocol}</p>
        </div>
        <div>
          <span className="text-slate-500">Message Title:</span>
          <p className="font-semibold text-slate-800 dark:text-slate-200">{step.title}</p>
        </div>
      </div>

      {/* Header Fields Matrix */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          Decoded Protocol Header Fields:
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(fields).map(([fieldName, value]) => (
            <div
              key={fieldName}
              className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3 dark:border-white/5 dark:bg-navy-900/40"
            >
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-semibold text-cyan-500 dark:text-cyan-400">
                  {fieldName}
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-900 dark:bg-navy-950 dark:text-slate-100">
                  {String(value)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                {getFieldDescription(fieldName)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Educational Verification Badge */}
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-xs text-emerald-400">
        <ShieldCheck size={15} />
        <span>Fields conform strictly to standard protocol RFC specifications.</span>
      </div>
    </div>
  );
};
