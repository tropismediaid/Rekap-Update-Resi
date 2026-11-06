import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle,
  Clock,
  HelpCircle,
  Layers,
  Sparkles,
  Truck,
  XCircle,
} from 'lucide-react';
import { ReconciliationSummary } from '../types';

interface StatsCardsProps {
  summary: ReconciliationSummary;
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  summary,
  activeFilter,
  onSelectFilter,
}) => {
  const cards = [
    {
      id: 'ALL',
      title: 'Total Diproses',
      count: summary.totalProcessed,
      subtitle: 'Semua baris pesanan',
      icon: Layers,
      color: 'text-slate-900',
      activeBorder: 'border-slate-900 ring-1 ring-slate-900',
      tagColor: 'text-slate-600',
    },
    {
      id: 'BERUBAH',
      title: 'Status & Resi Berubah',
      count: summary.changedCount,
      subtitle: 'Status atau resi ter-update',
      icon: ArrowUpRight,
      color: 'text-blue-600',
      activeBorder: 'border-blue-600 ring-1 ring-blue-600',
      tagColor: 'text-blue-700',
    },
    {
      id: 'TETAP',
      title: 'Status Tetap',
      count: summary.sameCount,
      subtitle: 'Tidak ada perubahan data',
      icon: CheckCircle,
      color: 'text-slate-700',
      activeBorder: 'border-slate-600 ring-1 ring-slate-600',
      tagColor: 'text-slate-600',
    },
    {
      id: 'BARU',
      title: 'Pesanan Baru',
      count: summary.newOrdersCount,
      subtitle: 'Baru masuk di file update',
      icon: Sparkles,
      color: 'text-emerald-600',
      activeBorder: 'border-emerald-600 ring-1 ring-emerald-600',
      tagColor: 'text-emerald-700',
    },
    {
      id: 'TIDAK_DITEMUKAN',
      title: 'Tidak di Update',
      count: summary.notFoundCount || 0,
      subtitle: 'Hanya ada di file lama',
      icon: HelpCircle,
      color: 'text-amber-600',
      activeBorder: 'border-amber-600 ring-1 ring-amber-600',
      tagColor: 'text-amber-700',
    },
    {
      id: 'DIBATALKAN',
      title: 'Dibatalkan / Retur',
      count: summary.cancelledCount,
      subtitle: 'Pesanan batal atau komplain',
      icon: XCircle,
      color: 'text-rose-600',
      activeBorder: 'border-rose-600 ring-1 ring-rose-600',
      tagColor: 'text-rose-700',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Ringkasan Rekonsiliasi & Audit
        </h2>
        <span className="text-xs text-slate-400">
          Klik kartu untuk memfilter data di tabel
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const isActive = activeFilter === card.id;

          return (
            <button
              key={card.id}
              onClick={() => onSelectFilter(card.id)}
              className={`text-left p-4 rounded-xl bg-white border transition-all hover:shadow-xs relative cursor-pointer ${
                isActive
                  ? `${card.activeBorder} shadow-xs`
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 truncate">
                  {card.title}
                </span>
                <Icon className={`w-4 h-4 ${card.color} shrink-0`} />
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
                {card.count.toLocaleString('id-ID')}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 truncate">
                {card.subtitle}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
