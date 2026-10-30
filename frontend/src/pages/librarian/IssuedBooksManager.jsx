import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import {
  BookCheck, Search, Mail, CheckCircle2,
  AlertTriangle, RefreshCw, BookOpen, ArrowLeftRight
} from 'lucide-react';

export default function IssuedBooksManager() {
  const [issuedBooks, setIssuedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'DUE SOON' | 'DUE TODAY' | 'OVERDUE'
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null); // { text, type: 'success' | 'error' }

  const fetchIssuedBooks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/library/issues/active');
      if (res.data && res.data.success) {
        setIssuedBooks(res.data.issued_books || []);
      }
    } catch (err) {
      console.error('Failed to fetch issued books:', err);
      setFeedbackMessage({ text: 'Unable to load issued books from the database.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssuedBooks();
  }, []);

  // Manual Send Reminder Handler
  const handleSendReminder = async (issue) => {
    setActionLoadingId(issue.id);
    setFeedbackMessage(null);
    try {
      const res = await api.post(`/library/issues/${issue.id}/send-reminder`);
      if (res.data && res.data.success) {
        if (res.data.simulated) {
          setFeedbackMessage({
            text: `⚠️ Simulated Delivery: SMTP credentials are not configured in backend/.env. Reminder logged to server console for ${issue.student_name} (${res.data.recipient}). Set EMAIL_USER & EMAIL_PASSWORD in .env for real inbox delivery.`,
            type: 'warning'
          });
        } else {
          setFeedbackMessage({
            text: `Reminder email dispatched successfully to ${issue.student_name} (${res.data.recipient}).`,
            type: 'success'
          });
        }
        // Refresh to update last reminder timestamp
        await fetchIssuedBooks();
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

  // Quick Book Return Handler
  const handleReturnBook = async (issue) => {
    if (!window.confirm(`Confirm return of "${issue.book_title}" from ${issue.student_name}?`)) {
      return;
    }

    setActionLoadingId(issue.id);
    setFeedbackMessage(null);
    try {
      const res = await api.post(`/library/issues/${issue.id}/return`, { condition: 'good' });
      if (res.data && res.data.success) {
        setFeedbackMessage({
          text: `"${issue.book_title}" returned successfully.${res.data.fine_amount > 0 ? ` Overdue fine assessed: ₹${res.data.fine_amount}` : ''}`,
          type: 'success'
        });
        await fetchIssuedBooks();
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

  // Filtered list
  const filteredBooks = useMemo(() => {
    let result = [...issuedBooks];

    if (statusFilter !== 'ALL') {
      result = result.filter(b => b.status.toUpperCase() === statusFilter.toUpperCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(b =>
        b.student_name.toLowerCase().includes(q) ||
        b.student_id.toLowerCase().includes(q) ||
        b.book_title.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q) ||
        String(b.roll_number).toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.class.toLowerCase().includes(q)
      );
    }

    return result;
  }, [issuedBooks, statusFilter, searchQuery]);

  // Counts by status
  const counts = useMemo(() => {
    return {
      all: issuedBooks.length,
      active: issuedBooks.filter(b => b.status === 'ACTIVE').length,
      dueSoon: issuedBooks.filter(b => b.status === 'DUE SOON').length,
      dueToday: issuedBooks.filter(b => b.status === 'DUE TODAY').length,
      overdue: issuedBooks.filter(b => b.status === 'OVERDUE').length
    };
  }, [issuedBooks]);

  return (
    <div className="space-y-6">
      {/* School Header Banner */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200">
              <BookCheck className="h-4 w-4" />
              <span>Adarsh Senior Secondary School • Garhi Bazidpur, Gurugram</span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Currently Issued Books
            </h1>
            <p className="mt-1 text-xs text-blue-100 max-w-2xl">
              Complete live circulation register of physical library books currently borrowed by students.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 px-4 py-2 text-center backdrop-blur-xs border border-white/15">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-blue-200">Currently Holding</span>
              <span className="text-xl font-extrabold text-white">{issuedBooks.length} Books</span>
            </div>
            <button
              onClick={fetchIssuedBooks}
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

      {/* Status Filter Tabs & Summary Row */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { label: 'All Issues', value: 'ALL', count: counts.all, color: 'text-slate-700 bg-slate-100' },
          { label: 'Active', value: 'ACTIVE', count: counts.active, color: 'text-blue-700 bg-blue-50' },
          { label: 'Due Soon (1 Day)', value: 'DUE SOON', count: counts.dueSoon, color: 'text-amber-700 bg-amber-50' },
          { label: 'Due Today', value: 'DUE TODAY', count: counts.dueToday, color: 'text-purple-700 bg-purple-50' },
          { label: 'Overdue', value: 'OVERDUE', count: counts.overdue, color: 'text-rose-700 bg-rose-50' }
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              statusFilter === tab.value
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
              statusFilter === tab.value ? 'bg-white/20 text-white' : tab.color
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
          placeholder="Search by Student Name, Student ID, Book Title, ISBN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
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

      {/* Main Issued Books Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3" />
            <p className="text-xs font-semibold">Loading active circulation records from database...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <BookOpen className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No issued books matching this view.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {searchQuery ? `No results found for "${searchQuery}".` : 'All issued books are accounted for.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/40 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-3 text-center">Class</th>
                  <th className="py-3.5 px-3 text-center">Roll No</th>
                  <th className="py-3.5 px-4">Book Title & ISBN</th>
                  <th className="py-3.5 px-3">Issue Date</th>
                  <th className="py-3.5 px-3">Due Date</th>
                  <th className="py-3.5 px-3">Days Remaining</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredBooks.map((item) => {
                  let statusBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300';
                  if (item.status === 'DUE SOON') {
                    statusBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300';
                  } else if (item.status === 'DUE TODAY') {
                    statusBadgeClass = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300';
                  } else if (item.status === 'OVERDUE') {
                    statusBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300';
                  }

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Student Info */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block hover:text-blue-600">
                            {item.student_name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.student_id} • {item.email}
                          </span>
                        </div>
                      </td>

                      {/* Class & Section */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        {item.class}-{item.section}
                      </td>

                      {/* Roll No */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        {String(item.roll_number).padStart(2, '0')}
                      </td>

                      {/* Book Details */}
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
                        {new Date(item.issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {new Date(item.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Days Remaining / Overdue */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`font-bold text-[11px] ${
                          item.status === 'OVERDUE'
                            ? 'text-rose-600 dark:text-rose-400'
                            : item.status === 'DUE TODAY' || item.status === 'DUE SOON'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {item.days_remaining_text}
                        </span>
                        {item.fine_amount > 0 && (
                          <span className="block text-[10px] text-rose-500 font-semibold">Fine: ₹{item.fine_amount}</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${statusBadgeClass}`}>
                          {item.status}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleSendReminder(item)}
                            disabled={actionLoadingId === item.id}
                            title="Send email reminder to student"
                            className="inline-flex items-center gap-1 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 text-xs font-bold transition-colors dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900 disabled:opacity-50"
                          >
                            <Mail className={`h-3.5 w-3.5 ${actionLoadingId === item.id ? 'animate-spin' : ''}`} />
                            <span>Send Reminder</span>
                          </button>

                          <button
                            onClick={() => handleReturnBook(item)}
                            disabled={actionLoadingId === item.id}
                            title="Mark book as returned"
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 text-xs font-bold transition-colors dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 disabled:opacity-50"
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                            <span>Return</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
