import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Badge from '../../components/Badge';
import BookCover from '../../components/BookCover';
import { 
  Bookmark, Clock, CheckCircle2, AlertCircle, XCircle, 
  MapPin, Calendar, RefreshCw, X, ShieldAlert 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ReservationsView() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState({ text: '', type: 'success' });
  const [cancellingId, setCancellingId] = useState(null);

  const showMsg = (text, type = 'success') => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg({ text: '', type: 'success' }), 5000);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleCancel = async (id, title) => {
    if (!window.confirm(`Are you sure you want to cancel your request for "${title}"?`)) return;
    setCancellingId(id);
    try {
      const res = await api.delete(`/reservations/${id}`);
      if (res.data.success) {
        showMsg(res.data.message || 'Request cancelled successfully.', 'success');
        fetchReservations();
      }
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to cancel reservation.', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  // Helper to format remaining hours / days until expiry
  const getExpiryDisplay = (expiryDate) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffMs = expiry - now;

    if (diffMs <= 0) {
      return { text: 'Expired', isOverdue: true };
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) {
      return { text: `Expires in ${diffHours} hour${diffHours === 1 ? '' : 's'}`, isUrgent: true };
    }
    const diffDays = Math.ceil(diffHours / 24);
    return { text: `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'} (${expiry.toLocaleDateString()})`, isUrgent: false };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Bookmark className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-serif">
              My Book Requests & Reservations
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track approvals, collection deadlines (2-day window), and status updates for books requested from Adarsh Senior Secondary School Library.
          </p>
        </div>

        <Link
          to="/student/books"
          className="inline-flex items-center gap-1.5 self-start rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs"
        >
          Explore Catalogue →
        </Link>
      </div>

      {/* Action alert */}
      {actionMsg.text && (
        <div
          className={`rounded-2xl p-4 text-xs font-semibold flex items-center justify-between ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
          }`}
        >
          <span>{actionMsg.text}</span>
          <button type="button" onClick={() => setActionMsg({ text: '', type: 'success' })}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading your book requests...</p>
        </div>
      ) : reservations.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
          <Bookmark className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No active book requests</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You have not requested or reserved any books yet. Browse the Digital Library to discover titles and submit reservation requests.
          </p>
          <Link
            to="/student/books"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
          >
            Browse Digital Library
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reservations.map((r) => {
            const b = r.book;
            const expiryInfo = r.reservation_expiry ? getExpiryDisplay(r.reservation_expiry) : null;
            const isPending = r.status === 'Pending';
            const isApproved = r.status === 'Approved' || r.status === 'Ready for Pickup';

            return (
              <div
                key={r.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-start gap-4">
                    <div className="w-16 shrink-0">
                      <BookCover
                        src={b?.cover_image}
                        title={b?.title}
                        author={b?.author?.name}
                        category={b?.category?.name}
                        className="rounded-xl shadow-xs"
                      />
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          {b?.category?.name || 'Academic'}
                        </span>
                        <Badge status={r.status} text={r.status} size="xs" />
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        {b?.title || 'Unknown Title'}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        By {b?.author?.name || 'Author'} · ISBN: {b?.isbn}
                      </p>

                      <div className="pt-1 flex items-center gap-1 text-[11px] text-slate-400">
                        <MapPin className="h-3 w-3 text-indigo-500" />
                        <span>Shelf: {b?.rack_number || 'Rack A'}, {b?.shelf_number || 'Shelf 1'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dates & Expiry Box */}
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span>Requested on:</span>
                      <strong className="text-slate-900 dark:text-white">
                        {new Date(r.requested_at || r.createdAt).toLocaleDateString()}
                      </strong>
                    </div>

                    {r.reservation_expiry && (
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span>Reservation Expiry:</span>
                        <strong className={expiryInfo?.isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}>
                          {expiryInfo ? expiryInfo.text : new Date(r.reservation_expiry).toLocaleDateString()}
                        </strong>
                      </div>
                    )}

                    {r.notes && (
                      <div className="pt-1 text-[11px] text-slate-500 italic">
                        "{r.notes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Status-specific action footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  {isPending && (
                    <>
                      <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Awaiting Librarian Review
                      </span>
                      <button
                        type="button"
                        disabled={cancellingId === r.id}
                        onClick={() => handleCancel(r.id, b?.title)}
                        className="text-rose-600 hover:underline font-bold disabled:opacity-50"
                      >
                        {cancellingId === r.id ? 'Cancelling...' : 'Cancel Request'}
                      </button>
                    </>
                  )}

                  {r.status === 'Approved' && (
                    <div className="w-full rounded-xl bg-indigo-50 p-2 text-center font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                      Approved! Please collect from the library counter within 2 days.
                    </div>
                  )}

                  {r.status === 'Ready for Pickup' && (
                    <div className="w-full rounded-xl bg-emerald-50 p-2 text-center font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Ready for Pickup! Book is held at the circulation counter.
                    </div>
                  )}

                  {r.status === 'Collected' && (
                    <div className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Book physically collected & issued
                    </div>
                  )}

                  {r.status === 'Expired' && (
                    <div className="text-slate-400 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      2-day reservation window expired (copy released)
                    </div>
                  )}

                  {r.status === 'Rejected' && (
                    <div className="text-rose-600 font-semibold flex items-center gap-1">
                      <XCircle className="h-4 w-4" />
                      Request declined by librarian
                    </div>
                  )}

                  {r.status === 'Cancelled' && (
                    <div className="text-slate-400">
                      Cancelled by student
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
