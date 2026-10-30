import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Badge from '../../components/Badge';
import BookCover from '../../components/BookCover';
import { Heart, Trash2, MapPin, RefreshCw, Bookmark, Clock, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WishlistView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reservingBook, setReservingBook] = useState(null);
  const [reservationNotes, setReservationNotes] = useState('');
  const [submittingReservation, setSubmittingReservation] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4500);
  };

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const res = await api.get('/wishlist');
      if (res.data.success) {
        setItems(res.data.wishlist || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (bookId, title) => {
    try {
      await api.post('/wishlist/toggle', { book_id: bookId });
      setItems(prev => prev.filter(i => i.book_id !== bookId));
      showToast(`Removed "${title}" from your wishlist.`, 'info');
    } catch (err) {
      showToast('Failed to remove from wishlist.', 'error');
    }
  };

  const handleSubmitReservation = async () => {
    if (!reservingBook) return;
    setSubmittingReservation(true);
    try {
      const res = await api.post('/reservations', {
        book_id: reservingBook.id,
        notes: reservationNotes
      });
      if (res.data.success) {
        showToast(res.data.message || 'Reservation request submitted.', 'success');
        setReservingBook(null);
        setReservationNotes('');
        fetchWishlist();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit reservation.', 'error');
    } finally {
      setSubmittingReservation(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
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
            <Heart className="h-6 w-6 text-rose-500 fill-rose-500" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-serif">
              My Academic Wishlist
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Personal list of curriculum textbooks, literature, and competitive exam books saved for future reading.
          </p>
        </div>

        <Link
          to="/student/books"
          className="inline-flex items-center gap-1.5 self-start rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs"
        >
          Explore Catalogue →
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading your wishlist...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
          <Heart className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Your wishlist is empty</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Browse the school library catalogue and click the heart icon to save books you want to read or request later.
          </p>
          <Link
            to="/student/books"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
          >
            Browse Books
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => {
            const b = item.book;
            if (!b) return null;
            const isAvailable = (b.available_copies || 0) > 0;

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-start gap-3">
                    <div className="w-20 shrink-0">
                      <BookCover
                        src={b.cover_image}
                        title={b.title}
                        author={b.author?.name}
                        category={b.category?.name}
                        className="rounded-xl shadow-xs"
                      />
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          {b.category?.name || 'Academic'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemove(b.id, b.title)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors"
                          title="Remove from wishlist"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                        {b.title}
                      </h3>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        By {b.author?.name || 'Author'}
                      </p>

                      <div className="pt-1 flex items-center gap-1 text-[10px] text-slate-400">
                        <MapPin className="h-3 w-3 text-indigo-500" />
                        <span>{b.rack_number || 'Rack A'}, {b.shelf_number || 'Shelf 1'}</span>
                      </div>

                      <div className="pt-1">
                        {isAvailable ? (
                          <Badge
                            status="available now"
                            text={`Available Now (${b.available_copies} copies)`}
                            size="xs"
                          />
                        ) : (
                          <Badge
                            status="currently unavailable"
                            text="Currently Unavailable"
                            size="xs"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-[10px] text-slate-400 border-t border-slate-100 pt-2 dark:border-slate-800">
                    Saved on: {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Link
                    to="/student/books"
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    View in Catalog
                  </Link>

                  {isAvailable ? (
                    <button
                      type="button"
                      onClick={() => {
                        setReservingBook(b);
                        setReservationNotes('');
                      }}
                      className="flex-1 rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs"
                    >
                      Request Book
                    </button>
                  ) : (
                    <span className="flex-1 text-center text-[11px] text-slate-400 italic py-2">
                      Out of stock
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reservation confirmation modal */}
      {reservingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Reserve Book
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReservingBook(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60 space-y-1">
                <p className="text-slate-500">You are requesting:</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  "{reservingBook.title}"
                </p>
                <p className="text-slate-500">
                  Current availability: <strong className="text-emerald-600">{reservingBook.available_copies} copies available</strong>
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>2-Day Reservation Window</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  If approved by the librarian, this reservation will remain valid for 2 days. The librarian will notify you when the book is ready for collection.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Optional notes for librarian:
                </label>
                <textarea
                  value={reservationNotes}
                  onChange={(e) => setReservationNotes(e.target.value)}
                  placeholder="e.g. Needed for revision..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReservingBook(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingReservation}
                onClick={handleSubmitReservation}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-xs"
              >
                {submittingReservation ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
