import React, { useState } from 'react';
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock,
  Gauge,
  HelpCircle,
  Layers,
  Scale,
  Zap,
} from 'lucide-react';

export const BandwidthEducationalSection: React.FC = () => {
  // Interactive Calculator State
  const [calcBytesMb, setCalcBytesMb] = useState<number>(25);
  const [calcTimeSec, setCalcTimeSec] = useState<number>(4);

  const totalBits = calcBytesMb * 8 * 1e6; // bits
  const throughputMbps = calcTimeSec > 0 ? (calcBytesMb * 8) / calcTimeSec : 0;
  const throughputMBps = calcTimeSec > 0 ? calcBytesMb / calcTimeSec : 0;

  return (
    <div className="space-y-6">
      {/* Educational Header */}
      <div className="card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-cyan-400" />
          <h2 className="text-base font-bold text-slate-100">
            DCN Networking Fundamentals: Bandwidth, Throughput & Latency
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Core concepts, mathematical relationships, and practical realities governing data transmission across computer networks.
        </p>
      </div>

      {/* Concept Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* 1. Bandwidth vs Throughput */}
        <div className="card p-4 space-y-2 bg-slate-900/60 border-slate-800">
          <div className="flex items-center gap-2 font-semibold text-cyan-400">
            <Gauge size={16} /> Bandwidth vs. Throughput
          </div>
          <div className="text-slate-300 leading-relaxed text-[11px] space-y-2">
            <p>
              <strong>Bandwidth</strong> is the theoretical maximum rate at which data can be transferred across a communication channel. Think of it as the <em>width of a highway</em> (e.g., a 100 Mbps or 1 Gbps Ethernet link).
            </p>
            <p>
              <strong>Throughput</strong> is the actual volume of useful data delivered successfully per unit time. Think of it as the <em>actual flow of cars passing by</em>, which is constrained by traffic jams, protocol overhead, and stop lights.
            </p>
            <div className="rounded bg-slate-800/80 p-2 font-mono text-[10px] text-cyan-300">
              Throughput ≤ Bandwidth (Always bounded by physical channel capacity)
            </div>
          </div>
        </div>

        {/* 2. Mbps vs MB/s */}
        <div className="card p-4 space-y-2 bg-slate-900/60 border-slate-800">
          <div className="flex items-center gap-2 font-semibold text-blue-400">
            <Scale size={16} /> Mbps (Megabits) vs. MB/s (MegaBytes)
          </div>
          <div className="text-slate-300 leading-relaxed text-[11px] space-y-2">
            <p>
              A common source of confusion in networking:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong>Mbps (Megabits per second):</strong> Lowercase 'b'. Standard unit for network transmission speeds and Internet connection tiers.
              </li>
              <li>
                <strong>MB/s (MegaBytes per second):</strong> Uppercase 'B'. Standard unit for file sizes and storage transfer rates.
              </li>
            </ul>
            <div className="rounded bg-slate-800/80 p-2 font-mono text-[10px] text-blue-300">
              1 Byte = 8 bits  ⟹  1 MB/s = 8 Mbps (e.g., 100 Mbps connection transfers ~12.5 MB/s)
            </div>
          </div>
        </div>

        {/* 3. Latency & Round-Trip Time (RTT) */}
        <div className="card p-4 space-y-2 bg-slate-900/60 border-slate-800">
          <div className="flex items-center gap-2 font-semibold text-emerald-400">
            <Clock size={16} /> Latency & Round-Trip Time (RTT)
          </div>
          <div className="text-slate-300 leading-relaxed text-[11px] space-y-2">
            <p>
              <strong>Latency</strong> represents the total time required for a packet to travel from source to destination.
            </p>
            <p>
              Total Latency comprises 4 fundamental delay components:
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-400 font-mono text-[10px]">
              <li>d_prop: Propagation delay (distance / speed of light in medium)</li>
              <li>d_trans: Transmission delay (packet size L / link bandwidth R)</li>
              <li>d_queue: Router buffer queuing delay</li>
              <li>d_proc: Header processing & route lookup delay</li>
            </ul>
            <p>
              <strong>RTT (Round-Trip Time)</strong> is the elapsed duration for a packet to be sent plus the acknowledgment (ACK) to return.
            </p>
          </div>
        </div>

        {/* 4. Peak vs Average Throughput */}
        <div className="card p-4 space-y-2 bg-slate-900/60 border-slate-800">
          <div className="flex items-center gap-2 font-semibold text-amber-400">
            <Zap size={16} /> Peak Throughput vs. Average Throughput
          </div>
          <div className="text-slate-300 leading-relaxed text-[11px] space-y-2">
            <p>
              <strong>Peak Throughput:</strong> The highest momentary data transfer rate recorded within a single discrete measurement window (e.g., during a 1-second burst).
            </p>
            <p>
              <strong>Average Throughput:</strong> The total bytes transferred divided by the entire duration of the session:
            </p>
            <div className="rounded bg-slate-800/80 p-2 font-mono text-[10px] text-amber-300">
              Average Throughput = Total Transferred Bytes × 8 / Total Session Elapsed Seconds
            </div>
            <p>
              Due to TCP Slow Start and periodic ACK pauses, the average is always lower than the instantaneous peak.
            </p>
          </div>
        </div>
      </div>

      {/* Why is Actual Throughput Lower than Bandwidth? */}
      <div className="card p-4 space-y-3 bg-slate-900/80 border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <HelpCircle size={16} className="text-cyan-400" />
          Why Actual Throughput is Almost Always Lower than Link Bandwidth
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60">
            <span className="font-semibold text-cyan-300">1. Protocol Header Overhead</span>
            <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
              Every data frame carries encapsulation headers: Ethernet (14B), IP (20B), and TCP (20-32B). On a standard 1500-byte MTU, ~4-5% of line capacity is consumed by headers rather than user payload.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60">
            <span className="font-semibold text-blue-300">2. TCP Slow Start & Windowing</span>
            <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
              TCP begins with a small Congestion Window (cwnd) and must wait for ACKs over multiple RTTs before expanding to fill the pipe. When RTT is high, window expansion takes longer.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60">
            <span className="font-semibold text-purple-300">3. Packet Loss & Retransmissions</span>
            <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
              Even a tiny 1% packet loss causes TCP to cut its congestion window in half (Multiplicative Decrease) and retransmit dropped frames, significantly reducing sustained throughput.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Bandwidth Calculator */}
      <div className="card p-5 space-y-4 border-cyan-500/30 bg-gradient-to-br from-slate-900 to-navy-950">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Calculator size={18} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-100">
            Interactive Bandwidth & Throughput Calculator
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Inputs */}
          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <label className="font-medium">Data Transferred (MegaBytes):</label>
                <span className="font-mono text-cyan-400 font-bold">{calcBytesMb} MB</span>
              </div>
              <input
                type="range"
                min="1"
                max="500"
                step="1"
                value={calcBytesMb}
                onChange={(e) => setCalcBytesMb(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <label className="font-medium">Elapsed Transfer Time (Seconds):</label>
                <span className="font-mono text-cyan-400 font-bold">{calcTimeSec} seconds</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="60"
                step="0.5"
                value={calcTimeSec}
                onChange={(e) => setCalcTimeSec(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-800/80 font-mono text-[11px] text-slate-300 space-y-1">
              <div>Formula: Throughput (Mbps) = (Bytes × 8) ÷ (Time × 10⁶)</div>
              <div className="text-cyan-400">
                = ({calcBytesMb} MB × 8) ÷ {calcTimeSec}s
              </div>
            </div>
          </div>

          {/* Computed Results */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="card p-4 bg-slate-900 border-cyan-500/30">
              <span className="text-[10px] text-cyan-400 font-mono uppercase">Network Throughput</span>
              <div className="mt-2 text-2xl font-bold font-mono text-cyan-300">
                {throughputMbps.toFixed(2)}
              </div>
              <span className="text-xs text-slate-400">Mbps (Megabits/sec)</span>
            </div>

            <div className="card p-4 bg-slate-900 border-blue-500/30">
              <span className="text-[10px] text-blue-400 font-mono uppercase">File Download Rate</span>
              <div className="mt-2 text-2xl font-bold font-mono text-blue-300">
                {throughputMBps.toFixed(2)}
              </div>
              <span className="text-xs text-slate-400">MB/s (MegaBytes/sec)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
