import * as XLSX from 'xlsx';
import { autoDetectColumnMapping } from './columnDetector';
import { UploadedFileData } from '../types';

/**
 * Parses uploaded File object (.xlsx, .xls, .csv) into structured dataset
 */
export async function parseSpreadsheetFile(file: File): Promise<UploadedFileData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    cellText: false,
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('File tidak memiliki sheet data yang valid.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  
  // Read as array of objects with header row
  const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false,
  });

  if (!rawData || rawData.length === 0) {
    throw new Error('Sheet data kosong atau tidak memiliki baris data.');
  }

  // Extract all unique headers from all rows
  const columnSet = new Set<string>();
  rawData.forEach((row) => {
    Object.keys(row).forEach((k) => columnSet.add(k));
  });
  const columns = Array.from(columnSet);

  const detectedMapping = autoDetectColumnMapping(columns);

  return {
    fileName: file.name,
    fileSize: file.size,
    rowCount: rawData.length,
    columns,
    data: rawData,
    detectedMapping,
  };
}
