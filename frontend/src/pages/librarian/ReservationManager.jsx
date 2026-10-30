import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Badge from '../../components/Badge';
import BookCover from '../../components/BookCover';
import {
  Bookmark, CheckCircle2, XCircle, Clock, Check, 
  MapPin, RefreshCw, X, AlertTriangle, ShieldCheck,
  Search, Filter, UserCheck, BookOpen
} from 'lucide-react';

export default function ReservationManager() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Reject modal
  const [rejectingRes, setRejectingRes] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
  };

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reservations');
      if (res.data.success) {
        setReservations(res.data.reservations || []);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load reservations.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  // 1. Approve
  const handleApprove = async (id, title) => {
    setActionLoadingId(id);
    try {
      const res = await api.post(`/reservations/${id}/approve`);
      if (res.data.success) {
        showToast(res.data.message || `Approved reservation for "${title}". Held for 2 days.`, 'success');
        fetchReservations();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve reservation.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. Mark Ready
  const handleMarkReady = async (id, title) => {
    setActionLoadingId(id);
    try {
      const res = await api.post(`/reservations/${id}/ready`);
      if (res.data.success) {
        showToast(`Book "${title}" marked as Ready for Pickup. Student notified.`, 'success');
        fetchReservations();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to mark ready.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Mark Collected / Issue
  const handleMarkCollected = async (id, title, studentName) => {
    if (!window.confirm(`Issue book copy of "${title}" to student ${studentName}? This will officially create a 14-day loan record.`)) {
      return;
    }
    setActionLoadingId(id);
    try {
      const res = await api.post(`/reservations/${id}/collect`);
      if (res.data.success) {
        showToast(res.data.message || `Book officially issued to ${studentName}.`, 'success');
        fetchReservations();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to issue book.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 4. Reject
  const handleConfirmReject = async () => {
    if (!rejectingRes) return;
    setActionLoadingId(rejectingRes.id);
    try {
      const res = await api.post(`/reservations/${rejectingRes.id}/reject`, {
        reason: rejectReason
      });
      if (res.data.success) {
        showToast('Reservation rejected.', 'info');
        setRejectingRes(null);
        setRejectReason('');
        fetchReservations();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject reservation.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered list
  const filtered = reservations.filter(r => {
    // Status tab filter
    if (filterStatus === 'pending' && r.status !== 'Pending') return false;
    if (filterStatus === 'approved' && !['Approved', 'Ready for Pickup'].includes(r.status)) return false;
    if (filterStatus === 'collected' && r.status !== 'Collected') return false;
    if (filterStatus === 'inactive' && !['Rejected', 'Expired', 'Cancelled'].includes(r.status)) return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const studentName = (r.user?.name || '').toLowerCase();
      const studentEmail = (r.user?.email || '').toLowerCase();
      const rollNumber = (r.user?.student_profile?.roll_number || '').toLowerCase();
      const bookTitle = (r.book?.title || '').toLowerCase();
      const isbn = (r.book?.isbn || '').toLowerCase();

      return studentName.includes(q) || studentEmail.includes(q) || rollNumber.includes(q) || bookTitle.includes(q) || isbn.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-5 py-3.5 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{toast.message}</span>
          <button type="button" onClick={() => setToast({ show: false, message: '', type: 'success' })}>
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Bookmark className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-serif">
              Book Requests & Reservation Queue
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review incoming student requests, allocate 2-day reservation windows, prepare pickup shelf locations, and issue physical copies.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReservations}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          Refresh Requests
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`rounded-xl px-3.5 py-2 font-bold transition-colors ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            All Requests ({reservations.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={`rounded-xl px-3.5 py-2 font-bold transition-colors ${
              filterStatus === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
            }`}
          >
            Pending Approval ({reservations.filter(r => r.status === 'Pending').length})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('approved')}
            className={`rounded-xl px-3.5 py-2 font-bold transition-colors ${
              filterStatus === 'approved'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300'
            }`}
          >
            Approved / Ready ({reservations.filter(r => ['Approved', 'Ready for Pickup'].includes(r.status)).length})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('collected')}
            className={`rounded-xl px-3.5 py-2 font-bold transition-colors ${
              filterStatus === 'collected'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
          >
            Collected & Issued ({reservations.filter(r => r.status === 'Collected').length})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('inactive')}
            className={`rounded-xl px-3.5 py-2 font-bold transition-colors ${
              filterStatus === 'inactive'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Expired / Rejected ({reservations.filter(r => ['Rejected', 'Expired', 'Cancelled'].includes(r.status)).length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, book, ISBN..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Main Table / Requests List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading library book requests...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
          <Bookmark className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No requests in this view</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            There are currently no book reservation requests matching the selected filter.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Student Patron</th>
                <th className="py-3.5 px-4">Book Details</th>
                <th className="py-3.5 px-4">Location & Stock</th>
                <th className="py-3.5 px-4">Timeline / 2-Day Expiry</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Librarian Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((r) => {
                const b = r.book;
                const u = r.user;
                const prof = u?.student_profile;
                const isBusy = actionLoadingId === r.id;

                return (
                  <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Student Column */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {u?.name || 'Student'}
                      </div>
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                        {prof?.class_name ? `Class ${prof.class_name}` : 'Student'} {prof?.section ? `· Sec ${prof.section}` : ''}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Roll: {prof?.roll_number || 'N/A'} {prof?.admission_number ? `· Adm: ${prof.admission_number}` : ''}
                      </div>
                    </td>

                    {/* Book Column */}
                    <td className="py-3.5 px-4 align-top max-w-[260px]">
                      <div className="flex items-start gap-3">
                        <div className="w-10 shrink-0">
                          <BookCover
                            src={b?.cover_image}
                            title={b?.title}
                            category={b?.category?.name}
                            className="rounded-md shadow-2xs aspect-[2/3]"
                          />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                            {b?.title || 'Unknown Title'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            By {b?.author?.name || 'Author'}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            ISBN: {b?.isbn}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Location & Stock */}
                    <td className="py-3.5 px-4 align-top whitespace-nowrap">
                      <div className="text-slate-700 dark:text-slate-300 font-medium">
                        {b?.rack_number || 'Rack A'} · {b?.shelf_number || 'Shelf 1'}
                      </div>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          (b?.available_copies ?? 0) > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}>
                          {b?.available_copies ?? 0} available of {b?.total_copies ?? 1}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Held: {b?.reserved_copies ?? 0} · Issued: {b?.issued_copies ?? 0}
                      </div>
                    </td>

                    {/* Timeline / 2-Day Expiry */}
                    <td className="py-3.5 px-4 align-top whitespace-nowrap">
                      <div className="text-slate-600 dark:text-slate-300 text-[11px]">
                        Req: <strong>{new Date(r.requested_at || r.createdAt).toLocaleDateString()}</strong>
                      </div>
                      {r.reservation_expiry ? (
                        <div className="mt-1 text-[11px]">
                          <span className="text-slate-400 block text-[10px]">2-Day Window:</span>
                          <strong className={new Date(r.reservation_expiry) < new Date() ? 'text-rose-600' : 'text-amber-600 dark:text-amber-400'}>
                            Until {new Date(r.reservation_expiry).toLocaleDateString()}
                          </strong>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 mt-1 italic">
                          Awaiting approval
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 align-top whitespace-nowrap">
                      <Badge status={r.status} text={r.status} size="xs" />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status === 'Pending' && (
                          <>
                            <button
                              type="button"
                              disabled={isBusy || (b?.available_copies ?? 0) <= 0}
                              onClick={() => handleApprove(r.id, b?.title)}
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-2xs"
                              title={(b?.available_copies ?? 0) <= 0 ? 'No copies available in stock' : 'Approve 2-day hold'}
                            >
                              <Check className="h-3 w-3" />
                              Approve
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setRejectingRes(r);
                                setRejectReason('');
                              }}
                              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {r.status === 'Approved' && (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleMarkReady(r.id, b?.title)}
                              className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-[11px] font-bold text-teal-700 hover:bg-teal-100 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-300 transition-colors"
                            >
                              Mark Ready
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleMarkCollected(r.id, b?.title, u?.name)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                            >
                              <UserCheck className="h-3 w-3" />
                              Issue Book
                            </button>
                          </>
                        )}

                        {r.status === 'Ready for Pickup' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleMarkCollected(r.id, b?.title, u?.name)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                          >
                            <UserCheck className="h-3 w-3" />
                            Issue Book
                          </button>
                        )}

                        {['Collected', 'Expired', 'Rejected', 'Cancelled'].includes(r.status) && (
                          <span className="text-[11px] text-slate-400 italic">
                            Completed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {rejectingRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Decline Book Request
              </h3>
              <button
                type="button"
                onClick={() => setRejectingRes(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Are you sure you want to decline the request for <strong>"{rejectingRes.book?.title}"</strong> submitted by <strong>{rejectingRes.user?.name}</strong>?
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Reason for rejection (sent to student):
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Physical copy undergoing binding repair / Reserved for curriculum exam..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectingRes(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-xs"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
