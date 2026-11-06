import { ColumnMapping } from '../types';

const SYNONYMS = {
  orderId: [
    'no. pesanan',
    'nomor pesanan',
    'no pesanan',
    'order id',
    'order_id',
    'order_sn',
    'order sn',
    'order number',
    'no order',
    'id pesanan',
    'kode pesanan',
  ],
  orderStatus: [
    'status pesanan',
    'status order',
    'status',
    'order status',
    'order_status',
    'status pengiriman',
    'keadaan pesanan',
  ],
  trackingNumber: [
    'no. resi',
    'nomor resi',
    'no resi',
    'tracking number',
    'tracking no',
    'tracking_number',
    'tracking_no',
    'airway bill',
    'awb',
    'no. resi pengiriman',
    'resi',
    'resi pengiriman',
  ],
  courier: [
    'opsi pengiriman',
    'jasa kirim',
    'kurir',
    'ekspedisi',
    'shipping option',
    'shipping carrier',
    'courier',
    'logistic channel',
    'metode pengiriman',
  ],
  productName: [
    'nama produk',
    'product name',
    'produk',
    'rincian produk',
    'nama barang',
    'item name',
  ],
  buyerUsername: [
    'username (pembeli)',
    'username pembeli',
    'nama pembeli',
    'buyer username',
    'pembeli',
    'customer name',
    'nama penerima',
  ],
  totalPrice: [
    'total pembayaran',
    'total pesanan',
    'total harga',
    'total amount',
    'grand total',
    'total',
  ],
};

function normalizeHeader(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().replace(/\s+/g, ' ');
}

/**
 * Searches a list of columns for best matching candidate based on synonyms
 */
function findBestMatch(columns: string[], synonymList: string[]): string {
  // 1. Exact match (case insensitive)
  for (const col of columns) {
    const norm = normalizeHeader(col);
    for (const syn of synonymList) {
      if (norm === normalizeHeader(syn)) {
        return col;
      }
    }
  }

  // 2. Starts with / includes match
  for (const col of columns) {
    const norm = normalizeHeader(col);
    for (const syn of synonymList) {
      const synNorm = normalizeHeader(syn);
      if (norm.includes(synNorm) || synNorm.includes(norm)) {
        return col;
      }
    }
  }

  return '';
}

/**
 * Automatically detects column mapping from uploaded spreadsheet headers
 */
export function autoDetectColumnMapping(columns: string[]): ColumnMapping {
  const orderIdCol = findBestMatch(columns, SYNONYMS.orderId) || columns[0] || '';
  const orderStatusCol = findBestMatch(columns, SYNONYMS.orderStatus) || (columns.length > 1 ? columns[1] : '');
  const trackingNumberCol = findBestMatch(columns, SYNONYMS.trackingNumber) || (columns.length > 2 ? columns[2] : '');
  const courierCol = findBestMatch(columns, SYNONYMS.courier);
  const productNameCol = findBestMatch(columns, SYNONYMS.productName);
  const buyerUsernameCol = findBestMatch(columns, SYNONYMS.buyerUsername);
  const totalPriceCol = findBestMatch(columns, SYNONYMS.totalPrice);

  return {
    orderIdCol,
    orderStatusCol,
    trackingNumberCol,
    courierCol: courierCol || undefined,
    productNameCol: productNameCol || undefined,
    buyerUsernameCol: buyerUsernameCol || undefined,
    totalPriceCol: totalPriceCol || undefined,
  };
}
