import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  RefreshCw,
  ScanBarcode,
  SwitchCamera,
  Volume2,
  VolumeX,
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

  const [scanResult, setScanResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Dedicated unmanaged container ref to prevent React 19 reconciliation conflicts
  const unmanagedHostRef = useRef<HTMLDivElement>(null);
  const html5ScannerRef = useRef<Html5Qrcode | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTerminatedRef = useRef(false);

  // Play synthesized audio feedback using Web Audio API
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz A5 clean beep
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // AudioContext blocked or muted
    }
  };

  const handleBarcodeFound = (code: string) => {
    if (isTerminatedRef.current) return;
    const clean = code.trim();
    if (!clean) return;

    isTerminatedRef.current = true;
    playBeep();
    setScanResult(clean);

    stopScanner();

    // Auto close and send code to filter
    setTimeout(() => {
      onScanSuccess(clean);
      onClose();
    }, 600);
  };

  const stopScanner = () => {
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

    setIsScanning(false);
  };

  const startScanner = async (cameraId?: string) => {
    stopScanner();
    setErrorMessage(null);
    setIsPermissionDenied(false);
    setScanResult(null);
    isTerminatedRef.current = false;

    const host = unmanagedHostRef.current;
    if (!host) return;

    // Purge any existing DOM nodes inside host imperatively
    while (host.firstChild) {
      host.removeChild(host.firstChild);
    }

    // Check if browser supports native BarcodeDetector Web API
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

        setIsScanning(true);

        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: [
            'code_128',
            'code_39',
            'qr_code',
            'ean_13',
            'itf',
            'data_matrix',
          ],
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
            } catch {
              // Frame scan skip
            }
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
          setErrorMessage('Izin kamera tidak diberikan. Silakan izinkan akses kamera di peramban Anda.');
          return;
        }
        // If not permission error, try Html5Qrcode fallback
      }
    }

    // Fallback: Html5Qrcode mounted inside an imperatively created detached node
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

      setIsScanning(true);
    } catch (err: any) {
      if (
        err?.name === 'NotAllowedError' ||
        err?.message?.toLowerCase().includes('permission') ||
        err?.message?.toLowerCase().includes('denied')
      ) {
        setIsPermissionDenied(true);
        setErrorMessage('Izin akses kamera belum diaktifkan atau ditolak.');
      } else {
        setErrorMessage(err?.message || 'Tidak dapat memulai pemindai kamera.');
      }
      setIsScanning(false);
    }
  };

  // Enumerate cameras and auto start
  useEffect(() => {
    let isMounted = true;

    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          if (!isMounted) return;
          const videoDevs = devices
            .filter((d) => d.kind === 'videoinput')
            .map((d, index) => ({
              id: d.deviceId,
              label: d.label || `Kamera ${index + 1}`,
            }));

          if (videoDevs.length > 0) {
            setCameras(videoDevs);
            const backCam = videoDevs.find(
              (c) =>
                c.label.toLowerCase().includes('back') ||
                c.label.toLowerCase().includes('rear') ||
                c.label.toLowerCase().includes('belakang')
            );
            const chosen = backCam ? backCam.id : videoDevs[0].id;
            setSelectedCameraId(chosen);
            startScanner(chosen);
          } else {
            startScanner();
          }
        })
        .catch(() => {
          if (isMounted) startScanner();
        });
    } else {
      startScanner();
    }

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, []);

  const handleCameraChange = (newCamId: string) => {
    setSelectedCameraId(newCamId);
    startScanner(newCamId);
  };

  // Scan from photo / image upload
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage(null);

      // 1. Try native BarcodeDetector with ImageBitmap
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

      // 2. Fallback: Html5Qrcode scanFile
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-700">
              <ScanBarcode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Scan Barcode Resi</h3>
              <p className="text-[11px] text-slate-500">Arahkan kamera ke barcode paket pengiriman</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-4 bg-slate-950 relative">
          <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center min-h-[260px] aspect-4/3">
            {/* Pure unmanaged container where React 19 reconciler never compares DOM children */}
            <div
              ref={unmanagedHostRef}
              className="w-full h-full flex items-center justify-center"
            />

            {/* Permission Denied UI */}
            {isPermissionDenied && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-5 text-center text-white">
                <AlertCircle className="w-10 h-10 text-amber-400 mb-2.5" />
                <h4 className="text-sm font-bold mb-1">Akses Kamera Dibatasi</h4>
                <p className="text-xs text-slate-300 max-w-xs mb-4 leading-relaxed">
                  Izin kamera belum aktif di browser. Anda dapat mengizinkannya di pengaturan peramban atau scan barcode langsung dari foto/galeri.
                </p>
                <div className="flex flex-col gap-2 w-full max-w-xs">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors shadow-xs"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Pilih Foto / Gambar Resi</span>
                  </button>
                  <button
                    onClick={() => startScanner(selectedCameraId)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Coba Hubungkan Kamera Lagi</span>
                  </button>
                </div>
              </div>
            )}

            {/* Viewfinder Target & Laser Scanning Effect */}
            {isScanning && !scanResult && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[82%] h-[150px] border-2 border-orange-500/80 rounded-xl relative shadow-[0_0_20px_rgba(249,115,22,0.35)]">
                  {/* Laser line animated */}
                  <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse absolute top-1/2 -translate-y-1/2" />
                  {/* Corner Markers */}
                  <span className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-orange-400 rounded-tl-sm" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-orange-400 rounded-tr-sm" />
                  <span className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-orange-400 rounded-bl-sm" />
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-orange-400 rounded-br-sm" />
                </div>
              </div>
            )}

            {/* Success Overlay */}
            {scanResult && (
              <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center animate-in zoom-in-95 duration-150">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
                <span className="text-xs uppercase font-bold text-emerald-300 tracking-wider">
                  Resi Berhasil Terdeteksi!
                </span>
                <span className="text-lg font-mono font-bold text-white mt-1 break-all bg-emerald-900/60 px-3 py-1.5 rounded-lg border border-emerald-500/50 shadow-sm">
                  {scanResult}
                </span>
                <span className="text-[11px] text-emerald-200 mt-2">
                  Memfilter data tabel secara otomatis...
                </span>
              </div>
            )}
          </div>

          {/* Camera Controls & Audio Beep Toggle */}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
            {cameras.length > 1 ? (
              <div className="flex items-center gap-1.5">
                <SwitchCamera className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedCameraId}
                  onChange={(e) => handleCameraChange(e.target.value)}
                  className="bg-slate-900 text-[11px] text-slate-200 border border-slate-800 rounded px-2 py-1 focus:outline-hidden"
                >
                  {cameras.map((cam, idx) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `Kamera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Camera className="w-3 h-3" />
                {isScanning ? 'Kamera Siap' : 'Kamera Standby'}
              </span>
            )}

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-slate-400 hover:text-slate-200 p-1 flex items-center gap-1 text-[11px]"
              title={soundEnabled ? 'Matikan suara beep' : 'Nyalakan suara beep'}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-orange-400" />
                  <span>Beep ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  <span>Beep OFF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && !isPermissionDenied && (
          <div className="p-3 bg-rose-50 border-t border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileScan}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-xs"
            >
              <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Scan dari Foto / Galeri</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Tutup
            </button>
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            💡 Mendukung barcode resi <strong>Code 128</strong> (SPX, J&T, SiCepat, JNE, Ninja Van, Anteraja) &amp; QR Code.
          </p>
        </div>
      </div>
    </div>
  );
};
