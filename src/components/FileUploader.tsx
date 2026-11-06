import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Settings2,
  UploadCloud,
  X,
} from 'lucide-react';
import { ColumnMapping, MatchingKey, UploadedFileData } from '../types';
import { ColumnMappingModal } from './ColumnMappingModal';

interface FileUploaderProps {
  oldFile: UploadedFileData | null;
  newFile: UploadedFileData | null;
  onOldFileUpload: (file: File) => Promise<void>;
  onNewFileUpload: (file: File) => Promise<void>;
  onClearOldFile: () => void;
  onClearNewFile: () => void;
  onUpdateOldMapping: (m: ColumnMapping) => void;
  onUpdateNewMapping: (m: ColumnMapping) => void;
  matchingKey: MatchingKey;
  onMatchingKeyChange: (key: MatchingKey) => void;
  includeNewOrders: boolean;
  onToggleIncludeNewOrders: (val: boolean) => void;
  onProcess: () => void;
  isProcessing: boolean;
  errorMsg: string | null;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  oldFile,
  newFile,
  onOldFileUpload,
  onNewFileUpload,
  onClearOldFile,
  onClearNewFile,
  onUpdateOldMapping,
  onUpdateNewMapping,
  matchingKey,
  onMatchingKeyChange,
  includeNewOrders,
  onToggleIncludeNewOrders,
  onProcess,
  isProcessing,
  errorMsg,
}) => {
  const [oldMappingOpen, setOldMappingOpen] = useState(false);
  const [newMappingOpen, setNewMappingOpen] = useState(false);

  const [oldDragOver, setOldDragOver] = useState(false);
  const [newDragOver, setNewDragOver] = useState(false);

  const oldInputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleOldDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setOldDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onOldFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleNewDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setNewDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onNewFileUpload(e.dataTransfer.files[0]);
    }
  };

  const canProcess = oldFile !== null && newFile !== null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Box 1: File Lama (Master / Sebelumnya) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Langkah 1
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                File Lama / Master Rekap
              </h3>
            </div>
            {oldFile && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Siap
              </span>
            )}
          </div>

          {!oldFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setOldDragOver(true);
              }}
              onDragLeave={() => setOldDragOver(false)}
              onDrop={handleOldDrop}
              onClick={() => oldInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                oldDragOver
                  ? 'border-orange-500 bg-orange-50/50'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={oldInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onOldFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
                <UploadCloud className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-xs font-semibold text-slate-800 mb-1">
                Drag-and-drop atau klik untuk upload File Lama
              </p>
              <p className="text-[11px] text-slate-500">
                Format didukung: .xlsx, .xls, atau .csv (Export Shopee/Marketplace sebelumnya)
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-700 shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {oldFile.fileName}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                      {oldFile.rowCount.toLocaleString('id-ID')} baris · {formatFileSize(oldFile.fileSize)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClearOldFile}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                  title="Hapus file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detected Mapping Overview */}
              <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1.5 text-slate-600">
                <div className="flex items-center justify-between">
                  <span>No. Pesanan:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                    {oldFile.detectedMapping.orderIdCol || '(Belum dipilih)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                    {oldFile.detectedMapping.orderStatusCol || '(Belum dipilih)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>No. Resi:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                    {oldFile.detectedMapping.trackingNumberCol || '(Belum dipilih)'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setOldMappingOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              >
                <Settings2 className="w-3.5 h-3.5 text-slate-500" />
                Sesuaikan Pemetaan Kolom
              </button>
            </div>
          )}
        </div>

        {/* Box 2: File Update Terbaru */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Langkah 2
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                File Update Status Terbaru
              </h3>
            </div>
            {newFile && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Siap
              </span>
            )}
          </div>

          {!newFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setNewDragOver(true);
              }}
              onDragLeave={() => setNewDragOver(false)}
              onDrop={handleNewDrop}
              onClick={() => newInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                newDragOver
                  ? 'border-orange-500 bg-orange-50/50'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={newInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onNewFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
                <UploadCloud className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-xs font-semibold text-slate-800 mb-1">
                Drag-and-drop atau klik untuk upload File Update
              </p>
              <p className="text-[11px] text-slate-500">
                Format didukung: .xlsx, .xls, atau .csv (Export status pesanan terbaru dari seller center)
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {newFile.fileName}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                      {newFile.rowCount.toLocaleString('id-ID')} baris · {formatFileSize(newFile.fileSize)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClearNewFile}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                  title="Hapus file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detected Mapping Overview */}
              <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1.5 text-slate-600">
                <div className="flex items-center justify-between">
                  <span>No. Pesanan:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                    {newFile.detectedMapping.orderIdCol || '(Belum dipilih)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                    {newFile.detectedMapping.orderStatusCol || '(Belum dipilih)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>No. Resi:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                    {newFile.detectedMapping.trackingNumberCol || '(Belum dipilih)'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setNewMappingOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              >
                <Settings2 className="w-3.5 h-3.5 text-slate-500" />
                Sesuaikan Pemetaan Kolom
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Control Strip & Execute */}
      <div className="pt-4 border-t border-slate-200 space-y-4">
        {/* Matching Key Selector */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                Kunci Pencocokan (Matching Key):
              </span>
              <span className="text-[10px] font-semibold text-orange-700 bg-orange-100/70 px-2 py-0.5 rounded-full">
                Fleksibel
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Pilih identitas untuk mencocokkan data lama dengan update baru. Gunakan <span className="font-semibold text-slate-700">No. Resi</span> jika file update hanya berasal dari kurir/ekspedisi tanpa No. Pesanan.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => onMatchingKeyChange('orderId')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                matchingKey === 'orderId'
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              No. Pesanan (Order ID)
            </button>
            <button
              type="button"
              onClick={() => onMatchingKeyChange('trackingNumber')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                matchingKey === 'trackingNumber'
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              No. Resi (AWB)
            </button>
          </div>
        </div>

        {/* Options & Execute Action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeNewOrders}
              onChange={(e) => onToggleIncludeNewOrders(e.target.checked)}
              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
            />
            <span className="text-xs text-slate-700">
              Sertakan pesanan baru yang hanya ada di file update terbaru
            </span>
          </label>

          <button
            onClick={onProcess}
            disabled={!canProcess || isProcessing}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold rounded-lg shadow-sm transition-all whitespace-nowrap ${
              canProcess && !isProcessing
                ? 'text-white bg-orange-600 hover:bg-orange-700 active:scale-98'
                : 'text-slate-400 bg-slate-100 cursor-not-allowed border border-slate-200'
            }`}
          >
            {isProcessing ? (
              <span>Memproses Data...</span>
            ) : (
              <>
                <span>Mulai Rekonsiliasi & Update Status</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modals for mapping */}
      {oldFile && (
        <ColumnMappingModal
          isOpen={oldMappingOpen}
          onClose={() => setOldMappingOpen(false)}
          title={`Pemetaan Kolom: ${oldFile.fileName}`}
          columns={oldFile.columns}
          mapping={oldFile.detectedMapping}
          onSave={onUpdateOldMapping}
        />
      )}

      {newFile && (
        <ColumnMappingModal
          isOpen={newMappingOpen}
          onClose={() => setNewMappingOpen(false)}
          title={`Pemetaan Kolom: ${newFile.fileName}`}
          columns={newFile.columns}
          mapping={newFile.detectedMapping}
          onSave={onUpdateNewMapping}
        />
      )}
    </div>
  );
};
