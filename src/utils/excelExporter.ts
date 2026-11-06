import * as XLSX from 'xlsx';
import { ExportFormat } from '../types';

/**
 * Exports data rows to Excel (.xlsx) or CSV (.csv) file
 */
export function exportDataset(
  rows: Record<string, any>[],
  format: ExportFormat = 'xlsx',
  customFileName?: string
): void {
  if (!rows || rows.length === 0) {
    throw new Error('Tidak ada data untuk diekspor.');
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
  const fileName = customFileName || `Rekap_Update_Resi_${dateStr}_${timeStr}.${format}`;

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths dynamically based on content
  const colWidths = Object.keys(rows[0] || {}).map((key) => {
    let maxLen = key.length;
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const val = rows[i][key];
      if (val !== null && val !== undefined) {
        maxLen = Math.max(maxLen, String(val).length);
      }
    }
    return { wch: Math.min(Math.max(maxLen + 2, 12), 40) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Rekap Pesanan');

  if (format === 'csv') {
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    XLSX.writeFile(workbook, fileName);
  }
}
