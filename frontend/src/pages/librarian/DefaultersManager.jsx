import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import {
  UserX, Search, Mail, CheckCircle2,
  AlertTriangle, RefreshCw, ArrowLeftRight
} from 'lucide-react';

export default function DefaultersManager() {
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [rangeFilter, setRangeFilter] = useState('all'); // 'all' | '1-3' | '4-7' | '8+'
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null); // { text, type: 'success' | 'error' }

  const fetchDefaulters = async () => {
    setLoading(true);
    try {
      const res = await api.get('/library/defaulters');
      if (res.data && res.data.success) {
        setDefaulters(res.data.defaulters || []);
      }
    } catch (err) {
      console.error('Failed to fetch defaulters:', err);
      setFeedbackMessage({ text: 'Unable to load defaulters list from the database.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefaulters();
  }, []);

  // Send Overdue Reminder to Student
  const handleSendReminder = async (item) => {
    setActionLoadingId(item.id);
    setFeedbackMessage(null);
    try {
      const res = await api.post(`/library/issues/${item.id}/send-reminder`);
      if (res.data && res.data.success) {
        if (res.data.simulated) {
          setFeedbackMessage({
            text: `⚠️ Simulated Delivery: SMTP credentials are not configured in backend/.env. Overdue notice logged to server console for ${item.student_name} (${res.data.recipient}). Set EMAIL_USER & EMAIL_PASSWORD in .env for real delivery.`,
            type: 'warning'
          });
        } else {
          setFeedbackMessage({
            text: `Overdue notice sent successfully to ${item.student_name} (${res.data.recipient}).`,
            type: 'success'
          });
        }
        await fetchDefaulters();
      } else {
        setFeedbackMessage({
          text: res.data?.message || 'Unable to send reminder. Please try again.',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Send reminder error:', err);
      const errMsg = err.response?.data?.message || 'Unable to send reminder email. Please check server logs.';
      setFeedbackMessage({ text: errMsg, type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick Book Return from Defaulters List
  const handleReturnBook = async (item) => {
    if (!window.confirm(`Confirm return of overdue book "${item.book_title}" from ${item.student_name}? Total fine to be settled: ₹${item.total_fine}`)) {
      return;
    }

    setActionLoadingId(item.id);
    setFeedbackMessage(null);
    try {
      const res = await api.post(`/library/issues/${item.id}/return`, { condition: 'good' });
      if (res.data && res.data.success) {
        setFeedbackMessage({
          text: `"${item.book_title}" marked as returned. Student removed from active Defaulters. Overdue fine of ₹${res.data.fine_amount} recorded for payment.`,
          type: 'success'
        });
        await fetchDefaulters();
      } else {
        setFeedbackMessage({
          text: res.data?.message || 'Failed to process book return.',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Return error:', err);
      setFeedbackMessage({ text: 'Failed to return book: ' + (err.response?.data?.message || err.message), type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered defaulters
  const filteredDefaulters = useMemo(() => {
    let result = [...defaulters];

    if (rangeFilter === '1-3') {
      result = result.filter(d => d.days_overdue >= 1 && d.days_overdue <= 3);
    } else if (rangeFilter === '4-7') {
      result = result.filter(d => d.days_overdue >= 4 && d.days_overdue <= 7);
    } else if (rangeFilter === '8+') {
      result = result.filter(d => d.days_overdue >= 8);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(d =>
        d.student_name.toLowerCase().includes(q) ||
        d.student_id.toLowerCase().includes(q) ||
        d.book_title.toLowerCase().includes(q) ||
        d.isbn.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q)
      );
    }

    return result;
  }, [defaulters, rangeFilter, searchQuery]);

  // Aggregate Fine & Counts
  const metrics = useMemo(() => {
    const totalPendingFine = defaulters.reduce((sum, d) => sum + (d.total_fine || 0), 0);
    return {
      totalDefaulters: defaulters.length,
      totalFine: totalPendingFine,
      range1to3: defaulters.filter(d => d.days_overdue >= 1 && d.days_overdue <= 3).length,
      range4to7: defaulters.filter(d => d.days_overdue >= 4 && d.days_overdue <= 7).length,
      range8plus: defaulters.filter(d => d.days_overdue >= 8).length
    };
  }, [defaulters]);

  return (
    <div className="space-y-6">
      {/* School Header Banner */}
      <div className="rounded-2xl border border-rose-200 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 p-6 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
              <UserX className="h-4 w-4" />
              <span>Adarsh Senior Secondary School • Garhi Bazidpur, Gurugram</span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Library Defaulters Register
            </h1>
            <p className="mt-1 text-xs text-rose-100 max-w-2xl">
              Students holding books past the designated due date with automatic ₹5/day fine accumulation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 px-4 py-2 text-center backdrop-blur-xs border border-white/15">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-rose-300">Active Defaulters</span>
              <span className="text-xl font-extrabold text-white">{metrics.totalDefaulters} Students</span>
            </div>
            <div className="rounded-xl bg-rose-600/40 px-4 py-2 text-center backdrop-blur-xs border border-rose-400/30">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-white/90">Accrued Fines</span>
              <span className="text-xl font-extrabold text-white">₹{metrics.totalFine}</span>
            </div>
            <button
              onClick={fetchDefaulters}
              title="Refresh Register"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/15"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Notification / Feedback Banner */}
      {feedbackMessage && (
        <div className={`flex items-center justify-between rounded-xl border p-4 text-xs font-semibold ${
          feedbackMessage.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
            : feedbackMessage.type === 'warning'
            ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200'
            : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : feedbackMessage.type === 'warning' ? (
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs & Overdue Buckets */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { label: 'All Defaulters', value: 'all', count: metrics.totalDefaulters },
          { label: '1–3 Days Overdue', value: '1-3', count: metrics.range1to3 },
          { label: '4–7 Days Overdue', value: '4-7', count: metrics.range4to7 },
          { label: '8+ Days Overdue (Critical)', value: '8+', count: metrics.range8plus }
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setRangeFilter(tab.value)}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              rangeFilter === tab.value
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
              rangeFilter === tab.value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by Student Name, Student ID, or Book Title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Defaulters Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-rose-600 border-t-transparent mb-3" />
            <p className="text-xs font-semibold">Auditing overdue circulation records...</p>
          </div>
        ) : filteredDefaulters.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No defaulters in this view.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {searchQuery ? `No defaulters match "${searchQuery}".` : 'All borrowed books are returned or within their active loan periods.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-rose-50/50 dark:border-slate-800 dark:bg-slate-800/40 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-3 text-center">Class</th>
                  <th className="py-3.5 px-4">Overdue Book Title</th>
                  <th className="py-3.5 px-3">Issue Date</th>
                  <th className="py-3.5 px-3">Due Date</th>
                  <th className="py-3.5 px-3 text-center">Days Overdue</th>
                  <th className="py-3.5 px-3 text-center">Fine Rate</th>
                  <th className="py-3.5 px-3 text-right">Total Fine</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredDefaulters.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-rose-50/40 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Student Name & ID */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block hover:text-rose-600">
                          {item.student_name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.student_id} • {item.email}
                        </span>
                      </div>
                    </td>

                    {/* Class & Section */}
                    <td className="py-3.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                      {item.class}-{item.section} (Roll: {item.roll_number})
                    </td>

                    {/* Book Title & Barcode */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block truncate max-w-xs">
                          {item.book_title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.copy_barcode ? `${item.copy_barcode} • ` : ''}{item.isbn || 'ISBN-N/A'}
                        </span>
                      </div>
                    </td>

                    {/* Issue Date */}
                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {new Date(item.issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>

                    {/* Due Date */}
                    <td className="py-3.5 px-3 font-semibold text-rose-700 dark:text-rose-400 whitespace-nowrap">
                      {new Date(item.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>

                    {/* Days Overdue */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900">
                        {item.days_overdue} days
                      </span>
                    </td>

                    {/* Fine Rate */}
                    <td className="py-3.5 px-3 text-center font-semibold text-slate-500 whitespace-nowrap">
                      ₹{item.fine_per_day}/day
                    </td>

                    {/* Total Fine */}
                    <td className="py-3.5 px-3 text-right font-black text-rose-600 dark:text-rose-400 whitespace-nowrap text-sm">
                      ₹{item.total_fine}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleSendReminder(item)}
                          disabled={actionLoadingId === item.id}
                          title="Send Overdue Fine Warning Email"
                          className="inline-flex items-center gap-1 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 text-xs font-bold transition-colors dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900 disabled:opacity-50"
                        >
                          <Mail className={`h-3.5 w-3.5 ${actionLoadingId === item.id ? 'animate-spin' : ''}`} />
                          <span>Send Reminder</span>
                        </button>

                        <button
                          onClick={() => handleReturnBook(item)}
                          disabled={actionLoadingId === item.id}
                          title="Return Book & Assess Fine"
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 text-xs font-bold transition-colors dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 disabled:opacity-50"
                        >
                          <ArrowLeftRight className="h-3.5 w-3.5" />
                          <span>Return</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
