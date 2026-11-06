import React, { useState } from 'react';
import { CheckCircle2, Download, Eye, EyeOff, FileSpreadsheet, FileText, Filter, ScanBarcode, Search, X } from 'lucide-react';
import { ExportFormat } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';

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
  onScanResi?: (scannedText: string) => void;
  onlyMatched?: boolean;
  onToggleOnlyMatched?: () => void;
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
  onScanResi,
  onlyMatched = false,
  onToggleOnlyMatched,
}) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const tabs = [
    { id: 'ALL', label: 'Semua Pesanan' },
    { id: 'BERUBAH', label: 'Status/Resi Berubah' },
    { id: 'TETAP', label: 'Tetap' },
    { id: 'BARU', label: 'Pesanan Baru' },
    { id: 'TIDAK_DITEMUKAN', label: 'Tidak di Update' },
    { id: 'DIBATALKAN', label: 'Batal / Retur' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3.5">
      {/* Top Row: Search & Export */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input with Integrated Scan Resi Button */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari No. Pesanan, No. Resi, Pembeli, atau Produk..."
            className="w-full pl-9 pr-28 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
          />

          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchTerm && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="text-slate-400 hover:text-slate-600 p-1"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-md transition-colors shadow-2xs whitespace-nowrap"
              title="Scan Barcode Resi via Kamera atau Foto"
            >
              <ScanBarcode className="w-3.5 h-3.5 text-orange-600" />
              <span className="hidden sm:inline">Scan Resi</span>
            </button>
          </div>
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
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => onExport('pdf')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-xs"
              title="Ekspor laporan audit & ringkasan statistik ke format dokumen PDF (.pdf)"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>Ekspor PDF (.pdf)</span>
            </button>

            <button
              onClick={() => onExport('xlsx')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-xs"
              title="Ekspor hasil rekonsiliasi ke Excel (.xlsx) dengan kolom audit lengkap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel (.xlsx)</span>
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

      {/* Bottom Row: Status Filter Tabs, Toggle Filter & Row Counter */}
      <div className="pt-2.5 border-t border-slate-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
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

        {/* Right side: Toggle Filter & Counter */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end flex-wrap">
          {onToggleOnlyMatched && (
            <button
              type="button"
              onClick={onToggleOnlyMatched}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                onlyMatched
                  ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Aktifkan untuk menyembunyikan data lama yang tidak ditemukan di file update terbaru"
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${onlyMatched ? 'text-amber-700' : 'text-slate-400'}`} />
              <span>Hanya Data Cocok / Terupdate</span>
              {onlyMatched && (
                <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-1 rounded">
                  Aktif
                </span>
              )}
            </button>
          )}

          <div className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
            Menampilkan <span className="font-semibold text-slate-800">{totalFilteredCount}</span> dari{' '}
            <span className="font-semibold text-slate-800">{totalCount}</span> pesanan
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal (Web API) */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(code) => {
          if (onScanResi) {
            onScanResi(code);
          } else {
            onSearchChange(code);
          }
        }}
      />
    </div>
  );
};
