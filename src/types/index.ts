export type StatusChangeType = 'BERUBAH' | 'TETAP' | 'BARU' | 'TIDAK_DITEMUKAN';

export interface ColumnMapping {
  orderIdCol: string;
  orderStatusCol: string;
  trackingNumberCol: string;
  courierCol?: string;
  productNameCol?: string;
  buyerUsernameCol?: string;
  totalPriceCol?: string;
}

export interface AuditRecord {
  orderId: string;
  changeType: StatusChangeType;
  oldStatus: string;
  newStatus: string;
  statusChanged: boolean;
  oldTrackingNumber: string;
  newTrackingNumber: string;
  trackingChanged: boolean;
  courier: string;
  buyer: string;
  productSummary: string;
  totalPrice: string | number;
  allColumns: Record<string, any>;
  updatedAt: string;
}

export interface ReconciliationSummary {
  totalProcessed: number;
  changedCount: number;
  sameCount: number;
  newOrdersCount: number;
  cancelledCount: number;
  completedCount: number;
  onDeliveryCount: number;
  toShipCount: number;
}

export interface UploadedFileData {
  fileName: string;
  fileSize: number;
  rowCount: number;
  columns: string[];
  data: Record<string, any>[];
  detectedMapping: ColumnMapping;
}

export type ExportFormat = 'xlsx' | 'csv';

export interface CourierInfo {
  name: string;
  code: string;
  trackingUrl?: (awb: string) => string;
  color: string;
  bgColor: string;
}
