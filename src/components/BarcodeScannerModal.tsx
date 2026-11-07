import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Laptop,
  QrCode,
  RefreshCw,
  ScanBarcode,
  Smartphone,
  SwitchCamera,
  Volume2,
  VolumeX,
  Wifi,
  X,
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedText: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  if (!isOpen) return null;

  // Detect whether device is smartphone/mobile or desktop/laptop
  const isMobile =
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  // Default to 'phone' mode on desktop/laptop, or 'live' on mobile
  const [activeTab, setActiveTab] = useState<'phone' | 'photo' | 'webcam'>(
    isMobile ? 'webcam' : 'phone'
  );

  // Session ID for pairing mobile phone scanner to laptop
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 9));
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [isWaitingForPhone, setIsWaitingForPhone] = useState(true);

  // Scan result state
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanningWebcam, setIsScanningWebcam] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Dedicated unmanaged container ref to prevent React 19 reconciliation conflicts
  const unmanagedHostRef = useRef<HTMLDivElement>(null);
  const html5ScannerRef = useRef<Html5Qrcode | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTerminatedRef = useRef(false);

  // Play synthesized audio feedback
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {}
  };

  const handleBarcodeFound = (code: string) => {
    if (isTerminatedRef.current) return;
    const clean = code.trim();
    if (!clean) return;

    isTerminatedRef.current = true;
    playBeep();
    setScanResult(clean);
    stopWebcamScanner();

    // Auto close and pass code to parent
    setTimeout(() => {
      onScanSuccess(clean);
      onClose();
    }, 700);
  };

  // Build Mobile Scanner URL for QR Code
  const getMobileScannerUrl = () => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?mobileScan=${sessionId}`;
  };

  // Generate QR Code on mount for Phone Scanner
  useEffect(() => {
    const url = getMobileScannerUrl();
    QRCode.toDataURL(url, {
      width: 260,
      margin: 1.5,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        setQrCodeDataUrl(dataUrl);
      })
      .catch(() => {});
  }, [sessionId]);

  // Long poll or check for scanned barcodes from Phone
  useEffect(() => {
    if (isTerminatedRef.current) return;

    let isPollingActive = true;
    const pollInterval = setInterval(async () => {
      if (!isPollingActive || isTerminatedRef.current) return;
      try {
        const res = await fetch(`/api/scan-session/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.found && data.code) {
            handleBarcodeFound(data.code);
          }
        }
      } catch {
        // Server might be static or offline
      }
    }, 1400);

    return () => {
      isPollingActive = false;
      clearInterval(pollInterval);
    };
  }, [sessionId]);

  const stopWebcamScanner = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      videoStreamRef.current = null;
    }

    if (html5ScannerRef.current) {
      if (html5ScannerRef.current.isScanning) {
        html5ScannerRef.current.stop().catch(() => {});
      }
      try {
        html5ScannerRef.current.clear();
      } catch {}
      html5ScannerRef.current = null;
    }

    setIsScanningWebcam(false);
  };

  // Explicitly start camera only when user requests it or in mobile webcam tab
  const startWebcamScanner = async (cameraId?: string) => {
    stopWebcamScanner();
    setErrorMessage(null);
    setIsPermissionDenied(false);
    setScanResult(null);
    isTerminatedRef.current = false;

    const host = unmanagedHostRef.current;
    if (!host) return;

    while (host.firstChild) {
      host.removeChild(host.firstChild);
    }

    // Try native BarcodeDetector
    const hasNativeBarcodeDetector = 'BarcodeDetector' in window;
    if (hasNativeBarcodeDetector) {
      try {
        const video = document.createElement('video');
        video.setAttribute('playsinline', 'true');
        video.setAttribute('autoplay', 'true');
        video.muted = true;
        video.className = 'w-full h-full object-cover';
        host.appendChild(video);

        const videoConstraints: MediaTrackConstraints = cameraId
          ? { deviceId: { exact: cameraId } }
          : { facingMode: { ideal: 'environment' } };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            ...videoConstraints,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        videoStreamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        setIsScanningWebcam(true);

        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'code_39', 'qr_code', 'ean_13', 'itf'],
        });

        const scanLoop = async () => {
          if (isTerminatedRef.current || !video) return;

          if (video.readyState >= 2) {
            try {
              const barcodes = await barcodeDetector.detect(video);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                handleBarcodeFound(barcodes[0].rawValue);
                return;
              }
            } catch {}
          }

          animFrameRef.current = requestAnimationFrame(scanLoop);
        };

        animFrameRef.current = requestAnimationFrame(scanLoop);
        return;
      } catch (err: any) {
        if (
          err?.name === 'NotAllowedError' ||
          err?.name === 'PermissionDeniedError' ||
          err?.message?.toLowerCase().includes('permission') ||
          err?.message?.toLowerCase().includes('denied')
        ) {
          setIsPermissionDenied(true);
          setErrorMessage('Izin kamera belum aktif. Gunakan opsi Kamera HP untuk scan yang lebih mudah.');
          return;
        }
      }
    }

    // Fallback: Html5Qrcode
    try {
      const mountDiv = document.createElement('div');
      mountDiv.id = 'html5-qr-isolated-' + Math.random().toString(36).substring(7);
      mountDiv.style.width = '100%';
      host.appendChild(mountDiv);

      const html5QrCode = new Html5Qrcode(mountDiv.id, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.ITF,
        ],
        verbose: false,
      });

      html5ScannerRef.current = html5QrCode;

      const config = {
        fps: 20,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.333,
      };

      if (cameraId) {
        await html5QrCode.start(cameraId, config, handleBarcodeFound, () => {});
      } else {
        await html5QrCode.start({ facingMode: 'environment' }, config, handleBarcodeFound, () => {});
      }

      setIsScanningWebcam(true);
    } catch (err: any) {
      if (
        err?.name === 'NotAllowedError' ||
        err?.message?.toLowerCase().includes('permission') ||
        err?.message?.toLowerCase().includes('denied')
      ) {
        setIsPermissionDenied(true);
        setErrorMessage('Akses kamera ditolak. Silakan gunakan opsi Kamera HP.');
      } else {
        setErrorMessage(err?.message || 'Tidak dapat memulai kamera.');
      }
      setIsScanningWebcam(false);
    }
  };

  // Only start webcam when activeTab is 'webcam'
  useEffect(() => {
    if (activeTab === 'webcam') {
      startWebcamScanner(selectedCameraId);
    } else {
      stopWebcamScanner();
    }
    return () => {
      stopWebcamScanner();
    };
  }, [activeTab]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getMobileScannerUrl());
    setIsCopiedLink(true);
    setTimeout(() => setIsCopiedLink(false), 2000);
  };

  // Photo scan
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage(null);
      if ('BarcodeDetector' in window && 'createImageBitmap' in window) {
        try {
          const bitmap = await createImageBitmap(file);
          const detector = new (window as any).BarcodeDetector({
            formats: ['code_128', 'code_39', 'qr_code', 'ean_13', 'itf'],
          });
          const barcodes = await detector.detect(bitmap);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            handleBarcodeFound(barcodes[0].rawValue);
            return;
          }
        } catch {}
      }

      const tempDiv = document.createElement('div');
      tempDiv.id = 'temp-scan-file-' + Math.random().toString(36).substring(7);
      document.body.appendChild(tempDiv);
      const html5QrCode = new Html5Qrcode(tempDiv.id);
      const text = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      tempDiv.remove();

      if (text) {
        handleBarcodeFound(text);
      }
    } catch {
      setErrorMessage(
        'Barcode tidak terdeteksi pada gambar. Pastikan gambar resi terang, fokus, dan garis barcode terlihat jelas.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-700">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>Scan Resi via Kamera Handphone</span>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                  Praktis
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Pindai barcode paket menggunakan kamera smartphone Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('phone')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'phone'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Kamera Handphone (Scan QR)</span>
          </button>

          <button
            onClick={() => setActiveTab('photo')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'photo'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Foto Kamera HP / Galeri</span>
          </button>

          <button
            onClick={() => setActiveTab('webcam')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'webcam'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Webcam Laptop</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5">
          {/* TAB 1: Scan via Kamera Handphone (QR Code Bridge) */}
          {activeTab === 'phone' && (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-950 flex items-start gap-2.5">
                <Smartphone className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Tidak perlu mengangkat paket ke depan laptop! Cukup scan QR code di bawah pakai kamera HP Anda untuk membuka pemindai barcode secara instan.
                </p>
              </div>

              {/* QR Code Card with Radar Pulse Effect */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl relative overflow-hidden">
                <div className="relative p-2 bg-white rounded-xl shadow-sm border border-slate-200">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code Scanner HP"
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Status Indicator */}
                <div className="mt-3.5 flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Menunggu Hasil Scan dari HP Anda...</span>
                </div>

                <p className="text-[11px] text-slate-500 mt-2 text-center max-w-xs">
                  Begitu HP Anda mendeteksi resi, nomor resi akan <strong>langsung otomatis masuk</strong> ke pencarian di laptop ini.
                </p>
              </div>

              {/* Alternative Direct Link */}
              <div className="flex items-center justify-between gap-2 text-xs text-slate-600 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                <span className="truncate text-[11px]">
                  Kode Sesi Hubung: <strong className="font-mono text-slate-900">#{sessionId}</strong>
                </span>
                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors shadow-2xs shrink-0"
                >
                  {isCopiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopiedLink ? 'Link Tersalin!' : 'Salin Link HP'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Photo / Gallery Upload */}
          {activeTab === 'photo' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-2.5">
                <ImageIcon className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Pilih foto resi yang tersimpan di perangkat Anda atau foto langsung menggunakan kamera HP bawaan Anda.
                </p>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-orange-500 bg-slate-50/70 hover:bg-orange-50/30 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileScan}
                />
                <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 mb-1">
                  Ambil Foto Barcode atau Pilih dari Galeri
                </h4>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Mendukung foto barcode format JPG, PNG, atau WEBP. Barcode akan otomatis di-decode.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Webcam Laptop (Explicit Only) */}
          {activeTab === 'webcam' && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center min-h-[240px] aspect-4/3">
                <div ref={unmanagedHostRef} className="w-full h-full flex items-center justify-center" />

                {isPermissionDenied && (
                  <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-5 text-center text-white">
                    <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
                    <h4 className="text-xs font-bold mb-1">Izin Kamera Laptop Dibatasi</h4>
                    <p className="text-[11px] text-slate-300 max-w-xs mb-3">
                      Gunakan opsi <strong>Kamera Handphone</strong> untuk memindai tanpa perlu mengaktifkan webcam laptop.
                    </p>
                    <button
                      onClick={() => setActiveTab('phone')}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                    >
                      Beralih ke Kamera HP
                    </button>
                  </div>
                )}

                {isScanningWebcam && !scanResult && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[82%] h-[140px] border-2 border-orange-500 rounded-xl relative">
                      <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse absolute top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Gunakan opsi Kamera HP jika ingin lebih fleksibel.</span>
                <button
                  onClick={() => startWebcamScanner(selectedCameraId)}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-700 hover:text-slate-900 font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Restart Kamera</span>
                </button>
              </div>
            </div>
          )}

          {/* Success Result Overlay */}
          {scanResult && (
            <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-3 animate-in zoom-in-95 duration-150">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">
                  Resi Berhasil Terdeteksi!
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {scanResult}
                </span>
              </div>
            </div>
          )}

          {/* Error message */}
          {errorMessage && (
            <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500">
            Mendukung barcode resi <strong>Code 128</strong> (SPX, J&amp;T, SiCepat, JNE, Ninja Van, Anteraja).
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
