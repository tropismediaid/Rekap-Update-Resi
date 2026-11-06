import { AuditRecord, ColumnMapping, MatchingKey, ReconciliationSummary, StatusChangeType } from '../types';

export interface ReconciliationOptions {
  includeNewOrders: boolean;
  matchingKey?: MatchingKey;
  updateOldTrackingIfEmptyOnly?: boolean;
}

export function normalizeKey(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().toLowerCase();
}

/**
 * Reconciles old file data with new update file data
 */
export function reconcileOrders(
  oldData: Record<string, any>[],
  oldMapping: ColumnMapping,
  newData: Record<string, any>[],
  newMapping: ColumnMapping,
  options: ReconciliationOptions = { includeNewOrders: true, matchingKey: 'orderId' }
): {
  records: AuditRecord[];
  summary: ReconciliationSummary;
  exportRows: Record<string, any>[];
} {
  const nowStr = new Date().toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const matchingKey = options.matchingKey || 'orderId';
  const oldKeyCol = matchingKey === 'trackingNumber' ? oldMapping.trackingNumberCol : oldMapping.orderIdCol;
  const newKeyCol = matchingKey === 'trackingNumber' ? newMapping.trackingNumberCol : newMapping.orderIdCol;

  // 1. Index new data by selected key for fast lookup
  const newMap = new Map<string, Record<string, any>>();
  for (const row of newData) {
    const rawVal = row[newKeyCol];
    const normalized = normalizeKey(rawVal);
    if (normalized && normalized !== '-' && normalized !== '0') {
      newMap.set(normalized, row);
    }
  }

  // 2. Track processed keys
  const matchedNewKeys = new Set<string>();
  const records: AuditRecord[] = [];

  let changedCount = 0;
  let sameCount = 0;
  let newOrdersCount = 0;
  let notFoundCount = 0;
  let cancelledCount = 0;
  let completedCount = 0;
  let onDeliveryCount = 0;
  let toShipCount = 0;

  // 3. Process Old Records
  for (const oldRow of oldData) {
    const rawId = oldRow[oldMapping.orderIdCol];
    const normalizedOrderId = String(rawId || '').trim();

    const rawMatchVal = oldRow[oldKeyCol];
    const lookupKey = normalizeKey(rawMatchVal);

    const oldStatus = String(oldRow[oldMapping.orderStatusCol] || '').trim();
    const oldTracking = String(oldRow[oldMapping.trackingNumberCol] || '').trim();
    const oldCourier = oldMapping.courierCol ? String(oldRow[oldMapping.courierCol] || '').trim() : '';
    const buyer = oldMapping.buyerUsernameCol ? String(oldRow[oldMapping.buyerUsernameCol] || '').trim() : '';
    const product = oldMapping.productNameCol ? String(oldRow[oldMapping.productNameCol] || '').trim() : '';
    const price = oldMapping.totalPriceCol ? oldRow[oldMapping.totalPriceCol] : '';

    if (lookupKey && lookupKey !== '-' && lookupKey !== '0' && newMap.has(lookupKey)) {
      matchedNewKeys.add(lookupKey);
      const newRow = newMap.get(lookupKey)!;

      const newStatus = String(newRow[newMapping.orderStatusCol] || '').trim() || oldStatus;
      const rawNewTracking = String(newRow[newMapping.trackingNumberCol] || '').trim();
      const newTracking = rawNewTracking || oldTracking;
      const newCourier = (newMapping.courierCol && String(newRow[newMapping.courierCol] || '').trim()) || oldCourier;

      const statusChanged = oldStatus.toLowerCase() !== newStatus.toLowerCase();
      const trackingChanged = oldTracking.toLowerCase() !== newTracking.toLowerCase();
      const isChanged = statusChanged || trackingChanged;

      const changeType: StatusChangeType = isChanged ? 'BERUBAH' : 'TETAP';

      if (isChanged) {
        changedCount++;
      } else {
        sameCount++;
      }

      // Check status buckets for stats
      const lowerStatus = newStatus.toLowerCase();
      if (lowerStatus.includes('batal') || lowerStatus.includes('cancel') || lowerStatus.includes('kembali') || lowerStatus.includes('retur')) {
        cancelledCount++;
      } else if (lowerStatus.includes('selesai') || lowerStatus.includes('complete') || lowerStatus.includes('delivered')) {
        completedCount++;
      } else if (lowerStatus.includes('sedang dikirim') || lowerStatus.includes('dikirim') || lowerStatus.includes('shipping') || lowerStatus.includes('transit')) {
        onDeliveryCount++;
      } else if (lowerStatus.includes('perlu dikirim') || lowerStatus.includes('diproses') || lowerStatus.includes('menunggu')) {
        toShipCount++;
      }

      // Merge columns: keep all old columns, update specific key columns and any newly available columns
      const mergedRow: Record<string, any> = { ...oldRow };
      // Overlay any new values from newRow that exist
      Object.keys(newRow).forEach((k) => {
        if (newRow[k] !== undefined && newRow[k] !== '') {
          mergedRow[k] = newRow[k];
        }
      });
      // Ensure target mapped columns in old data reflect the updated values
      mergedRow[oldMapping.orderStatusCol] = newStatus;
      if (newTracking) mergedRow[oldMapping.trackingNumberCol] = newTracking;
      if (oldMapping.courierCol && newCourier) mergedRow[oldMapping.courierCol] = newCourier;

      // Add audit columns
      const exportRow: Record<string, any> = {
        '[Audit] Status Terkini': newStatus,
        '[Audit] Status Sebelumnya': oldStatus || '-',
        '[Audit] Jenis Perubahan': isChanged ? (statusChanged && trackingChanged ? 'Status & Resi Berubah' : statusChanged ? 'Status Berubah' : 'Resi Berubah') : 'Tetap (Tidak Ada Perubahan)',
        '[Audit] No. Resi Terkini': newTracking || '-',
        '[Audit] No. Resi Sebelumnya': oldTracking || '-',
        '[Audit] Waktu Pemutakhiran': nowStr,
        ...mergedRow,
      };

      records.push({
        orderId: normalizedOrderId,
        changeType,
        oldStatus,
        newStatus,
        statusChanged,
        oldTrackingNumber: oldTracking,
        newTrackingNumber: newTracking,
        trackingChanged,
        courier: newCourier,
        buyer,
        productSummary: product,
        totalPrice: price,
        allColumns: exportRow,
        updatedAt: nowStr,
        rawOldRow: oldRow,
        rawNewRow: newRow,
      });
    } else {
      // Data in old file was NOT found in new update file
      const changeType: StatusChangeType = 'TIDAK_DITEMUKAN';
      notFoundCount++;

      const lowerStatus = oldStatus.toLowerCase();
      if (lowerStatus.includes('batal') || lowerStatus.includes('cancel')) cancelledCount++;
      else if (lowerStatus.includes('selesai')) completedCount++;
      else if (lowerStatus.includes('dikirim')) onDeliveryCount++;
      else if (lowerStatus.includes('perlu')) toShipCount++;

      const exportRow: Record<string, any> = {
        '[Audit] Status Terkini': oldStatus,
        '[Audit] Status Sebelumnya': oldStatus || '-',
        '[Audit] Jenis Perubahan': 'Tidak Ada di File Update',
        '[Audit] No. Resi Terkini': oldTracking || '-',
        '[Audit] No. Resi Sebelumnya': oldTracking || '-',
        '[Audit] Waktu Pemutakhiran': nowStr,
        ...oldRow,
      };

      records.push({
        orderId: normalizedOrderId,
        changeType,
        oldStatus,
        newStatus: oldStatus,
        statusChanged: false,
        oldTrackingNumber: oldTracking,
        newTrackingNumber: oldTracking,
        trackingChanged: false,
        courier: oldCourier,
        buyer,
        productSummary: product,
        totalPrice: price,
        allColumns: exportRow,
        updatedAt: nowStr,
        rawOldRow: oldRow,
        rawNewRow: undefined,
      });
    }
  }

  // 4. Process New Orders (present in update file, but missing in old data)
  if (options.includeNewOrders) {
    for (const newRow of newData) {
      const rawId = newRow[newMapping.orderIdCol];
      const normalizedOrderId = String(rawId || '').trim();
      const rawMatchVal = newRow[newKeyCol];
      const lookupKey = normalizeKey(rawMatchVal);

      if (lookupKey && !matchedNewKeys.has(lookupKey)) {
        newOrdersCount++;
        const newStatus = String(newRow[newMapping.orderStatusCol] || '').trim();
        const newTracking = String(newRow[newMapping.trackingNumberCol] || '').trim();
        const newCourier = newMapping.courierCol ? String(newRow[newMapping.courierCol] || '').trim() : '';
        const buyer = newMapping.buyerUsernameCol ? String(newRow[newMapping.buyerUsernameCol] || '').trim() : '';
        const product = newMapping.productNameCol ? String(newRow[newMapping.productNameCol] || '').trim() : '';
        const price = newMapping.totalPriceCol ? newRow[newMapping.totalPriceCol] : '';

        const lowerStatus = newStatus.toLowerCase();
        if (lowerStatus.includes('batal') || lowerStatus.includes('cancel')) cancelledCount++;
        else if (lowerStatus.includes('selesai')) completedCount++;
        else if (lowerStatus.includes('dikirim')) onDeliveryCount++;
        else if (lowerStatus.includes('perlu')) toShipCount++;

        const exportRow: Record<string, any> = {
          '[Audit] Status Terkini': newStatus,
          '[Audit] Status Sebelumnya': '(Pesanan Baru)',
          '[Audit] Jenis Perubahan': 'Pesanan Baru (Dari File Update)',
          '[Audit] No. Resi Terkini': newTracking || '-',
          '[Audit] No. Resi Sebelumnya': '-',
          '[Audit] Waktu Pemutakhiran': nowStr,
          ...newRow,
        };

        records.push({
          orderId: normalizedOrderId || (matchingKey === 'trackingNumber' ? `RESI-${newTracking}` : 'PESANAN-BARU'),
          changeType: 'BARU',
          oldStatus: '(Pesanan Baru)',
          newStatus,
          statusChanged: true,
          oldTrackingNumber: '-',
          newTrackingNumber: newTracking,
          trackingChanged: true,
          courier: newCourier,
          buyer,
          productSummary: product,
          totalPrice: price,
          allColumns: exportRow,
          updatedAt: nowStr,
          rawOldRow: undefined,
          rawNewRow: newRow,
        });
      }
    }
  }

  const totalProcessed = records.length;
  const summary: ReconciliationSummary = {
    totalProcessed,
    changedCount,
    sameCount,
    newOrdersCount,
    notFoundCount,
    cancelledCount,
    completedCount,
    onDeliveryCount,
    toShipCount,
  };

  const exportRows = records.map((r) => r.allColumns);

  return {
    records,
    summary,
    exportRows,
  };
}
