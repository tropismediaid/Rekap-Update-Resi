import { AuditRecord, ColumnMapping, ReconciliationSummary, StatusChangeType } from '../types';

export interface ReconciliationOptions {
  includeNewOrders: boolean;
  updateOldTrackingIfEmptyOnly?: boolean;
}

export function normalizeOrderId(id: any): string {
  if (id === null || id === undefined) return '';
  return String(id).trim();
}

/**
 * Reconciles old file data with new update file data
 */
export function reconcileOrders(
  oldData: Record<string, any>[],
  oldMapping: ColumnMapping,
  newData: Record<string, any>[],
  newMapping: ColumnMapping,
  options: ReconciliationOptions = { includeNewOrders: true }
): {
  records: AuditRecord[];
  summary: ReconciliationSummary;
  exportRows: Record<string, any>[];
} {
  const nowStr = new Date().toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // 1. Index new data by Order ID for fast lookup
  const newMap = new Map<string, Record<string, any>>();
  for (const row of newData) {
    const rawId = row[newMapping.orderIdCol];
    const normalized = normalizeOrderId(rawId);
    if (normalized) {
      newMap.set(normalized.toLowerCase(), row);
    }
  }

  // 2. Track processed Order IDs
  const matchedNewOrderIds = new Set<string>();
  const records: AuditRecord[] = [];

  let changedCount = 0;
  let sameCount = 0;
  let newOrdersCount = 0;
  let cancelledCount = 0;
  let completedCount = 0;
  let onDeliveryCount = 0;
  let toShipCount = 0;

  // 3. Process Old Records
  for (const oldRow of oldData) {
    const rawId = oldRow[oldMapping.orderIdCol];
    const normalized = normalizeOrderId(rawId);
    const lookupKey = normalized.toLowerCase();

    const oldStatus = String(oldRow[oldMapping.orderStatusCol] || '').trim();
    const oldTracking = String(oldRow[oldMapping.trackingNumberCol] || '').trim();
    const oldCourier = oldMapping.courierCol ? String(oldRow[oldMapping.courierCol] || '').trim() : '';
    const buyer = oldMapping.buyerUsernameCol ? String(oldRow[oldMapping.buyerUsernameCol] || '').trim() : '';
    const product = oldMapping.productNameCol ? String(oldRow[oldMapping.productNameCol] || '').trim() : '';
    const price = oldMapping.totalPriceCol ? oldRow[oldMapping.totalPriceCol] : '';

    if (newMap.has(lookupKey)) {
      matchedNewOrderIds.add(lookupKey);
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
        orderId: normalized,
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
      });
    } else {
      // Order ID in old data was NOT found in new update file
      const changeType: StatusChangeType = 'TETAP';
      sameCount++;

      const lowerStatus = oldStatus.toLowerCase();
      if (lowerStatus.includes('batal') || lowerStatus.includes('cancel')) cancelledCount++;
      else if (lowerStatus.includes('selesai')) completedCount++;
      else if (lowerStatus.includes('dikirim')) onDeliveryCount++;
      else if (lowerStatus.includes('perlu')) toShipCount++;

      const exportRow: Record<string, any> = {
        '[Audit] Status Terkini': oldStatus,
        '[Audit] Status Sebelumnya': oldStatus || '-',
        '[Audit] Jenis Perubahan': 'Tetap (Tidak Tercantum di File Update)',
        '[Audit] No. Resi Terkini': oldTracking || '-',
        '[Audit] No. Resi Sebelumnya': oldTracking || '-',
        '[Audit] Waktu Pemutakhiran': nowStr,
        ...oldRow,
      };

      records.push({
        orderId: normalized,
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
      });
    }
  }

  // 4. Process New Orders (present in update file, but missing in old data)
  if (options.includeNewOrders) {
    for (const newRow of newData) {
      const rawId = newRow[newMapping.orderIdCol];
      const normalized = normalizeOrderId(rawId);
      const lookupKey = normalized.toLowerCase();

      if (!matchedNewOrderIds.has(lookupKey) && normalized) {
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
          orderId: normalized,
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
