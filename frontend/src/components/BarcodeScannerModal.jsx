import React, { useState } from 'react';
import Modal from './Modal';
import { ScanBarcode, CheckCircle2, ArrowRight } from 'lucide-react';

export default function BarcodeScannerModal({ isOpen, onClose, onScan, title = 'Scan Book Barcode / Student QR' }) {
  const [barcodeInput, setBarcodeInput] = useState('');

  // Sample pre-seeded barcodes for instant 1-click test simulation
  const sampleBarcodes = [
    { label: 'Clean Code (Copy 1)', code: 'LIB-BOOK-1001' },
    { label: 'Clean Code (Copy 2)', code: 'LIB-BOOK-1002' },
    { label: 'Algorithms (Copy 1 - Overdue)', code: 'LIB-BOOK-1006' },
    { label: 'Student Alex Morgan', code: 'STU-1001-A' },
    { label: 'Student Maya Lin', code: 'STU-1105-B' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      onScan(barcodeInput.trim());
      setBarcodeInput('');
      onClose();
    }
  };

  const handleSelect = (code) => {
    onScan(code);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} subtitle="Use handheld USB scanner, camera simulator, or quick select presets below">
      <div className="space-y-6">
        {/* Scanner Graphic Simulator */}
        <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 py-8 dark:border-indigo-900/60 dark:bg-indigo-950/20">
          <div className="relative">
            <ScanBarcode className="h-16 w-16 text-indigo-600 dark:text-indigo-400" />
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-rose-500 animate-pulse"></div>
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            Scanner Ready • Awaiting Optical / USB Input
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Compatible with standard HID Code128, QR Code, and ISBN Barcode Scanners
          </span>
        </div>

        {/* Manual Barcode Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            placeholder="Type or scan barcode (e.g. LIB-BOOK-1001)..."
            autoFocus
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
          >
            Submit <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>

        {/* Quick Test Barcode Buttons */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Click Quick Test Barcode:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sampleBarcodes.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(item.code)}
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
