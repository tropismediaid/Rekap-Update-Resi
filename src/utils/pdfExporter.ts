import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuditRecord, ReconciliationSummary } from '../types';

export interface PdfExportOptions {
  searchTerm?: string;
  statusFilter?: string;
  courierFilter?: string;
}

export function exportPdfReport(
  records: AuditRecord[],
  summary: ReconciliationSummary,
  options?: PdfExportOptions
): void {
  // Use A4 Landscape for tabular reporting clarity
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const printDate = new Date().toLocaleString('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  // --- 1. Header Banner ---
  doc.setFillColor(238, 77, 45); // Shopee/Brand vibrant orange (#EE4D2D)
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN REKONSILIASI & PEMUTAKHIRAN STATUS RESI PENGIRIMAN', 14, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Audit Trail & Order Matching Report · Sistem Client-Side', 14, 18);

  doc.setFontSize(8);
  doc.text(`Waktu Cetak: ${printDate}`, pageWidth - 14, 11, { align: 'right' });
  doc.text(`Total Baris Diekspor: ${records.length} pesanan`, pageWidth - 14, 18, { align: 'right' });

  // --- 2. Filter Info (if active) ---
  let currentY = 30;
  if (options && (options.searchTerm || (options.statusFilter && options.statusFilter !== 'ALL') || (options.courierFilter && options.courierFilter !== 'ALL'))) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    const filterDesc = [
      options.searchTerm ? `Pencarian: "${options.searchTerm}"` : null,
      options.statusFilter && options.statusFilter !== 'ALL' ? `Filter Status: ${options.statusFilter}` : null,
      options.courierFilter && options.courierFilter !== 'ALL' ? `Kurir: ${options.courierFilter}` : null,
    ].filter(Boolean).join('  |  ');

    doc.text(`Filter Aktif: ${filterDesc}`, 14, currentY);
    currentY += 5;
  }

  // --- 3. Ringkasan Statistik (KPI Table) ---
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('1. RINGKASAN STATISTIK REKONSILIASI', 14, currentY + 2);
  currentY += 5;

  const kpiData = [
    [
      'Total Diproses',
      'Status & Resi Berubah',
      'Status Tetap',
      'Pesanan Baru',
      'Tidak di Update',
      'Dibatalkan / Retur',
      'Selesai',
      'Dalam Pengiriman',
    ],
    [
      summary.totalProcessed.toLocaleString('id-ID'),
      summary.changedCount.toLocaleString('id-ID'),
      summary.sameCount.toLocaleString('id-ID'),
      summary.newOrdersCount.toLocaleString('id-ID'),
      (summary.notFoundCount || 0).toLocaleString('id-ID'),
      summary.cancelledCount.toLocaleString('id-ID'),
      summary.completedCount.toLocaleString('id-ID'),
      summary.onDeliveryCount.toLocaleString('id-ID'),
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [kpiData[0]],
    body: [kpiData[1]],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      halign: 'center',
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    margin: { left: 14, right: 14 },
  });

  const finalKpiY = (doc as any).lastAutoTable.finalY || currentY + 18;
  currentY = finalKpiY + 8;

  // --- 4. Daftar Pesanan Table ---
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`2. DAFTAR RINCIAN AUDIT PESANAN (${records.length} Baris)`, 14, currentY);
  currentY += 4;

  const tableRows = records.map((r, index) => [
    (index + 1).toString(),
    r.orderId,
    r.changeType,
    r.newStatus,
    r.oldStatus || '-',
    r.newTrackingNumber || '(Belum Ada)',
    r.courier || '-',
    r.buyer || '-',
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'No',
        'No. Pesanan',
        'Perubahan',
        'Status Terkini',
        'Status Lama',
        'No. Resi Pengiriman',
        'Kurir',
        'Pembeli',
      ],
    ],
    body: tableRows,
    theme: 'striped',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      font: 'helvetica',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 38, fontStyle: 'bold' },
      2: { cellWidth: 24 },
      3: { cellWidth: 32, fontStyle: 'bold' },
      4: { cellWidth: 30, textColor: [100, 116, 139] },
      5: { cellWidth: 42, fontStyle: 'bold' },
      6: { cellWidth: 32 },
      7: { cellWidth: 'auto' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 14 },
    didDrawPage: (data) => {
      // Footer page numbering
      const pageStr = `Halaman ${data.pageNumber} dari ${(doc as any).internal.getNumberOfPages()}`;
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        pageStr,
        pageWidth - 14,
        pageHeight - 8,
        { align: 'right' }
      );
      doc.text(
        'Laporan Rekap & Update Status Resi Pengiriman · Dokumen Resmi Audit Internal',
        14,
        pageHeight - 8
      );
    },
  });

  // Download PDF
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
  doc.save(`Laporan_Rekap_Resi_${dateStr}_${timeStr}.pdf`);
}
