import React, { useRef } from 'react';
import Modal from './Modal';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, BookOpen, ShieldCheck } from 'lucide-react';

export default function QRCardModal({ isOpen, onClose, student }) {
  const cardRef = useRef();

  if (!student) return null;

  const profile = student.student_profile || {};
  const libraryId = profile.barcode_id || `STU-${student.id}`;

  const qrData = JSON.stringify({
    type: 'LIBRARY_STUDENT_CARD',
    id: student.id,
    name: student.name,
    class: profile.class_name,
    roll: profile.roll_number,
    barcode: libraryId
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Digital Student Library Card" subtitle="Official academic library membership pass with verified barcode">
      <div className="space-y-6">
        {/* Printable Pass Card */}
        <div 
          ref={cardRef}
          className="relative overflow-hidden rounded-2xl border-2 border-indigo-500/20 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-6 text-white shadow-xl"
        >
          {/* Watermark Logo Accent */}
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
            <BookOpen className="h-64 w-64 text-white" />
          </div>

          {/* School Header */}
          <div className="flex items-center justify-between border-b border-indigo-700/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-extrabold shadow-sm">
                AS
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-wide uppercase">
                  Adarsh Senior Secondary School
                </h4>
                <p className="text-[11px] font-medium tracking-wider text-blue-200">
                  Garhi Bazidpur, Gurugram • Library Card
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="h-3 w-3" /> VERIFIED
            </div>
          </div>

          {/* Body with QR Code and Student Details */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-left flex-1">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Student Name</span>
                <p className="text-lg font-black tracking-tight">{student.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Class & Sec</span>
                  <p className="font-semibold text-slate-200">{profile.class_name || 'Grade 10'} — {profile.section || 'A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Roll Number</span>
                  <p className="font-semibold text-slate-200">{profile.roll_number || '1001'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Admission No.</span>
                  <p className="font-semibold text-slate-200">{profile.admission_number || 'ADM-2024'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Library ID</span>
                  <p className="font-mono font-bold text-amber-300">{libraryId}</p>
                </div>
              </div>
            </div>

            {/* High-Contrast QR Code */}
            <div className="flex flex-col items-center rounded-xl bg-white p-3 shadow-lg">
              <QRCodeSVG 
                value={qrData}
                size={120}
                level="M"
                includeMargin={false}
              />
              <span className="mt-2 font-mono text-[10px] font-bold text-slate-800 tracking-wider">
                {libraryId}
              </span>
            </div>
          </div>

          {/* Card Footer */}
          <div className="mt-6 pt-3 border-t border-indigo-700/30 flex items-center justify-between text-[10px] text-indigo-300">
            <span>Valid Academic Year 2026-2027</span>
            <span>Circulation Scan Authorized</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
          >
            <Printer className="h-4 w-4" /> Print Card
          </button>
        </div>
      </div>
    </Modal>
  );
}
