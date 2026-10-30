import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Badge from '../../components/Badge';
import BarcodeScannerModal from '../../components/BarcodeScannerModal';
import { 
  ArrowLeftRight, ScanBarcode, ArrowDownLeft, ArrowUpRight, 
  CheckCircle2, AlertTriangle, UserCheck, BookOpen, Clock
} from 'lucide-react';

export default function CirculationDesk() {
  const [activeTab, setActiveTab] = useState('issue');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanTargetField, setScanTargetField] = useState('barcode'); // 'barcode' or 'patron'

  // Issue Form State
  const [issueData, setIssueData] = useState({
    copy_barcode: 'LIB-BOOK-1002',
    student_identifier: 'STU-1001-A'
  });
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueResult, setIssueResult] = useState(null);

  // Return Form State
  const [returnData, setReturnData] = useState({
    copy_barcode: 'LIB-BOOK-1006',
    condition: 'good'
  });
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnResult, setReturnResult] = useState(null);

  // Recent Transactions
  const [recentLoans, setRecentLoans] = useState([]);

  const fetchRecent = async () => {
    try {
      const res = await api.get('/circulation/loans/active');
      if (res.data.success) {
        setRecentLoans(res.data.issues || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRecent();
  }, []);

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    setIssueLoading(true);
    setIssueResult(null);
    try {
      const res = await api.post('/circulation/issue', {
        copy_barcode: issueData.copy_barcode,
        student_identifier: issueData.student_identifier
      });
      if (res.data.success) {
        setIssueResult({
          success: true,
          message: res.data.message,
          data: res.data.issue
        });
        fetchRecent();
      }
    } catch (err) {
      setIssueResult({
        success: false,
        message: err.response?.data?.message || 'Issue failed.'
      });
    } finally {
      setIssueLoading(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    setReturnLoading(true);
    setReturnResult(null);
    try {
      const res = await api.post('/circulation/return', {
        copy_barcode: returnData.copy_barcode,
        condition: returnData.condition
      });
      if (res.data.success) {
        setReturnResult({
          success: true,
          message: res.data.message,
          overdueDays: res.data.overdueDays,
          fineAmount: res.data.fineAmount,
          nextReservationNotified: res.data.nextReservationNotified
        });
        fetchRecent();
      }
    } catch (err) {
      setReturnResult({
        success: false,
        message: err.response?.data?.message || 'Return failed.'
      });
    } finally {
      setReturnLoading(false);
    }
  };

  const handleBarcodeScanned = (scannedCode) => {
    if (activeTab === 'issue') {
      if (scanTargetField === 'patron') {
        setIssueData(prev => ({ ...prev, student_identifier: scannedCode }));
      } else {
        setIssueData(prev => ({ ...prev, copy_barcode: scannedCode }));
      }
    } else {
      setReturnData(prev => ({ ...prev, copy_barcode: scannedCode }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Live Circulation Terminal
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rapid optical scan or manual input for instant check-in, check-out, and waitlist allocations
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-2xl bg-slate-200/80 p-1 dark:bg-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('issue')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 transition-all ${
              activeTab === 'issue'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ArrowUpRight className="h-4 w-4" /> Check-Out (Issue)
          </button>
          <button
            onClick={() => setActiveTab('return')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 transition-all ${
              activeTab === 'return'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ArrowDownLeft className="h-4 w-4" /> Check-In (Return)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Terminal Action Form */}
        <div className="lg:col-span-7">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {activeTab === 'issue' ? (
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Issue Book to Patron</h3>
                      <p className="text-[11px] text-slate-400">Enforces student max 3 books, teacher max 10 books</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setScanTargetField('barcode');
                      setScannerOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300"
                  >
                    <ScanBarcode className="h-4 w-4" /> Scan Barcode
                  </button>
                </div>

                {issueResult && (
                  <div className={`mt-4 rounded-2xl p-4 text-xs font-semibold ${
                    issueResult.success
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
                  }`}>
                    {issueResult.message}
                  </div>
                )}

                <form onSubmit={handleIssueSubmit} className="mt-6 space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Book Copy Barcode
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setScanTargetField('barcode');
                          setScannerOpen(true);
                        }}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Choose Sample Preset
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={issueData.copy_barcode}
                      onChange={(e) => setIssueData(p => ({ ...p, copy_barcode: e.target.value }))}
                      placeholder="e.g. LIB-BOOK-1002"
                      className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Borrower ID / Roll No. / Admission No. / Barcode
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setScanTargetField('patron');
                          setScannerOpen(true);
                        }}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Scan Student ID Card
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={issueData.student_identifier}
                      onChange={(e) => setIssueData(p => ({ ...p, student_identifier: e.target.value }))}
                      placeholder="e.g. STU-1001-A, student@school.edu, or 1001"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={issueLoading}
                    className="w-full rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 mt-2"
                  >
                    {issueLoading ? 'Processing Circulation Transaction...' : 'Complete Check-Out'}
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                      <ArrowDownLeft className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Return Book (Check-In)</h3>
                      <p className="text-[11px] text-slate-400">Calculates late fine, updates inventory, notifies waitlists</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setScanTargetField('barcode');
                      setScannerOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300"
                  >
                    <ScanBarcode className="h-4 w-4" /> Scan Barcode
                  </button>
                </div>

                {returnResult && (
                  <div className={`mt-4 rounded-2xl p-4 text-xs font-semibold ${
                    returnResult.success
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
                  }`}>
                    <p>{returnResult.message}</p>
                    {returnResult.fineAmount > 0 && (
                      <p className="mt-1 font-bold text-rose-700 dark:text-rose-300">
                        ⚠️ Late fine generated: ₹{returnResult.fineAmount} ({returnResult.overdueDays} days late)
                      </p>
                    )}
                    {returnResult.nextReservationNotified && (
                      <p className="mt-1 font-bold text-purple-700 dark:text-purple-300">
                        ⚡ Priority Waitlist Alerted: {returnResult.nextReservationNotified} has been notified to pick up this copy.
                      </p>
                    )}
                  </div>
                )}

                <form onSubmit={handleReturnSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Returned Book Copy Barcode
                    </label>
                    <input
                      type="text"
                      required
                      value={returnData.copy_barcode}
                      onChange={(e) => setReturnData(p => ({ ...p, copy_barcode: e.target.value }))}
                      placeholder="e.g. LIB-BOOK-1006 (or LIB-BOOK-1001)"
                      className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Physical Condition On Return
                    </label>
                    <select
                      value={returnData.condition}
                      onChange={(e) => setReturnData(p => ({ ...p, condition: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      <option value="good">Good (Normal Condition)</option>
                      <option value="fair">Fair (Minor Wear)</option>
                      <option value="damaged">Damaged (Needs Inspection / Repair)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={returnLoading}
                    className="w-full rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-50 mt-2"
                  >
                    {returnLoading ? 'Checking In Book...' : 'Check-In & Reconcile'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Currently Active Loans Feed */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Circulation Roster ({recentLoans.length})
            </h3>
            <span className="text-[11px] text-slate-400">Real-time DB feed</span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
            {recentLoans.map((loan) => {
              const isOverdue = new Date(loan.due_date) < new Date();
              return (
                <div
                  key={loan.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      {loan.copy?.barcode}
                    </span>
                    <Badge status={isOverdue ? 'overdue' : 'issued'} text={isOverdue ? 'Overdue' : 'Issued'} size="xs" />
                  </div>

                  <h4 className="mt-1 text-xs font-bold text-slate-900 dark:text-white truncate">
                    {loan.book?.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Patron: <strong className="text-slate-700 dark:text-slate-300">{loan.user?.name}</strong> ({loan.user?.role})
                  </p>

                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Due: {new Date(loan.due_date).toLocaleDateString()}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('return');
                        setReturnData(p => ({ ...p, copy_barcode: loan.copy?.barcode }));
                      }}
                      className="font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Check-In Copy →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Optical Barcode Scanner Simulator Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title={scanTargetField === 'patron' ? 'Scan Student ID Card' : 'Scan Physical Book Barcode'}
      />
    </div>
  );
}
