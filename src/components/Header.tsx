import React from 'react';
import { Package, RefreshCw, Sparkles, Trash2 } from 'lucide-react';

interface HeaderProps {
  onLoadDemo: () => void;
  onReset: () => void;
  hasData: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onLoadDemo, onReset, hasData }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-orange-600 flex items-center justify-center text-white shadow-xs">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
              Rekap & Update Resi
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block whitespace-nowrap">
              Shopee & Multi-Marketplace Order Reconciler
            </p>
          </div>
        </div>

        {/* Zone 2: Informational / Navigation */}
        <div className="hidden md:flex items-center gap-6 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            100% Client-Side (Privasi Terjaga)
          </span>
          <span className="text-slate-300">|</span>
          <span>Mendukung .xlsx, .xls, .csv</span>
        </div>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {hasData && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"
              title="Reset data dan mulai ulang"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          <button
            onClick={onLoadDemo}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <span>Muat Data Sampel (Demo)</span>
          </button>
        </div>
      </div>
    </header>
  );
};
