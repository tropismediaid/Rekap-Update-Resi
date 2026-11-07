import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Flashlight,
  Image as ImageIcon,
  Laptop,
  RefreshCw,
  ScanBarcode,
  Smartphone,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

interface MobileScannerViewProps {
  sessionId: string;
  onExit?: () => void;
}

export const MobileScannerView: React.FC<MobileScannerViewProps> = ({
  sessionId,
  onExit,
}) => {
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  const [scanHistory, setScanHistory] = useState<string[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const unmanagedHostRef = useRef<HTMLDivElement>(null);
  const html5ScannerRef = useRef<Html5Qrcode | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTerminatedRef = useRef(false);

  // Play audio beep
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
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {}
  };

  const sendBarcodeToLaptop = async (code: string) => {
    setSendStatus('sending');
    try {
      const res = await fetch(`/api/scan-session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (res.ok) {
        setSendStatus('sent');
      } else {
        setSendStatus('error');
      }
    } catch {
      // In static deployment (e.g. GitHub Pages without server)
      setSendStatus('error');
    }
  };

  const handleBarcodeFound = (code: string) => {
    if (isTerminatedRef.current) return;
    const clean = code.trim();
    if (!clean) return;

    isTerminatedRef.current = true;
    playBeep();
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    setScannedCode(clean);
    setScanHistory((prev) => [clean, ...prev.filter((c) => c !== clean)]);

    sendBarcodeToLaptop(clean);
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
    setIsCameraActive(false);
  };

  const startScanner = async () => {
    stopScanner();
    setErrorMessage(null);
    setScannedCode(null);
    setSendStatus('idle');
    isTerminatedRef.current = false;

    const host = unmanagedHostRef.current;
    if (!host) return;

    while (host.firstChild) {
      host.removeChild(host.firstChild);
    }

    // Try native BarcodeDetector first
    const hasNativeBarcodeDetector = 'BarcodeDetector' in window;
    if (hasNativeBarcodeDetector) {
      try {
        const video = document.createElement('video');
        video.setAttribute('playsinline', 'true');
        video.setAttribute('autoplay', 'true');
        video.muted = true;
        video.className = 'w-full h-full object-cover';
        host.appendChild(video);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        videoStreamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        setIsScanning(true);
        setIsCameraActive(true);

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
        // Fallback to Html5Qrcode
      }
    }

    // Fallback using Html5Qrcode
    try {
      const mountDiv = document.createElement('div');
      mountDiv.id = 'html5-mobile-cam-' + Math.random().toString(36).substring(7);
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

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 25,
          qrbox: { width: 300, height: 180 },
          aspectRatio: 1.333,
        },
        handleBarcodeFound,
        () => {}
      );

      setIsScanning(true);
      setIsCameraActive(true);
    } catch (err: any) {
      setErrorMessage(
        err?.message?.includes('Permission')
          ? 'Izin kamera HP belum diberikan. Silakan izinkan akses kamera di browser Anda.'
          : 'Tidak dapat memulai kamera belakang HP.'
      );
      setIsScanning(false);
      setIsCameraActive(false);
    }
  };

  // Start back camera upon mounting
  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const handleScanNext = () => {
    isTerminatedRef.current = false;
    setScannedCode(null);
    setSendStatus('idle');
    startScanner();
  };

  const handleNativeCameraPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage(null);
      // Native detector
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

      // Html5Qrcode fallback
      const tempDiv = document.createElement('div');
      tempDiv.id = 'temp-mobile-scan-' + Math.random().toString(36).substring(7);
      document.body.appendChild(tempDiv);
      const html5QrCode = new Html5Qrcode(tempDiv.id);
      const text = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      tempDiv.remove();

      if (text) {
        handleBarcodeFound(text);
      }
    } catch {
      setErrorMessage('Barcode tidak terdeteksi pada foto. Pastikan garis barcode tajam dan jelas.');
    }
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none">
      {/* Top Header for Mobile */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white shadow-xs">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-bold leading-tight flex items-center gap-1.5">
              <span>Kamera Pemindai Handphone</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            </h1>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Laptop className="w-3 h-3 text-orange-400" />
              <span>Terhubung ke Sesi Komputer #{sessionId}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
            title="Toggle suara beep"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-orange-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {onExit && (
            <button
              onClick={onExit}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 ml-1"
              title="Tutup pemindai"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Viewfinder Section */}
      <main className="flex-1 flex flex-col relative p-4">
        {/* Status Notification Banner */}
        <div className="mb-3">
          {sendStatus === 'sent' && (
            <div className="p-2.5 bg-emerald-950 border border-emerald-500/50 rounded-xl flex items-center gap-2 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Berhasil dikirim ke layar komputer secara real-time!</span>
            </div>
          )}
          {sendStatus === 'sending' && (
            <div className="p-2.5 bg-blue-950 border border-blue-500/50 rounded-xl flex items-center gap-2 text-xs text-blue-200">
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
              <span>Mengirim nomor resi ke komputer...</span>
            </div>
          )}
          {sendStatus === 'error' && (
            <div className="p-2.5 bg-amber-950 border border-amber-500/50 rounded-xl flex items-center gap-2 text-xs text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Hasil tersimpan di HP. Klik salin jika ingin ditempel manual di laptop.</span>
            </div>
          )}
        </div>

        {/* Camera Container */}
        <div className="relative flex-1 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-slate-800 min-h-[300px]">
          <div ref={unmanagedHostRef} className="w-full h-full flex items-center justify-center" />

          {/* Aim Target Overlay */}
          {isScanning && !scannedCode && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
              <div className="w-[85%] max-w-xs h-[180px] border-2 border-orange-500 rounded-2xl relative shadow-[0_0_25px_rgba(249,115,22,0.4)]">
                {/* Red Laser Line */}
                <div className="w-full h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse absolute top-1/2 -translate-y-1/2" />
                <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-orange-400 rounded-tl-md" />
                <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-orange-400 rounded-tr-md" />
                <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-orange-400 rounded-bl-md" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-orange-400 rounded-br-md" />
              </div>
            </div>
          )}

          {/* Success Overlay after Scan */}
          {scannedCode && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-3">
                <Check className="w-7 h-7 text-emerald-400" />
              </div>
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">
                Resi Berhasil Terdeteksi!
              </span>
              <div className="my-3 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-lg font-bold text-white break-all shadow-inner">
                {scannedCode}
              </div>

              <div className="flex flex-col gap-2.5 w-full max-w-xs mt-2">
                <button
                  onClick={handleScanNext}
                  className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2"
                >
                  <ScanBarcode className="w-4 h-4" />
                  <span>Scan Paket Berikutnya</span>
                </button>

                <button
                  onClick={() => handleCopyCode(scannedCode)}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Nomor Resi Tersalin!' : 'Salin Nomor Resi'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Camera Error / Permission */}
          {errorMessage && (
            <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
              <p className="text-xs text-slate-300 max-w-xs mb-4">{errorMessage}</p>
              <button
                onClick={startScanner}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Coba Lagi</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Action Buttons for Mobile Phone */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {/* Native Mobile Camera Photo Trigger (capture="environment") */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleNativeCameraPhoto}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-colors"
          >
            <Camera className="w-4 h-4 text-orange-400" />
            <span>Foto Kamera Bawaan HP</span>
          </button>

          <button
            onClick={startScanner}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-blue-400" />
            <span>Restart Kamera</span>
          </button>
        </div>

        {/* Recent Scan History */}
        {scanHistory.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-2">
              Riwayat Resi yang Discan HP Ini ({scanHistory.length})
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {scanHistory.slice(0, 5).map((code) => (
                <button
                  key={code}
                  onClick={() => handleCopyCode(code)}
                  className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-[11px] font-mono text-slate-300 hover:text-white shrink-0"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer Instructions */}
      <footer className="p-3 bg-slate-900/80 border-t border-slate-800 text-center text-[11px] text-slate-400">
        💡 Arahkan kamera belakang HP ke barcode resi paket pengiriman (SPX, J&T, SiCepat, dll).
      </footer>
    </div>
  );
};
