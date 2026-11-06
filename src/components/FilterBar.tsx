import React from 'react';
import { Download, FileSpreadsheet, Filter, Search, X } from 'lucide-react';
import { ExportFormat } from '../types';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  courierFilter: string;
  onCourierFilterChange: (val: string) => void;
  availableCouriers: string[];
  totalFilteredCount: number;
  totalCount: number;
  onExport: (format: ExportFormat) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  courierFilter,
  onCourierFilterChange,
  availableCouriers,
  totalFilteredCount,
  totalCount,
  onExport,
}) => {
  const tabs = [
    { id: 'ALL', label: 'Semua Pesanan' },
    { id: 'BERUBAH', label: 'Status/Resi Berubah' },
    { id: 'TETAP', label: 'Tetap' },
    { id: 'BARU', label: 'Pesanan Baru' },
    { id: 'DIBATALKAN', label: 'Batal / Retur' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3.5">
      {/* Top Row: Search & Export */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari No. Pesanan, No. Resi, Pembeli, atau Produk..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Courier Filter & Export Actions */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Courier Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={courierFilter}
              onChange={(e) => onCourierFilterChange(e.target.value)}
              className="py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-orange-500"
            >
              <option value="ALL">Semua Kurir / Opsi Kirim</option>
              {availableCouriers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Export Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onExport('xlsx')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-xs"
              title="Ekspor hasil rekonsiliasi ke Excel (.xlsx) dengan kolom audit lengkap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => onExport('csv')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              title="Ekspor hasil rekonsiliasi ke format CSV (.csv)"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Status Filter Tabs & Row Counter */}
      <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {tabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onStatusFilterChange(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
          Menampilkan <span className="font-semibold text-slate-800">{totalFilteredCount}</span> dari{' '}
          <span className="font-semibold text-slate-800">{totalCount}</span> pesanan
        </div>
      </div>
    </div>
  );
};
