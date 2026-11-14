import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Badge from '../../components/Badge';
import { Clock, RefreshCw, AlertTriangle, CheckCircle2, History, MapPin } from 'lucide-react';

export default function MyLoans() {
  const [activeLoans, setActiveLoans] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('current');
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState({ text: '', type: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [loansRes, histRes] = await Promise.all([
        api.get('/circulation/loans/active'),
        api.get('/circulation/loans/history')
      ]);
      if (loansRes.data.success) setActiveLoans(loansRes.data.issues);
      if (histRes.data.success) setHistory(histRes.data.history);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRenew = async (issueId) => {
    setActionMsg({ text: '', type: '' });
    try {
      const res = await api.post('/circulation/renew', { issue_id: issueId });
      if (res.data.success) {
        setActionMsg({ text: res.data.message, type: 'success' });
        fetchData();
      }
    } catch (err) {
      setActionMsg({ text: err.response?.data?.message || 'Renewal failed.', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            My Book Loans & Returns
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitor due dates, request book renewals, and track historical returns
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-xl bg-slate-200/80 p-1 dark:bg-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('current')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition-all ${
              activeTab === 'current'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Clock className="h-3.5 w-3.5" /> Active Loans ({activeLoans.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition-all ${
              activeTab === 'history'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <History className="h-3.5 w-3.5" /> Return History ({history.length})
          </button>
        </div>
      </div>

      {actionMsg.text && (
        <div className={`rounded-2xl p-4 text-xs font-semibold ${
          actionMsg.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
        }`}>
          {actionMsg.text}
        </div>
      )}

      {/* Current Loans Tab */}
      {activeTab === 'current' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading loans...</div>
          ) : activeLoans.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No active book loans</h3>
              <p className="text-xs text-slate-400 mt-1">You have no pending books to return at this time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeLoans.map((loan) => {
                const now = new Date();
                const due = new Date(loan.due_date);
                const isOverdue = due < now;
                const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

                return (
                  <div
                    key={loan.id}
                    className={`flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition-all ${
                      isOverdue
                        ? 'border-rose-200 bg-rose-50/20 dark:border-rose-900/60 dark:bg-rose-950/10'
                        : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={loan.book?.cover_image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=150&q=80'}
                            alt={loan.book?.title}
                            className="h-20 w-14 rounded-xl object-cover shadow-xs"
                          />
                          <div>
                            <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {loan.copy?.barcode}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                              {loan.book?.title}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              ISBN: {loan.book?.isbn}
                            </p>
                          </div>
                        </div>

                        <Badge status={isOverdue ? 'overdue' : 'issued'} text={isOverdue ? 'Overdue' : 'Active'} />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/40 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Issued On</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {new Date(loan.issue_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Due Date</span>
                          <span className={`font-bold ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {new Date(loan.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {isOverdue && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Overdue by {Math.abs(diffDays)} days. Accumulated Fine: ₹{Math.abs(diffDays) * 5}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 text-xs">
                        Renewals used: <strong className="text-slate-800 dark:text-slate-200">{loan.renewal_count || 0} / 2</strong>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRenew(loan.id)}
                        disabled={loan.renewal_count >= 2 || isOverdue}
                        title={isOverdue ? 'Overdue books cannot be renewed online' : loan.renewal_count >= 2 ? 'Maximum renewals used' : 'Renew for 7 additional days'}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Renew Book (+7 Days)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Book Title</th>
                  <th className="px-5 py-3.5">Barcode</th>
                  <th className="px-5 py-3.5">Issue Date</th>
                  <th className="px-5 py-3.5">Return Date</th>
                  <th className="px-5 py-3.5">Overdue Days</th>
                  <th className="px-5 py-3.5">Fine Amount</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">{h.book?.title}</td>
                    <td className="px-5 py-3.5 font-mono text-indigo-600 dark:text-indigo-400">{h.copy?.barcode}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{new Date(h.issue_date).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {h.return_date ? new Date(h.return_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {h.return_record?.overdue_days || 0}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                      ₹{h.return_record?.fine_amount || 0}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={h.status} text={h.status} size="xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
