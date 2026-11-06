import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Columns,
  Copy,
  ExternalLink,
  Eye,
  Filter,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { AuditRecord } from '../types';
import { detectCourier, getTrackingUrl } from '../utils/courierUtils';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AuditRecord | null;
  allChangedRecords?: AuditRecord[];
  onSelectRecord?: (record: AuditRecord) => void;
  oldFileName?: string;
  newFileName?: string;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  onClose,
  record,
  allChangedRecords = [],
  onSelectRecord,
  oldFileName = 'File Master Lama',
  newFileName = 'File Update Terbaru',
}) => {
  if (!isOpen || !record) return null;

  const [onlyChanged, setOnlyChanged] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  // Compute union of all columns between old and new row
  const comparisonRows = useMemo(() => {
    const oldRow = record.rawOldRow || {};
    const newRow = record.rawNewRow || {};

    const allKeys = Array.from(
      new Set([...Object.keys(oldRow), ...Object.keys(newRow)])
    ).filter((k) => !k.startsWith('[Audit]')); // Exclude internal generated audit keys from raw comparison

    return allKeys.map((key) => {
      const oldVal = oldRow[key];
      const newVal = newRow[key];

      const oldValStr = oldVal !== null && oldVal !== undefined ? String(oldVal).trim() : '';
      const newValStr = newVal !== null && newVal !== undefined ? String(newVal).trim() : '';

      const isChanged = oldValStr.toLowerCase() !== newValStr.toLowerCase();
      const isOnlyInOld = oldVal !== undefined && newVal === undefined;
      const isOnlyInNew = oldVal === undefined && newVal !== undefined;

      return {
        key,
        oldVal: oldValStr,
        newVal: newValStr,
        isChanged,
        isOnlyInOld,
        isOnlyInNew,
      };
    });
  }, [record]);

  // Filter rows based on search and "only changed" toggle
  const filteredRows = useMemo(() => {
    return comparisonRows.filter((row) => {
      if (onlyChanged && !row.isChanged && !row.isOnlyInOld && !row.isOnlyInNew) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchKey = row.key.toLowerCase().includes(q);
        const matchOld = row.oldVal.toLowerCase().includes(q);
        const matchNew = row.newVal.toLowerCase().includes(q);
        if (!matchKey && !matchOld && !matchNew) return false;
      }

      return true;
    });
  }, [comparisonRows, onlyChanged, searchTerm]);

  const totalDifferences = useMemo(() => {
    return comparisonRows.filter((r) => r.isChanged || r.isOnlyInOld || r.isOnlyInNew).length;
  }, [comparisonRows]);

  // Navigation between changed records
  const currentIndex = allChangedRecords.findIndex((r) => r.orderId === record.orderId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allChangedRecords.length - 1;

  const handlePrev = () => {
    if (hasPrev && onSelectRecord) {
      onSelectRecord(allChangedRecords[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onSelectRecord) {
      onSelectRecord(allChangedRecords[currentIndex + 1]);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const courier = detectCourier(record.courier, record.newTrackingNumber);
  const trackingUrl = getTrackingUrl(record.newTrackingNumber, record.courier);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                <Columns className="w-3.5 h-3.5" />
                Komparasi Detail Berdampingan
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-medium">
                {record.changeType}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold font-mono text-slate-900 tabular-nums">
                {record.orderId}
              </h3>
              <button
                onClick={() => handleCopy(record.orderId)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
                title="Salin Nomor Pesanan"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Quick Navigator & Close */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {allChangedRecords.length > 1 && (
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs mr-1">
                <button
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                    hasPrev
                      ? 'text-slate-700 hover:bg-slate-100'
                      : 'text-slate-300 cursor-not-allowed'
                  }`}
                  title="Pesanan Sebelumnya yang Berubah"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono text-slate-500 px-1.5">
                  {currentIndex + 1} / {allChangedRecords.length}
                </span>
                <button
                  onClick={handleNext}
                  disabled={!hasNext}
                  className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                    hasNext
                      ? 'text-slate-700 hover:bg-slate-100'
                      : 'text-slate-300 cursor-not-allowed'
                  }`}
                  title="Pesanan Berikutnya yang Berubah"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status & Resi Visual Highlight Strip */}
        <div className="bg-slate-100/70 border-b border-slate-200 px-6 py-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Status Change Card */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Perubahan Status Pesanan
            </span>
            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 line-through">
                {record.oldStatus || '(Kosong)'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {record.newStatus}
              </span>
            </div>
          </div>

          {/* Tracking Number Change Card */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Nomor Resi & Ekspedisi
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${courier.bgColor} ${courier.color}`}>
                {courier.name}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-100 text-slate-500 border border-slate-200">
                {record.oldTrackingNumber || '(Belum Ada)'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {record.newTrackingNumber || '(Belum Ada)'}
                </span>
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    title="Lacak resi langsung di website ekspedisi"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar: Search & Only Changed Toggle */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama kolom atau nilai..."
              className="w-full pl-9 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-orange-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700">
              <input
                type="checkbox"
                checked={onlyChanged}
                onChange={(e) => setOnlyChanged(e.target.checked)}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
              />
              <span className="font-medium">Hanya Tampilkan Kolom yang Berubah</span>
            </label>

            <span className="text-xs text-slate-500 font-mono tabular-nums bg-slate-100 px-2 py-1 rounded">
              {totalDifferences} perbedaan
            </span>
          </div>
        </div>

        {/* Side-by-Side Comparison Grid */}
        <div className="flex-1 overflow-y-auto">
          {/* Table Headers */}
          <div className="sticky top-0 z-10 grid grid-cols-12 bg-slate-100/95 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider backdrop-blur-xs">
            <div className="col-span-4 px-4 py-2.5 border-r border-slate-200 truncate">
              Nama Kolom ({filteredRows.length})
            </div>
            <div className="col-span-4 px-4 py-2.5 border-r border-slate-200 truncate flex items-center justify-between">
              <span className="truncate">{oldFileName}</span>
              <span className="text-[10px] font-normal text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 shrink-0">
                Data Lama
              </span>
            </div>
            <div className="col-span-4 px-4 py-2.5 truncate flex items-center justify-between">
              <span className="truncate">{newFileName}</span>
              <span className="text-[10px] font-normal text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                Data Terbaru
              </span>
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100 text-xs">
            {filteredRows.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                Tidak ada kolom yang cocok dengan pencarian atau filter yang dipilih.
              </div>
            ) : (
              filteredRows.map((row) => {
                const hasDiff = row.isChanged || row.isOnlyInOld || row.isOnlyInNew;

                return (
                  <div
                    key={row.key}
                    className={`grid grid-cols-12 transition-colors ${
                      hasDiff
                        ? 'bg-amber-50/25 hover:bg-amber-50/40'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Column Name */}
                    <div className="col-span-4 px-4 py-2.5 border-r border-slate-200 flex items-center justify-between gap-1 overflow-hidden">
                      <span className="font-medium text-slate-800 text-[11px] truncate" title={row.key}>
                        {row.key}
                      </span>
                      {hasDiff && (
                        <span className="text-[9px] font-bold text-orange-700 bg-orange-100/80 px-1.5 py-0.2 rounded shrink-0">
                          Berubah
                        </span>
                      )}
                    </div>

                    {/* Old Value */}
                    <div
                      className={`col-span-4 px-4 py-2.5 border-r border-slate-200 break-all select-all font-mono text-[11px] ${
                        row.isChanged
                          ? 'bg-rose-50/50 text-rose-900 font-medium'
                          : row.isOnlyInOld
                          ? 'bg-rose-50/30 text-rose-800 font-medium'
                          : 'text-slate-600'
                      }`}
                    >
                      {row.isOnlyInNew ? (
                        <span className="text-slate-400 italic font-sans text-[11px]">
                          (Tidak ada di file lama)
                        </span>
                      ) : row.oldVal ? (
                        row.oldVal
                      ) : (
                        <span className="text-slate-400 italic font-sans text-[11px]">
                          (Kosong)
                        </span>
                      )}
                    </div>

                    {/* New Value */}
                    <div
                      className={`col-span-4 px-4 py-2.5 break-all select-all font-mono text-[11px] ${
                        row.isChanged
                          ? 'bg-blue-50/60 text-blue-900 font-bold'
                          : row.isOnlyInNew
                          ? 'bg-emerald-50/50 text-emerald-900 font-bold'
                          : 'text-slate-600'
                      }`}
                    >
                      {row.isOnlyInOld ? (
                        <span className="text-slate-400 italic font-sans text-[11px]">
                          (Tidak ada di file update)
                        </span>
                      ) : row.newVal ? (
                        row.newVal
                      ) : (
                        <span className="text-slate-400 italic font-sans text-[11px]">
                          (Kosong)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-100 border border-rose-300 inline-block" />
              Nilai Lama
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-300 inline-block" />
              Nilai Terkini
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-2xs"
          >
            Tutup Komparasi
          </button>
        </div>
      </div>
    </div>
  );
};
