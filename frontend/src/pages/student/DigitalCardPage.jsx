import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, BookOpen, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function DigitalCardPage() {
  const { user } = useAuth();
  const profile = user?.student_profile || {};
  const libraryId = profile.barcode_id || `STU-${user?.id || '1001'}`;

  const qrData = JSON.stringify({
    type: 'LIBRARY_STUDENT_CARD',
    id: user?.id,
    name: user?.name,
    class: profile.class_name,
    roll: profile.roll_number,
    barcode: libraryId
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Official Digital Library ID Card
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Presents your verified student barcode for circulation desk scanners and gate access
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
        >
          <Printer className="h-4 w-4" /> Print Card
        </button>
      </div>

      <div className="max-w-md mx-auto pt-6">
        <div className="relative overflow-hidden rounded-3xl border-2 border-indigo-500/20 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-8 text-white shadow-2xl">
          {/* Watermark accent */}
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
            <BookOpen className="h-64 w-64 text-white" />
          </div>

          <div className="flex items-center justify-between border-b border-indigo-700/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-bold shadow-sm">
                AS
              </div>
              <div>
                <h4 className="text-xs font-bold tracking-wider uppercase">Adarsh Senior Secondary School</h4>
                <p className="text-[10px] text-blue-200 uppercase tracking-widest font-semibold">Garhi Bazidpur, Gurugram</p>
              </div>
            </div>

            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="h-3 w-3" /> ACTIVE
            </span>
          </div>

          <div className="mt-6 flex flex-col items-center text-center">
            <img
              src={user?.profile_picture || user?.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80'}
              alt={user?.name}
              className="h-20 w-20 rounded-2xl object-cover ring-4 ring-blue-500/30 shadow-md"
            />
            <h3 className="mt-3 text-lg font-bold tracking-tight">{user?.name}</h3>
            <p className="text-xs text-blue-200 font-medium">
              {profile.class_name || 'Class X'} • Section {profile.section || 'A'} • Roll #{profile.roll_number || '1001'}
            </p>

            {/* QR Code Container */}
            <div className="mt-6 rounded-2xl bg-white p-4 shadow-lg">
              <QRCodeSVG value={qrData} size={140} level="M" />
              <p className="mt-2 font-mono text-xs font-extrabold tracking-wider text-slate-900">
                {libraryId}
              </p>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-indigo-700/30 flex items-center justify-between text-[10px] text-indigo-300">
            <span>Admission: {profile.admission_number || 'ADM-2024'}</span>
            <span>Academic Year 2026-27</span>
          </div>
        </div>
      </div>
    </div>
  );
}
