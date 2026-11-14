import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  ScanBarcode, Camera, Keyboard, AlertCircle, 
  CheckCircle2, ArrowRight, RefreshCw, X 
} from 'lucide-react';

export default function BarcodeScannerModal({ 
  isOpen, 
  onClose, 
  onScan, 
  title = 'Scan Book Barcode / Student QR' 
}) {
  const [activeMode, setActiveMode] = useState('camera'); // 'camera' or 'manual'
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cameraError, setCameraError] = useState(null);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef(null);

  // Sample pre-seeded barcodes for instant 1-click test simulation
  const sampleBarcodes = [
    { label: 'Clean Code (Copy 1)', code: 'LIB-BOOK-1001' },
    { label: 'Clean Code (Copy 2)', code: 'LIB-BOOK-1002' },
    { label: 'Algorithms (Copy 1 - Overdue)', code: 'LIB-BOOK-1006' },
    { label: 'Student Alex Morgan', code: 'STU-1001-A' },
    { label: 'Student Maya Lin', code: 'STU-1105-B' }
  ];

  // Stop camera function
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error clearing QR scanner:', err);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  // Start camera scanner
  const startCamera = async () => {
    setCameraError(null);
    setCameraStarting(true);

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your current browser.');
      }

      const html5QrCode = new Html5Qrcode('qr-camera-reader');
      scannerRef.current = html5QrCode;

      const qrCodeSuccessCallback = (decodedText) => {
        stopCamera();
        onScan(decodedText);
        onClose();
      };

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        qrCodeSuccessCallback,
        () => {} // Ignore scan failure frame attempts
      );

      setCameraActive(true);
    } catch (err) {
      console.warn('Camera startup warning:', err);
      const msg = err.name === 'NotAllowedError' || err.message?.includes('Permission')
        ? 'Camera permission was denied. Please allow camera access in browser settings, or use manual entry below.'
        : (err.message || 'Unable to open video camera.');
      setCameraError(msg);
      setActiveMode('manual');
    } finally {
      setCameraStarting(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeMode === 'camera') {
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, activeMode]);

  const handleModalClose = () => {
    stopCamera();
    onClose();
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      onScan(barcodeInput.trim());
      setBarcodeInput('');
      handleModalClose();
    }
  };

  const handleSelectPreset = (code) => {
    onScan(code);
    handleModalClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleModalClose} 
      title={title} 
      subtitle="Optical camera scanning or direct USB barcode scanner input"
    >
      <div className="space-y-5">
        {/* Mode Switcher Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveMode('camera')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 transition-all ${
              activeMode === 'camera'
                ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Camera className="h-4 w-4" /> Live Camera Scanner
          </button>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveMode('manual');
            }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 transition-all ${
              activeMode === 'manual'
                ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Keyboard className="h-4 w-4" /> Manual / USB Scanner
          </button>
        </div>

        {/* Camera Permission Denial Notice */}
        {cameraError && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-bold">Camera Access Notice</p>
              <p className="mt-0.5 leading-relaxed text-[11px] opacity-90">{cameraError}</p>
            </div>
          </div>
        )}

        {/* Camera Scanner View */}
        {activeMode === 'camera' && (
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border-2 border-indigo-500/40 bg-slate-950 min-h-[260px] flex items-center justify-center shadow-lg">
              <div id="qr-camera-reader" className="w-full"></div>
              {cameraStarting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-white gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
                  <span className="text-xs font-semibold">Initializing optical camera...</span>
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-500 dark:text-slate-400">
              Hold the student library card QR code or book barcode steadily in front of the lens
            </p>
          </div>
        )}

        {/* Manual Input / Hardware Scanner View */}
        {activeMode === 'manual' && (
          <div className="space-y-4">
            <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 py-6 dark:border-indigo-900/60 dark:bg-indigo-950/20">
              <div className="relative">
                <ScanBarcode className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-rose-500 animate-pulse"></div>
              </div>
              <p className="mt-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Awaiting Barcode Reader / Manual Input
              </p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Compatible with standard USB / Bluetooth Code128 and QR guns
              </span>
            </div>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Type or scan barcode (e.g. LIB-BOOK-1002)..."
                autoFocus
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800 font-mono"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors"
              >
                Submit <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Quick Test Barcode Buttons */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Click Quick Test Preset:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sampleBarcodes.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(item.code)}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-left text-xs transition-colors hover:border-indigo-500 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-800/80 dark:hover:border-indigo-400 dark:hover:bg-slate-800"
              >
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{item.label}</p>
                  <p className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">{item.code}</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-slate-300 dark:text-slate-600" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
