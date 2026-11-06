import React, { useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  Info,
  PackageCheck,
  PackageOpen,
} from 'lucide-react';
import { AuditRecord } from '../types';
import { detectCourier, getTrackingUrl } from '../utils/courierUtils';

interface DataTableProps {
  records: AuditRecord[];
  onSelectRecord: (record: AuditRecord) => void;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  records,
  onSelectRecord,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Pagination calculation
  const totalPages = Math.ceil(records.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRecords = records.slice(startIndex, startIndex + pageSize);

  const getStatusBadgeClass = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('batal') || s.includes('cancel')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (s.includes('selesai') || s.includes('complete') || s.includes('delivered')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (s.includes('sedang dikirim') || s.includes('dikirim') || s.includes('transit')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (s.includes('perlu dikirim') || s.includes('diproses') || s.includes('menunggu')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getChangeTypeBadge = (record: AuditRecord) => {
    if (record.changeType === 'BARU') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          Pesanan Baru
        </span>
      );
    }
    if (record.changeType === 'BERUBAH') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          Update
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
        Tetap
      </span>
    );
  };

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <Info className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-900 mb-1">
          Tidak ada data pesanan yang cocok
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Coba ubah kata kunci pencarian atau ganti filter status untuk melihat data lainnya.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">No. Pesanan</th>
              <th className="py-3 px-4">Perubahan</th>
              <th className="py-3 px-4">Status Terkini & Riwayat</th>
              <th className="py-3 px-4">No. Resi & Kurir</th>
              <th className="py-3 px-4">Pembeli & Produk</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRecords.map((r) => {
              const courier = detectCourier(r.courier, r.newTrackingNumber);
              const trackingUrl = getTrackingUrl(r.newTrackingNumber, r.courier);

              return (
                <tr
                  key={r.orderId}
                  onClick={() => onSelectRecord(r)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  {/* Order ID */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-900 text-xs tabular-nums">
                        {r.orderId}
                      </span>
                      <button
                        onClick={(e) => handleCopy(r.orderId, `order-${r.orderId}`, e)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Salin No. Pesanan"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {copiedId === `order-${r.orderId}` && (
                        <span className="text-[10px] text-emerald-600 font-medium">Tersalin!</span>
                      )}
                    </div>
                    {r.totalPrice && (
                      <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                        Rp {Number(r.totalPrice).toLocaleString('id-ID')}
                      </div>
                    )}
                  </td>

                  {/* Change Type Badge */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getChangeTypeBadge(r)}
                  </td>

                  {/* Status & Transition */}
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getStatusBadgeClass(
                            r.newStatus
                          )}`}
                        >
                          {r.newStatus}
                        </span>
                      </div>

                      {/* Before / After status change notation */}
                      {r.statusChanged && r.oldStatus !== '(Pesanan Baru)' && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <span className="line-through text-slate-400">{r.oldStatus}</span>
                          <ArrowRight className="w-3 h-3 text-blue-500 shrink-0" />
                          <span className="font-medium text-blue-700">{r.newStatus}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Tracking Number & Courier */}
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {r.newTrackingNumber && r.newTrackingNumber !== '-' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-slate-900 text-xs tabular-nums">
                              {r.newTrackingNumber}
                            </span>
                            <button
                              onClick={(e) => handleCopy(r.newTrackingNumber, `resi-${r.orderId}`, e)}
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Salin Resi"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            {copiedId === `resi-${r.orderId}` && (
                              <span className="text-[10px] text-emerald-600 font-medium">Tersalin!</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            (Belum Ada Resi)
                          </span>
                        )}

                        {trackingUrl && (
                          <a
                            href={trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline shrink-0 font-medium"
                            title="Lacak resi langsung di website ekspedisi"
                          >
                            <span>Lacak</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {/* Courier Brand Tag */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${courier.bgColor} ${courier.color}`}>
                          {courier.name}
                        </span>
                        {r.trackingChanged && r.oldTrackingNumber && r.oldTrackingNumber !== '-' && (
                          <span className="text-[10px] text-blue-600 font-medium">
                            (Resi Diperbarui)
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Buyer & Product */}
                  <td className="py-3 px-4 max-w-xs">
                    {r.buyer && (
                      <div className="font-medium text-slate-800 truncate">
                        {r.buyer}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500 truncate" title={r.productSummary}>
                      {r.productSummary || '-'}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRecord(r);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Rincian</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Strip */}
      <div className="p-3.5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>Baris per halaman:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="py-1 px-2 text-xs bg-white border border-slate-200 rounded-md text-slate-800"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="font-mono tabular-nums">
            {startIndex + 1}–{Math.min(startIndex + pageSize, records.length)} dari {records.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className={`p-1.5 rounded-md border ${
              currentPage <= 1
                ? 'text-slate-300 border-slate-200 cursor-not-allowed bg-slate-50'
                : 'text-slate-600 border-slate-200 hover:bg-white bg-white'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-2 font-mono tabular-nums text-slate-700">
            Halaman {currentPage} dari {totalPages}
          </span>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={`p-1.5 rounded-md border ${
              currentPage >= totalPages
                ? 'text-slate-300 border-slate-200 cursor-not-allowed bg-slate-50'
                : 'text-slate-600 border-slate-200 hover:bg-white bg-white'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
