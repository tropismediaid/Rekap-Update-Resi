import React, { useState } from 'react';
import { Check, Columns, Info, X } from 'lucide-react';
import { ColumnMapping } from '../types';

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  columns: string[];
  mapping: ColumnMapping;
  onSave: (mapping: ColumnMapping) => void;
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  isOpen,
  onClose,
  title,
  columns,
  mapping,
  onSave,
}) => {
  if (!isOpen) return null;

  const [formState, setFormState] = useState<ColumnMapping>({ ...mapping });

  const handleChange = (field: keyof ColumnMapping, val: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: val || undefined,
    }));
  };

  const handleSave = () => {
    onSave(formState);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Columns className="w-5 h-5 text-orange-600" />
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Sistem telah mendeteksi kolom otomatis. Jika nama kolom di file Anda berbeda, sesuaikan pilihan dropdown di bawah ini.
            </span>
          </div>

          <div className="space-y-3">
            {/* Required: Order ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kolom Nomor Pesanan (Order ID) <span className="text-red-500">*Wajib</span>
              </label>
              <select
                value={formState.orderIdCol}
                onChange={(e) => handleChange('orderIdCol', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            {/* Required: Status Pesanan */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kolom Status Pesanan <span className="text-red-500">*Wajib</span>
              </label>
              <select
                value={formState.orderStatusCol}
                onChange={(e) => handleChange('orderStatusCol', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            {/* Required: No Resi */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kolom No. Resi / Tracking Number <span className="text-red-500">*Wajib</span>
              </label>
              <select
                value={formState.trackingNumberCol}
                onChange={(e) => handleChange('trackingNumberCol', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional: Opsi Pengiriman / Kurir */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kolom Opsi Pengiriman / Jasa Kirim (Opsional)
              </label>
              <select
                value={formState.courierCol || ''}
                onChange={(e) => handleChange('courierCol', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              >
                <option value="">-- Pilih jika ada --</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional: Nama Produk */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kolom Nama Produk (Opsional)
              </label>
              <select
                value={formState.productNameCol || ''}
                onChange={(e) => handleChange('productNameCol', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              >
                <option value="">-- Pilih jika ada --</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional: Username Pembeli */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kolom Pembeli / Penerima (Opsional)
              </label>
              <select
                value={formState.buyerUsernameCol || ''}
                onChange={(e) => handleChange('buyerUsernameCol', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              >
                <option value="">-- Pilih jika ada --</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors shadow-xs"
          >
            <Check className="w-4 h-4" />
            Simpan Pemetaan
          </button>
        </div>
      </div>
    </div>
  );
};
