import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Search,
  Truck,
  X,
} from 'lucide-react';
import { AuditRecord } from '../types';
import { detectCourier, getTrackingUrl } from '../utils/courierUtils';

interface OrderDetailsModalProps {
  record: AuditRecord | null;
  onClose: () => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ record, onClose }) => {
  if (!record) return null;

  const [colSearch, setColSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const courier = detectCourier(record.courier, record.newTrackingNumber);
  const trackingUrl = getTrackingUrl(record.newTrackingNumber, record.courier);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const rawColumns = Object.entries(record.allColumns || {}).filter(([key]) => {
    if (!colSearch) return true;
    return key.toLowerCase().includes(colSearch.toLowerCase()) ||
      String(record.allColumns[key]).toLowerCase().includes(colSearch.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-600">
                Rincian Pesanan & Audit Trail
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-mono">
                {record.updatedAt}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
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

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Audit Trail Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-600" />
              Riwayat Perubahan Status (Audit Log)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block mb-1">Status Pesanan:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {record.statusChanged ? (
                    <>
                      <span className="line-through text-slate-400">{record.oldStatus}</span>
                      <ArrowRight className="w-3 h-3 text-blue-500" />
                      <span className="font-bold text-blue-700">{record.newStatus}</span>
                    </>
                  ) : (
                    <span className="font-bold text-slate-800">{record.newStatus} (Tetap)</span>
                  )}
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block mb-1">Nomor Resi Pengiriman:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {record.newTrackingNumber && record.newTrackingNumber !== '-' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-900">
                        {record.newTrackingNumber}
                      </span>
                      {trackingUrl && (
                        <a
                          href={trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Belum Ada Resi</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 text-slate-600">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                <span>Kurir: <strong className="text-slate-800">{courier.name}</strong></span>
              </div>
              <div>
                <span>Jenis Perubahan: <strong className="text-slate-800">{record.changeType}</strong></span>
              </div>
            </div>
          </div>

          {/* All Columns Inspector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Semua Kolom Data Asli ({Object.keys(record.allColumns || {}).length} Kolom)
              </h4>

              {/* Column Filter */}
              <div className="relative max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={colSearch}
                  onChange={(e) => setColSearch(e.target.value)}
                  placeholder="Cari nama kolom..."
                  className="pl-7 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-orange-500"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs max-h-64 overflow-y-auto">
              {rawColumns.map(([colName, colVal]) => {
                const isAuditCol = colName.startsWith('[Audit]');
                return (
                  <div
                    key={colName}
                    className={`p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 hover:bg-slate-50 transition-colors ${
                      isAuditCol ? 'bg-orange-50/40 font-medium' : ''
                    }`}
                  >
                    <span className="text-slate-500 text-[11px] font-medium shrink-0 max-w-xs truncate">
                      {colName}
                    </span>
                    <span className="text-slate-900 text-xs font-mono select-all text-left sm:text-right break-all">
                      {colVal !== null && colVal !== undefined && colVal !== '' ? String(colVal) : '-'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Seluruh data kolom tetap utuh saat di-export kembali ke Excel.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
