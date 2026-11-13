import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  Database,
  Gauge,
  Radio,
  Sliders,
} from 'lucide-react';
import { LiveMonitorSection } from '../components/bandwidth/LiveMonitorSection';
import { VirtualExperimentSection } from '../components/bandwidth/VirtualExperimentSection';
import { PcapBandwidthSection } from '../components/bandwidth/PcapBandwidthSection';
import { BandwidthEducationalSection } from '../components/bandwidth/BandwidthEducationalSection';

export default function BandwidthMonitor() {
  const [activeTab, setActiveTab] = useState<'live' | 'virtual' | 'pcap' | 'learn'>('live');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="text-cyan-400" size={24} />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Bandwidth & Throughput Monitor
            </h1>
            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
              Phase 6 Active
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Real-time interface telemetry, virtual transmission experiments, and imported PCAP throughput reconstruction.
          </p>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'live'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio size={14} />
            LIVE Monitoring
          </button>

          <button
            onClick={() => setActiveTab('virtual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'virtual'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders size={14} />
            VIRTUAL Experiments
          </button>

          <button
            onClick={() => setActiveTab('pcap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'pcap'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database size={14} />
            IMPORTED PCAP
          </button>

          <button
            onClick={() => setActiveTab('learn')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'learn'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen size={14} />
            Concepts & Calculator
          </button>
        </div>
      </div>

      {/* Tab 1: LIVE Real Network Monitoring */}
      {activeTab === 'live' && <LiveMonitorSection />}

      {/* Tab 2: VIRTUAL Simulated Bandwidth Experiments */}
      {activeTab === 'virtual' && <VirtualExperimentSection />}

      {/* Tab 3: IMPORTED PCAP Bandwidth Analysis */}
      {activeTab === 'pcap' && <PcapBandwidthSection />}

      {/* Tab 4: Educational Guide & Calculator */}
      {activeTab === 'learn' && <BandwidthEducationalSection />}
    </div>
  );
}
