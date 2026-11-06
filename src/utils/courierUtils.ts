import { CourierInfo } from '../types';

export const COURIER_CONFIGS: Record<string, CourierInfo> = {
  spx: {
    name: 'SPX Express',
    code: 'SPX',
    trackingUrl: (awb) => `https://spx.co.id/`,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
  },
  jnt: {
    name: 'J&T Express',
    code: 'J&T',
    trackingUrl: (awb) => `https://www.jet.co.id/track`,
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
  },
  sicepat: {
    name: 'SiCepat',
    code: 'SICEPAT',
    trackingUrl: (awb) => `https://www.sicepat.com/checkAwb`,
    color: 'text-rose-700',
    bgColor: 'bg-rose-50 border-rose-200',
  },
  jne: {
    name: 'JNE Express',
    code: 'JNE',
    trackingUrl: (awb) => `https://www.jne.co.id/id/tracking/trace`,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  anteraja: {
    name: 'Anteraja',
    code: 'ANTERAJA',
    trackingUrl: (awb) => `https://anteraja.id/tracking`,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
  },
  ninja: {
    name: 'Ninja Van',
    code: 'NINJA',
    trackingUrl: (awb) => `https://www.ninjaxpress.co/id-id/tracking`,
    color: 'text-red-800',
    bgColor: 'bg-red-50 border-red-200',
  },
  idexpress: {
    name: 'ID Express',
    code: 'IDEXPRESS',
    trackingUrl: (awb) => `https://idexpress.com/`,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
  },
  lion: {
    name: 'Lion Parcel',
    code: 'LION',
    trackingUrl: (awb) => `https://lionparcel.com/track`,
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
  },
  pos: {
    name: 'Pos Indonesia',
    code: 'POS',
    trackingUrl: (awb) => `https://www.posindonesia.co.id/id/tracking`,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
  },
  gosend: {
    name: 'GoSend',
    code: 'GOSEND',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 border-emerald-200',
  },
  grab: {
    name: 'GrabExpress',
    code: 'GRAB',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
  },
};

/**
 * Detects courier brand based on courier text or AWB pattern
 */
export function detectCourier(courierText?: string, awb?: string): CourierInfo {
  const cText = (courierText || '').toLowerCase();
  const awbStr = (awb || '').toUpperCase().trim();

  // Match by courier text
  if (cText.includes('spx') || cText.includes('shopee express')) return COURIER_CONFIGS.spx;
  if (cText.includes('j&t') || cText.includes('jnt')) return COURIER_CONFIGS.jnt;
  if (cText.includes('sicepat')) return COURIER_CONFIGS.sicepat;
  if (cText.includes('jne')) return COURIER_CONFIGS.jne;
  if (cText.includes('anteraja')) return COURIER_CONFIGS.anteraja;
  if (cText.includes('ninja')) return COURIER_CONFIGS.ninja;
  if (cText.includes('id express') || cText.includes('idx')) return COURIER_CONFIGS.idexpress;
  if (cText.includes('lion')) return COURIER_CONFIGS.lion;
  if (cText.includes('pos')) return COURIER_CONFIGS.pos;
  if (cText.includes('gosend') || cText.includes('go-send')) return COURIER_CONFIGS.gosend;
  if (cText.includes('grab')) return COURIER_CONFIGS.grab;

  // Match by AWB prefix pattern
  if (awbStr.startsWith('SPXID') || awbStr.startsWith('ID')) return COURIER_CONFIGS.spx;
  if (awbStr.startsWith('JP') || awbStr.startsWith('JT') || awbStr.startsWith('JX')) return COURIER_CONFIGS.jnt;
  if (awbStr.startsWith('00') && awbStr.length >= 12) return COURIER_CONFIGS.sicepat;
  if (awbStr.startsWith('TJNE') || awbStr.startsWith('SOC') || awbStr.startsWith('CGK')) return COURIER_CONFIGS.jne;
  if (awbStr.startsWith('1000') || awbStr.startsWith('1001')) return COURIER_CONFIGS.anteraja;
  if (awbStr.startsWith('NVID') || awbStr.startsWith('NLID')) return COURIER_CONFIGS.ninja;

  return {
    name: courierText ? courierText : 'Reguler',
    code: 'EXP',
    trackingUrl: (resi) => `https://cekresi.com/?noresi=${encodeURIComponent(resi)}`,
    color: 'text-slate-700',
    bgColor: 'bg-slate-50 border-slate-200',
  };
}

/**
 * Gets direct tracking URL for an AWB and optional courier name
 */
export function getTrackingUrl(awb: string, courierText?: string): string {
  const cleanAwb = (awb || '').trim();
  if (!cleanAwb || cleanAwb === '-' || cleanAwb === '0') return '';

  const courier = detectCourier(courierText, cleanAwb);
  if (courier.trackingUrl) {
    return courier.trackingUrl(cleanAwb);
  }
  return `https://cekresi.com/?noresi=${encodeURIComponent(cleanAwb)}`;
}
