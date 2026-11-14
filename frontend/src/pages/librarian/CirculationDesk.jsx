import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Badge from '../../components/Badge';
import BarcodeScannerModal from '../../components/BarcodeScannerModal';
import { 
  ArrowLeftRight, ScanBarcode, ArrowDownLeft, ArrowUpRight, 
  CheckCircle2, AlertTriangle, UserCheck, BookOpen, Clock, 
  ShieldCheck, AlertCircle, Receipt, User, Sparkles, RefreshCw
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
  const [scannedPatron, setScannedPatron] = useState(null);
  const [scannedBook, setScannedBook] = useState(null);
  const [patronLoading, setPatronLoading] = useState(false);
  const [bookLoading, setBookLoading] = useState(false);

  const [issueLoading, setIssueLoading] = useState(false);
  const [issueResult, setIssueResult] = useState(null);

  // Return Form State
  const [returnData, setReturnData] = useState({
    copy_barcode: 'LIB-BOOK-1006',
    condition: 'good'
  });
  const [returnScannedBook, setReturnScannedBook] = useState(null);
  const [returnBookLoading, setReturnBookLoading] = useState(false);
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
    // Pre-resolve sample patron & book
    resolvePatron('STU-1001-A');
    resolveBook('LIB-BOOK-1002');
  }, []);

  // Phase 2: Live lookup of student when identifier changes or scanned
  const resolvePatron = async (identifier) => {
    if (!identifier || !identifier.trim()) return;
    setPatronLoading(true);
    try {
      const res = await api.get(`/circulation/scan-patron/${encodeURIComponent(identifier.trim())}`);
      if (res.data.success) {
        setScannedPatron(res.data);
      } else {
        setScannedPatron(null);
      }
    } catch (err) {
      setScannedPatron(null);
    } finally {
      setPatronLoading(false);
    }
  };

  // Phase 2: Live lookup of book copy when barcode changes or scanned
  const resolveBook = async (barcode) => {
    if (!barcode || !barcode.trim()) return;
    setBookLoading(true);
    try {
      const res = await api.get(`/circulation/scan-book/${encodeURIComponent(barcode.trim())}`);
      if (res.data.success) {
        setScannedBook(res.data);
      } else {
        setScannedBook(null);
      }
    } catch (err) {
      setScannedBook(null);
    } finally {
      setBookLoading(false);
    }
  };

  // Phase 2: Live lookup of return copy
  const resolveReturnBook = async (barcode) => {
    if (!barcode || !barcode.trim()) return;
    setReturnBookLoading(true);
    try {
      const res = await api.get(`/circulation/scan-book/${encodeURIComponent(barcode.trim())}`);
      if (res.data.success) {
        setReturnScannedBook(res.data);
      } else {
        setReturnScannedBook(null);
      }
    } catch (err) {
      setReturnScannedBook(null);
    } finally {
      setReturnBookLoading(false);
    }
  };

  const handleIssueSubmit = async (e) => {
    if (e) e.preventDefault();
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
        // Refresh scanned states
        resolvePatron(issueData.student_identifier);
        resolveBook(issueData.copy_barcode);
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
    if (e) e.preventDefault();
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
        resolveReturnBook(returnData.copy_barcode);
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
    // If scanned JSON object from student library card
    let cleanCode = scannedCode;
    if (scannedCode.startsWith('{') && scannedCode.endsWith('}')) {
      try {
        const parsed = JSON.parse(scannedCode);
        if (parsed.barcode) cleanCode = parsed.barcode;
        else if (parsed.roll) cleanCode = parsed.roll;
        else if (parsed.id) cleanCode = String(parsed.id);
      } catch (e) {}
    }

    if (activeTab === 'issue') {
      if (scanTargetField === 'patron') {
        setIssueData(prev => ({ ...prev, student_identifier: cleanCode }));
        resolvePatron(cleanCode);
      } else {
        setIssueData(prev => ({ ...prev, copy_barcode: cleanCode }));
        resolveBook(cleanCode);
      }
    } else {
      setReturnData(prev => ({ ...prev, copy_barcode: cleanCode }));
      resolveReturnBook(cleanCode);
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
            Rapid optical scan or manual input for instant check-in, check-out, and stock reconciliation
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
            onClick={() => {
              setActiveTab('return');
              resolveReturnBook(returnData.copy_barcode);
            }}
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
        <div className="lg:col-span-7 space-y-6">
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

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setScanTargetField('patron');
                        setScannerOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300"
                    >
                      <ScanBarcode className="h-4 w-4" /> Scan Student
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScanTargetField('barcode');
                        setScannerOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300"
                    >
                      <ScanBarcode className="h-4 w-4" /> Scan Book
                    </button>
                  </div>
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
                  {/* Step 1: Student Identifier & Live Verification Card */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        1. Patron ID / Barcode / Roll Number
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setScanTargetField('patron');
                          setScannerOpen(true);
                        }}
                        className="text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Optical Scan Card
                      </button>
                    </div>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        required
                        value={issueData.student_identifier}
                        onChange={(e) => {
                          const val = e.target.value;
                          setIssueData(p => ({ ...p, student_identifier: val }));
                          resolvePatron(val);
                        }}
                        placeholder="Scan or type STU-1001-A, Roll No, or Email..."
                        className="flex-1 font-mono rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                      />
                    </div>

                    {/* Scanned Patron Live Card */}
                    {scannedPatron && (
                      <div className="mt-2 rounded-2xl border border-blue-200/80 bg-blue-50/50 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={scannedPatron.user.profile_picture || scannedPatron.user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                            alt={scannedPatron.user.name}
                            className="h-10 w-10 rounded-xl object-cover ring-2 ring-blue-500/20"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">{scannedPatron.user.name}</span>
                              <Badge variant={scannedPatron.canBorrow ? 'success' : 'danger'}>
                                {scannedPatron.canBorrow ? 'Eligible' : 'Limit Reached'}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {scannedPatron.user.student_profile?.class_name || 'Class 10'} • Sec {scannedPatron.user.student_profile?.section || 'A'} • Holding: {scannedPatron.activeLoansCount}/{scannedPatron.maxLimit} books
                            </p>
                          </div>
                        </div>

                        {scannedPatron.pendingFines > 0 && (
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Fine Due</span>
                            <p className="font-bold text-xs text-rose-700 dark:text-rose-300">₹{scannedPatron.pendingFines}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Step 2: Book Copy Barcode & Live Verification Card */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        2. Book Physical Copy Barcode
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setScanTargetField('barcode');
                          setScannerOpen(true);
                        }}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Optical Scan Barcode
                      </button>
                    </div>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        required
                        value={issueData.copy_barcode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setIssueData(p => ({ ...p, copy_barcode: val }));
                          resolveBook(val);
                        }}
                        placeholder="Scan or type LIB-BOOK-1002..."
                        className="flex-1 font-mono rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                      />
                    </div>

                    {/* Scanned Book Live Card */}
                    {scannedBook && (
                      <div className="mt-2 rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/30 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">{scannedBook.book?.title}</span>
                            <Badge variant={scannedBook.canIssue ? 'success' : 'danger'}>
                              {scannedBook.canIssue ? 'Available' : 'Unavailable'}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {scannedBook.book?.category?.name || 'General'} • Copy: <span className="font-mono font-semibold">{scannedBook.copy?.barcode || issueData.copy_barcode}</span> • Location: {scannedBook.book?.shelf_number || 'Shelf 1'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={issueLoading}
                    className="w-full rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                  >
                    {issueLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> Completing Transaction...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Issue Book & Update Inventory
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* Return Tab */
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                      <ArrowDownLeft className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Check-In Book (Return)</h3>
                      <p className="text-[11px] text-slate-400">Calculates overdue days, late fees, and replenishes shelf copy</p>
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
                    <ScanBarcode className="h-4 w-4" /> Scan Return Book
                  </button>
                </div>

                {returnResult && (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/40">
                    <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" /> {returnResult.message}
                    </div>
                    {returnResult.fineAmount > 0 && (
                      <p className="mt-1 text-emerald-700 dark:text-emerald-400">
                        Overdue: <strong>{returnResult.overdueDays} days</strong> • Late fee generated: <strong>₹{returnResult.fineAmount}</strong>
                      </p>
                    )}
                    {returnResult.nextReservationNotified && (
                      <div className="mt-2 rounded-xl bg-blue-100/80 p-2.5 font-semibold text-blue-900 dark:bg-blue-900/50 dark:text-blue-200">
                        Reserved queue alert sent to <strong>{returnResult.nextReservationNotified}</strong> for next pickup!
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleReturnSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Book Copy Barcode
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        required
                        value={returnData.copy_barcode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setReturnData(p => ({ ...p, copy_barcode: val }));
                          resolveReturnBook(val);
                        }}
                        placeholder="Scan or type barcode (e.g. LIB-BOOK-1006)..."
                        className="flex-1 font-mono rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                      />
                    </div>

                    {/* Scanned Return Book Live Inspection */}
                    {returnScannedBook && (
                      <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white">{returnScannedBook.book?.title}</h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Holding Borrower: <strong>{returnScannedBook.activeIssue?.user?.name || 'No active loan'}</strong>
                            </p>
                          </div>
                          {returnScannedBook.overdueDays > 0 ? (
                            <div className="text-right">
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                {returnScannedBook.overdueDays} Days Overdue
                              </span>
                              <p className="mt-0.5 text-[11px] font-bold text-rose-600">Fine: ₹{returnScannedBook.fineEstimate}</p>
                            </div>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              On Time
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Physical Condition On Return
                    </label>
                    <select
                      value={returnData.condition}
                      onChange={(e) => setReturnData(p => ({ ...p, condition: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                    >
                      <option value="good">Good (Ready for shelf)</option>
                      <option value="fair">Fair (Minor wear)</option>
                      <option value="damaged">Damaged (Requires Repair / Assessment)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={returnLoading}
                    className="w-full rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                  >
                    {returnLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> Processing Check-In...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Check-In Book & Replenish Stock
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Live Desk Active Loans */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Active Circulation Loans
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">{recentLoans.length} active</span>
          </div>

          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {recentLoans.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                No active loans at this moment.
              </div>
            ) : (
              recentLoans.map((loan) => {
                const isOverdue = new Date(loan.due_date) < new Date();
                return (
                  <div
                    key={loan.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">{loan.book?.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Borrower: <strong>{loan.user?.name}</strong> • Copy: <span className="font-mono">{loan.copy?.barcode}</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Due: {new Date(loan.due_date).toLocaleDateString()}</p>
                    </div>

                    <Badge variant={isOverdue ? 'danger' : 'success'}>
                      {isOverdue ? 'Overdue' : 'Active'}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title={scanTargetField === 'patron' ? 'Scan Student QR Card' : 'Scan Book Barcode'}
      />
    </div>
  );
}
