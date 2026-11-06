import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Package,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { AuditRecord, ColumnMapping, ExportFormat, MatchingKey, ReconciliationSummary, UploadedFileData } from './types';
import { parseSpreadsheetFile } from './utils/fileParser';
import { reconcileOrders } from './utils/reconciliationEngine';
import { generateSampleShopeeData } from './utils/sampleDataGenerator';
import { exportDataset } from './utils/excelExporter';
import { exportPdfReport } from './utils/pdfExporter';

import { Header } from './components/Header';
import { FileUploader } from './components/FileUploader';
import { StatsCards } from './components/StatsCards';
import { FilterBar } from './components/FilterBar';
import { DataTable } from './components/DataTable';
import { OrderDetailsModal } from './components/OrderDetailsModal';
import { ComparisonModal } from './components/ComparisonModal';
import { LoginPage } from './components/LoginPage';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem('auth_admin') === 'true' ||
        sessionStorage.getItem('auth_admin') === 'true'
      );
    } catch {
      return false;
    }
  });
  const [oldFile, setOldFile] = useState<UploadedFileData | null>(null);
  const [newFile, setNewFile] = useState<UploadedFileData | null>(null);
  const [includeNewOrders, setIncludeNewOrders] = useState(true);
  const [matchingKey, setMatchingKey] = useState<MatchingKey>('orderId');
  const [onlyMatched, setOnlyMatched] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reconciliation state
  const [records, setRecords] = useState<AuditRecord[] | null>(null);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [exportRows, setExportRows] = useState<Record<string, any>[] | null>(null);

  // Filter & Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [courierFilter, setCourierFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal inspection
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);
  const [comparisonRecord, setComparisonRecord] = useState<AuditRecord | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleLoginSuccess = (rememberMe: boolean) => {
    setIsAuthenticated(true);
    try {
      if (rememberMe) {
        localStorage.setItem('auth_admin', 'true');
      } else {
        sessionStorage.setItem('auth_admin', 'true');
      }
    } catch {}
    showToast('Berhasil masuk sebagai admin.');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('auth_admin');
      sessionStorage.removeItem('auth_admin');
    } catch {}
    showToast('Sesi telah diakhiri. Silakan login kembali.');
  };

  // Upload handlers
  const handleOldFileUpload = async (file: File) => {
    try {
      setErrorMsg(null);
      const parsed = await parseSpreadsheetFile(file);
      setOldFile(parsed);
      showToast(`Berhasil memuat "${file.name}" (${parsed.rowCount} baris).`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memproses file lama.');
    }
  };

  const handleNewFileUpload = async (file: File) => {
    try {
      setErrorMsg(null);
      const parsed = await parseSpreadsheetFile(file);
      setNewFile(parsed);
      showToast(`Berhasil memuat "${file.name}" (${parsed.rowCount} baris).`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memproses file update.');
    }
  };

  const handleUpdateOldMapping = (mapping: ColumnMapping) => {
    if (oldFile) {
      setOldFile({ ...oldFile, detectedMapping: mapping });
      showToast('Pemetaan kolom File Lama berhasil diperbarui.');
    }
  };

  const handleUpdateNewMapping = (mapping: ColumnMapping) => {
    if (newFile) {
      setNewFile({ ...newFile, detectedMapping: mapping });
      showToast('Pemetaan kolom File Update berhasil diperbarui.');
    }
  };

  // Processing Reconciliation
  const handleProcess = () => {
    if (!oldFile || !newFile) return;

    try {
      setIsProcessing(true);
      setErrorMsg(null);

      const result = reconcileOrders(
        oldFile.data,
        oldFile.detectedMapping,
        newFile.data,
        newFile.detectedMapping,
        { includeNewOrders, matchingKey }
      );

      setRecords(result.records);
      setSummary(result.summary);
      setExportRows(result.exportRows);
      setCurrentPage(1);

      const keyLabel = matchingKey === 'orderId' ? 'No. Pesanan' : 'No. Resi';
      showToast(
        `Rekonsiliasi via ${keyLabel} selesai! ${result.summary.changedCount} berubah, ${result.summary.newOrdersCount} baru, ${result.summary.notFoundCount || 0} tidak di-update.`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses data.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Demo loader
  const handleLoadDemo = () => {
    const demo = generateSampleShopeeData();
    setOldFile(demo.oldFile);
    setNewFile(demo.newFile);
    setErrorMsg(null);

    const result = reconcileOrders(
      demo.oldFile.data,
      demo.oldFile.detectedMapping,
      demo.newFile.data,
      demo.newFile.detectedMapping,
      { includeNewOrders: true, matchingKey }
    );

    setRecords(result.records);
    setSummary(result.summary);
    setExportRows(result.exportRows);
    setCurrentPage(1);

    showToast('Data demo Shopee (16 pesanan sampel) berhasil dimuat dan dicocokkan!');
  };

  const handleReset = () => {
    setOldFile(null);
    setNewFile(null);
    setRecords(null);
    setSummary(null);
    setExportRows(null);
    setErrorMsg(null);
    setSearchTerm('');
    setStatusFilter('ALL');
    setCourierFilter('ALL');
    showToast('Semua data berhasil dibersihkan.');
  };

  // Export handler
  const handleExport = (format: ExportFormat) => {
    if (format === 'pdf') {
      const recordsToExport = filteredRecords.length > 0 ? filteredRecords : records;
      if (!recordsToExport || recordsToExport.length === 0 || !summary) {
        showToast('Belum ada data hasil rekonsiliasi untuk diekspor.');
        return;
      }

      try {
        exportPdfReport(recordsToExport, summary, {
          searchTerm,
          statusFilter,
          courierFilter,
        });
        showToast('Laporan audit PDF berhasil diunduh!');
      } catch (err: any) {
        setErrorMsg(err.message || 'Gagal membuat dokumen PDF.');
      }
      return;
    }

    if (!exportRows || exportRows.length === 0) {
      showToast('Belum ada data hasil rekonsiliasi untuk diekspor.');
      return;
    }

    try {
      exportDataset(exportRows, format);
      showToast(`File hasil rekonsiliasi (${format.toUpperCase()}) berhasil diunduh!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengekspor file.');
    }
  };

  // Handler for barcode scanner results from Web API camera
  const handleScanResi = (scannedText: string) => {
    const clean = scannedText.trim();
    if (!clean) return;

    setSearchTerm(clean);
    setStatusFilter('ALL');
    setCourierFilter('ALL');
    setCurrentPage(1);

    if (records) {
      const match = records.find(
        (r) =>
          r.newTrackingNumber.toLowerCase().includes(clean.toLowerCase()) ||
          r.orderId.toLowerCase().includes(clean.toLowerCase())
      );

      if (match) {
        showToast(
          `Resi ${match.newTrackingNumber || match.orderId} ditemukan (Status: ${match.newStatus})!`
        );
      } else {
        showToast(`Resi "${clean}" terdeteksi, tidak ada di data ini.`);
      }
    }
  };

  // Available couriers for dropdown
  const availableCouriers = useMemo(() => {
    if (!records) return [];
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.courier && r.courier !== '-') set.add(r.courier);
    });
    return Array.from(set).sort();
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    if (!records) return [];

    return records.filter((r) => {
      // 1. Status Filter
      if (statusFilter === 'BERUBAH') {
        if (r.changeType !== 'BERUBAH') return false;
      } else if (statusFilter === 'TETAP') {
        if (r.changeType !== 'TETAP') return false;
      } else if (statusFilter === 'BARU') {
        if (r.changeType !== 'BARU') return false;
      } else if (statusFilter === 'TIDAK_DITEMUKAN') {
        if (r.changeType !== 'TIDAK_DITEMUKAN') return false;
      } else if (statusFilter === 'DIBATALKAN') {
        const lower = r.newStatus.toLowerCase();
        if (!lower.includes('batal') && !lower.includes('cancel') && !lower.includes('retur')) {
          return false;
        }
      }

      // 1b. Toggle Filter: Hanya Data Cocok / Terupdate (Sembunyikan data lama yang tidak ditemukan di file update)
      if (onlyMatched && r.changeType === 'TIDAK_DITEMUKAN') {
        return false;
      }

      // 2. Courier Filter
      if (courierFilter !== 'ALL') {
        if (r.courier !== courierFilter) return false;
      }

      // 3. Search Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchOrder = r.orderId.toLowerCase().includes(q);
        const matchTracking = r.newTrackingNumber.toLowerCase().includes(q);
        const matchOldTracking = r.oldTrackingNumber.toLowerCase().includes(q);
        const matchBuyer = r.buyer.toLowerCase().includes(q);
        const matchProduct = r.productSummary.toLowerCase().includes(q);
        const matchStatus = r.newStatus.toLowerCase().includes(q);

        if (!matchOrder && !matchTracking && !matchOldTracking && !matchBuyer && !matchProduct && !matchStatus) {
          return false;
        }
      }

      return true;
    });
  }, [records, statusFilter, courierFilter, searchTerm, onlyMatched]);

  // Changed records list for side-by-side comparison modal navigation
  const allChangedRecords = useMemo(() => {
    if (!records) return [];
    return records.filter((r) => r.changeType === 'BERUBAH' || r.changeType === 'BARU');
  }, [records]);

  // If not logged in, display the Login Page
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <Header
        onLoadDemo={handleLoadDemo}
        onReset={handleReset}
        hasData={records !== null || oldFile !== null || newFile !== null}
        currentUser="admin"
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Intro Guide Banner (Shown prominently when no records yet) */}
        {!records && (
          <div className="bg-gradient-to-r from-orange-600 via-orange-700 to-amber-700 rounded-2xl p-6 sm:p-8 text-white shadow-sm">
            <div className="max-w-3xl space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-200">
                Solusi Cepat Rekap Pesanan & Logistik
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Otomatiskan Pencocokan Status & Nomor Resi Pengiriman
              </h2>
              <p className="text-xs sm:text-sm text-orange-100 leading-relaxed">
                Unggah file master pesanan lama dan file export terbaru dari Shopee atau marketplace lain.
                Aplikasi akan mendeteksi otomatis kolom penting, mencocokkan status & resi terbaru,
                membuat audit trail, dan mempertahankan 100% susunan kolom asli Anda untuk diekspor kembali ke Excel.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleLoadDemo}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-orange-800 bg-white hover:bg-orange-50 rounded-lg shadow-sm transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-orange-600" />
                  <span>Coba Langsung dengan Data Demo Shopee</span>
                </button>
                <span className="text-xs text-orange-200">
                  atau unggah file Excel Anda di bawah
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Upload & Configuration Section */}
        <FileUploader
          oldFile={oldFile}
          newFile={newFile}
          onOldFileUpload={handleOldFileUpload}
          onNewFileUpload={handleNewFileUpload}
          onClearOldFile={() => setOldFile(null)}
          onClearNewFile={() => setNewFile(null)}
          onUpdateOldMapping={handleUpdateOldMapping}
          onUpdateNewMapping={handleUpdateNewMapping}
          matchingKey={matchingKey}
          onMatchingKeyChange={setMatchingKey}
          includeNewOrders={includeNewOrders}
          onToggleIncludeNewOrders={setIncludeNewOrders}
          onProcess={handleProcess}
          isProcessing={isProcessing}
          errorMsg={errorMsg}
        />

        {/* Results View: Stats Cards, Filters, Data Table */}
        {records && summary && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* KPI Cards */}
            <StatsCards
              summary={summary}
              activeFilter={statusFilter}
              onSelectFilter={(f) => {
                setStatusFilter(f);
                setCurrentPage(1);
              }}
            />

            {/* Filter Bar */}
            <FilterBar
              searchTerm={searchTerm}
              onSearchChange={(s) => {
                setSearchTerm(s);
                setCurrentPage(1);
              }}
              statusFilter={statusFilter}
              onStatusFilterChange={(f) => {
                setStatusFilter(f);
                setCurrentPage(1);
              }}
              courierFilter={courierFilter}
              onCourierFilterChange={(c) => {
                setCourierFilter(c);
                setCurrentPage(1);
              }}
              availableCouriers={availableCouriers}
              totalFilteredCount={filteredRecords.length}
              totalCount={records.length}
              onExport={handleExport}
              onScanResi={handleScanResi}
              onlyMatched={onlyMatched}
              onToggleOnlyMatched={() => setOnlyMatched((prev) => !prev)}
            />

            {/* Data Table */}
            <DataTable
              records={filteredRecords}
              onSelectRecord={setSelectedRecord}
              onCompareRecord={(r) => setComparisonRecord(r)}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </main>

      {/* Order Details Modal */}
      <OrderDetailsModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onOpenComparison={(r) => setComparisonRecord(r)}
      />

      {/* Side-by-Side Comparison Modal */}
      <ComparisonModal
        isOpen={comparisonRecord !== null}
        onClose={() => setComparisonRecord(null)}
        record={comparisonRecord}
        allChangedRecords={allChangedRecords}
        onSelectRecord={(r) => setComparisonRecord(r)}
        oldFileName={oldFile?.fileName}
        newFileName={newFile?.fileName}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg border border-slate-700 text-xs flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            Rekap & Update Status Resi Pengiriman · Pemrosesan Data Berbasis Client-Side
          </p>
          <p className="text-slate-400">
            Data pesanan diproses langsung di peramban Anda tanpa dikirim ke server.
          </p>
        </div>
      </footer>
    </div>
  );
}
