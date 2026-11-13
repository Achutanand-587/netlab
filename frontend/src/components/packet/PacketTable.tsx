import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Eye, Filter, RefreshCw, Search } from 'lucide-react';
import { PacketQueryParams, PacketSummary } from '../../services/packetService';

interface PacketTableProps {
  packets: PacketSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  filters: PacketQueryParams;
  selectedPacketIndex: number | null;
  onFilterChange: (newFilters: Partial<PacketQueryParams>) => void;
  onSelectPacket: (index: number) => void;
  onResetFilters: () => void;
}

export const PacketTable: React.FC<PacketTableProps> = ({
  packets,
  total,
  page,
  pageSize,
  totalPages,
  loading,
  filters,
  selectedPacketIndex,
  onFilterChange,
  onSelectPacket,
  onResetFilters,
}) => {
  const getProtocolBadge = (protocol: string) => {
    const p = protocol.toUpperCase();
    if (p === 'TCP') return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    if (p === 'UDP') return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    if (p === 'ICMP') return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    if (p === 'DNS') return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    if (p === 'ARP') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  };

  const handleSort = (column: 'index' | 'timestamp' | 'length' | 'protocol' | 'src_ip' | 'dst_ip') => {
    if (filters.sort === column) {
      onFilterChange({ order: filters.order === 'asc' ? 'desc' : 'asc' });
    } else {
      onFilterChange({ sort: column, order: 'asc' });
    }
  };

  const renderSortIcon = (column: string) => {
    if (filters.sort !== column) return <ArrowUpDown size={12} className="opacity-30" />;
    return filters.order === 'desc' ? (
      <ArrowDown size={12} className="text-cyan-400" />
    ) : (
      <ArrowUp size={12} className="text-cyan-400" />
    );
  };

  return (
    <div className="card space-y-4 !p-0">
      {/* Control bar: Search, Filter dropdowns, Page size */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-white/10">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              className="input !py-1.5 pl-8 text-xs"
              placeholder="Search IP, protocol, info..."
              value={filters.search || ''}
              onChange={e => onFilterChange({ search: e.target.value || null, page: 1 })}
            />
          </div>

          {/* Protocol dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter size={13} />
            <select
              className="input !w-auto !py-1.5 text-xs font-mono"
              value={filters.protocol || ''}
              onChange={e => onFilterChange({ protocol: e.target.value || null, page: 1 })}
            >
              <option value="">All Protocols</option>
              <option value="TCP">TCP</option>
              <option value="UDP">UDP</option>
              <option value="ICMP">ICMP</option>
              <option value="DNS">DNS</option>
              <option value="ARP">ARP</option>
              <option value="IP">IP</option>
            </select>
          </div>

          {/* Status dropdown */}
          <select
            className="input !w-auto !py-1.5 text-xs font-mono"
            value={filters.status || ''}
            onChange={e => onFilterChange({ status: e.target.value || null, page: 1 })}
          >
            <option value="">All Statuses</option>
            <option value="handshake">Handshake (SYN)</option>
            <option value="closing">Closing (FIN)</option>
            <option value="reset">Reset (RST)</option>
            <option value="ok">Normal (OK)</option>
          </select>

          {(filters.search || filters.protocol || filters.status) && (
            <button
              className="btn-ghost !py-1 !px-2 text-xs text-cyan-400"
              onClick={onResetFilters}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Page size selector */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Rows per page:</span>
          <select
            className="input !w-auto !py-1 text-xs"
            value={pageSize}
            onChange={e => onFilterChange({ page_size: Number(e.target.value), page: 1 })}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50 font-mono text-slate-500 dark:border-white/10 dark:bg-navy-900/40">
              <th className="py-2.5 pl-4 pr-2">
                <button
                  className="flex items-center gap-1 font-semibold hover:text-cyan-400"
                  onClick={() => handleSort('index')}
                >
                  # {renderSortIcon('index')}
                </button>
              </th>
              <th className="px-2 py-2.5">
                <button
                  className="flex items-center gap-1 font-semibold hover:text-cyan-400"
                  onClick={() => handleSort('timestamp')}
                >
                  Time (s) {renderSortIcon('timestamp')}
                </button>
              </th>
              <th className="px-2 py-2.5">
                <button
                  className="flex items-center gap-1 font-semibold hover:text-cyan-400"
                  onClick={() => handleSort('src_ip')}
                >
                  Source {renderSortIcon('src_ip')}
                </button>
              </th>
              <th className="px-2 py-2.5">
                <button
                  className="flex items-center gap-1 font-semibold hover:text-cyan-400"
                  onClick={() => handleSort('dst_ip')}
                >
                  Destination {renderSortIcon('dst_ip')}
                </button>
              </th>
              <th className="px-2 py-2.5">
                <button
                  className="flex items-center gap-1 font-semibold hover:text-cyan-400"
                  onClick={() => handleSort('protocol')}
                >
                  Protocol {renderSortIcon('protocol')}
                </button>
              </th>
              <th className="px-2 py-2.5">
                <button
                  className="flex items-center gap-1 font-semibold hover:text-cyan-400"
                  onClick={() => handleSort('length')}
                >
                  Length {renderSortIcon('length')}
                </button>
              </th>
              <th className="px-2 py-2.5">Flags / Status</th>
              <th className="px-3 py-2.5">Info</th>
              <th className="py-2.5 pl-2 pr-4 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500 font-sans">
                  <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-cyan-400" />
                  Loading packets from database...
                </td>
              </tr>
            ) : packets.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500 font-sans">
                  No packets match the selected filters.
                </td>
              </tr>
            ) : (
              packets.map(pkt => {
                const isSelected = selectedPacketIndex === pkt.index;
                return (
                  <tr
                    key={pkt.index}
                    onClick={() => onSelectPacket(pkt.index)}
                    className={`cursor-pointer transition-colors hover:bg-cyan-500/5 ${
                      isSelected
                        ? 'bg-cyan-500/10 shadow-[inset_3px_0_0_#06b6d4]'
                        : ''
                    }`}
                  >
                    <td className="py-2.5 pl-4 pr-2 font-semibold text-slate-400">
                      {pkt.index}
                    </td>
                    <td className="px-2 py-2.5 text-slate-500" title={pkt.timestamp_iso}>
                      {pkt.timestamp.toFixed(4)}
                    </td>
                    <td className="px-2 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                      {pkt.src_ip || '—'}
                      {pkt.src_port ? (
                        <span className="text-slate-400">:{pkt.src_port}</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                      {pkt.dst_ip || '—'}
                      {pkt.dst_port ? (
                        <span className="text-slate-400">:{pkt.dst_port}</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2.5">
                      <span
                        className={`inline-block rounded border px-2 py-0.5 text-[11px] font-semibold ${getProtocolBadge(
                          pkt.protocol
                        )}`}
                      >
                        {pkt.protocol}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-slate-400">{pkt.length} B</td>
                    <td className="px-2 py-2.5">
                      {pkt.tcp_flags && pkt.tcp_flags.length > 0 ? (
                        <span className="rounded bg-navy-800/80 px-1.5 py-0.5 text-[11px] text-cyan-300 font-bold border border-cyan-500/20">
                          {pkt.tcp_flags.join(',')}
                        </span>
                      ) : pkt.status && pkt.status !== 'ok' ? (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-300 capitalize">
                          {pkt.status}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2.5 text-slate-600 dark:text-slate-300" title={pkt.info}>
                      {pkt.info || '—'}
                    </td>
                    <td className="py-2.5 pl-2 pr-4 text-right">
                      <button
                        className="btn-ghost !p-1 text-slate-400 hover:text-cyan-400"
                        onClick={e => {
                          e.stopPropagation();
                          onSelectPacket(pkt.index);
                        }}
                        aria-label={`Inspect packet ${pkt.index}`}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-xs text-slate-500 dark:border-white/10">
        <div>
          Showing{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {total > 0 ? (page - 1) * pageSize + 1 : 0}
          </span>{' '}
          to{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {Math.min(page * pageSize, total)}
          </span>{' '}
          of{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-200">{total}</span> packets
        </div>

        <div className="flex items-center gap-2">
          <button
            className="btn-ghost !p-1.5 disabled:opacity-30"
            disabled={page <= 1 || loading}
            onClick={() => onFilterChange({ page: page - 1 })}
            aria-label="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-mono text-xs text-slate-400">
            Page {page} of {totalPages || 1}
          </span>
          <button
            className="btn-ghost !p-1.5 disabled:opacity-30"
            disabled={page >= totalPages || loading}
            onClick={() => onFilterChange({ page: page + 1 })}
            aria-label="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
