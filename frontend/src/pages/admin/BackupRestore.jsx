import React, { useState } from 'react';
import api from '../../api/client';
import { Database, Download, Upload, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function BackupRestore() {
  const [downloading, setDownloading] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState({ text: '', type: '' });

  const handleDownloadBackup = async () => {
    setDownloading(true);
    setRestoreStatus({ text: '', type: '' });
    try {
      const res = await api.get('/backup/export', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `school_library_database_backup_${Date.now()}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      setRestoreStatus({ text: 'Relational database snapshot downloaded successfully.', type: 'success' });
    } catch (err) {
      setRestoreStatus({ text: 'Backup export failed.', type: 'error' });
    } finally {
      setDownloading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const payload = JSON.parse(event.target.result);
        const res = await api.post('/backup/restore', { backup: payload });
        if (res.data.success) {
          setRestoreStatus({ text: res.data.message, type: 'success' });
        }
      } catch (err) {
        setRestoreStatus({ text: 'Invalid JSON backup snapshot file provided.', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          Database Backup & Disaster Recovery
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Export full relational database snapshots and restore recovery images
        </p>
      </div>

      {restoreStatus.text && (
        <div className={`rounded-2xl p-4 text-xs font-semibold ${
          restoreStatus.type === 'success'
            ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
        }`}>
          {restoreStatus.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mb-4">
              <Download className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Export Database Snapshot
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Creates a complete cryptographic JSON dump of all 20+ relational database tables, users, books, copies, issue transactions, fines, and activity logs.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleDownloadBackup}
              disabled={downloading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
            >
              <Database className="h-4 w-4" /> {downloading ? 'Exporting Relational Dump...' : 'Download Full Database Backup'}
            </button>
          </div>
        </div>

        {/* Restore Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 mb-4">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Restore Database Recovery Image
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Select a previously exported snapshot file to restore system state. System verification checks integrity before processing.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="cursor-pointer flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-3 text-xs font-bold text-slate-700 hover:border-indigo-500 dark:border-slate-700 dark:text-slate-300">
              <Upload className="h-4 w-4 text-indigo-600" /> Upload Snapshot JSON
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
