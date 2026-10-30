import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import Badge from '../../components/Badge';
import BookCover from '../../components/BookCover';
import { useAuth } from '../../context/AuthContext';
import {
  Search, Filter, Heart, BookOpen, Clock, CheckCircle2,
  AlertCircle, ChevronRight, X, Sparkles, TrendingUp,
  MapPin, Layers, Award, Calendar, BookMarked, Info,
  ShieldCheck, RefreshCw, Bookmark
} from 'lucide-react';

const CATEGORY_LIST = [
  'All',
  'Fiction',
  'Science',
  'Mathematics',
  'Computer Science',
  'Literature',
  'History',
  'Geography',
  'Biography',
  'Reference',
  'School Curriculum',
  'Competitive Exams',
  'General Knowledge'
];

export default function BrowseBooks() {
  const { user } = useAuth();

  // Data states
  const [books, setBooks] = useState([]);
  const [discoveryStats, setDiscoveryStats] = useState(null);
  const [wishlistBookIds, setWishlistBookIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [availability, setAvailability] = useState('all');
  const [condition, setCondition] = useState('all');
  const [language, setLanguage] = useState('all');
  const [sort, setSort] = useState('newest');

  // Modals
  const [selectedBook, setSelectedBook] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reservingBook, setReservingBook] = useState(null);
  const [reservationNotes, setReservationNotes] = useState('');
  const [submittingReservation, setSubmittingReservation] = useState(false);

  // Notifications / Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4500);
  };

  // Fetch Discovery Stats (Top statistics, popular, recently added)
  const fetchDiscoveryStats = async () => {
    try {
      setStatsLoading(true);
      const res = await api.get('/books/discovery-stats');
      if (res.data.success) {
        setDiscoveryStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load discovery stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch Student Wishlist
  const fetchWishlist = async () => {
    try {
      const res = await api.get('/wishlist');
      if (res.data.success && Array.isArray(res.data.wishlist)) {
        const ids = new Set(res.data.wishlist.map(item => item.book_id));
        setWishlistBookIds(ids);
      }
    } catch (err) {
      console.error('Failed to fetch wishlist:', err);
    }
  };

  // Fetch Catalog Books
  const fetchBooks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (category && category !== 'All') params.append('category', category);
      if (availability && availability !== 'all') params.append('availability', availability);
      if (condition && condition !== 'all') params.append('condition', condition);
      if (language && language !== 'all') params.append('language', language);
      if (sort) params.append('sort', sort);
      params.append('limit', '100');

      const res = await api.get(`/books?${params.toString()}`);
      if (res.data.success) {
        setBooks(res.data.books || []);
      }
    } catch (err) {
      console.error('Failed to fetch books:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscoveryStats();
    fetchWishlist();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, category, availability, condition, language, sort]);

  // Wishlist toggle
  const handleToggleWishlist = async (book, e) => {
    if (e) e.stopPropagation();
    try {
      const isCurrentlyWishlisted = wishlistBookIds.has(book.id);
      const res = await api.post('/wishlist/toggle', { book_id: book.id });
      if (res.data.success) {
        setWishlistBookIds(prev => {
          const next = new Set(prev);
          if (isCurrentlyWishlisted) {
            next.delete(book.id);
            showToast(`Removed "${book.title}" from your wishlist.`, 'info');
          } else {
            next.add(book.id);
            showToast(`Added "${book.title}" to your wishlist.`, 'success');
          }
          return next;
        });
      }
    } catch (err) {
      showToast('Unable to update wishlist. Please try again.', 'error');
    }
  };

  // Open Book Details Modal
  const handleOpenDetails = async (book) => {
    setSelectedBook(book);
    setDetailLoading(true);
    try {
      const res = await api.get(`/books/${book.id}`);
      if (res.data.success && res.data.book) {
        setSelectedBook(res.data.book);
      }
    } catch (err) {
      console.error('Error loading book details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Submit Reservation
  const handleSubmitReservation = async () => {
    if (!reservingBook) return;
    setSubmittingReservation(true);
    try {
      const res = await api.post('/reservations', {
        book_id: reservingBook.id,
        notes: reservationNotes
      });

      if (res.data.success) {
        showToast(
          res.data.message || 'Reservation request submitted. Awaiting librarian review.',
          'success'
        );
        setReservingBook(null);
        setReservationNotes('');
        if (selectedBook && selectedBook.id === reservingBook.id) {
          handleOpenDetails(reservingBook);
        }
        fetchBooks();
        fetchDiscoveryStats();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to submit reservation request.';
      showToast(msg, 'error');
    } finally {
      setSubmittingReservation(false);
    }
  };

  // Stock availability helper
  const getStockStatus = (book) => {
    const avail = book.available_copies ?? 0;
    const total = book.total_copies ?? 1;

    if (avail <= 0) {
      return {
        label: 'Currently Unavailable',
        badgeStatus: 'currently unavailable',
        color: 'text-rose-600 dark:text-rose-400',
        canReserve: false,
        text: '0 copies available'
      };
    }
    if (avail === 1) {
      return {
        label: 'Limited Copies',
        badgeStatus: 'limited copies',
        color: 'text-amber-600 dark:text-amber-400',
        canReserve: true,
        text: `Only 1 of ${total} copies available`
      };
    }
    return {
      label: 'Available Now',
      badgeStatus: 'available now',
      color: 'text-emerald-600 dark:text-emerald-400',
      canReserve: true,
      text: `${avail} of ${total} copies available`
    };
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-5 py-3.5 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
          {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-600" />}
          {toast.type === 'info' && <Info className="h-5 w-5 text-indigo-600" />}
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast({ show: false, message: '', type: 'success' })}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ====================================================
          1. ACADEMIC DISCOVERY HEADER & SCHOOL IDENTITY
         ==================================================== */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-md">
        {/* Subtle background crest accent */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-indigo-200 border border-white/10">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              <span>Adarsh Senior Secondary School · Garhi Bazidpur, Gurugram</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-serif">
              Digital Library Discovery
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Discover books available in the Adarsh Senior Secondary School Library. Browse our curated 200+ academic catalogue, track real-time shelf stock, save items to your wishlist, and submit reservation requests for counter pickup.
            </p>
          </div>

          {/* Institutional Stamp */}
          <div className="shrink-0 hidden lg:flex flex-col items-end border-l border-white/10 pl-6 text-right">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400">School Library Section</span>
            <span className="text-xs font-semibold text-slate-200 mt-1">Librarian Counter Active</span>
            <span className="text-[11px] text-slate-400 mt-0.5">Pickups: 08:30 AM – 03:00 PM</span>
          </div>
        </div>

        {/* Live Academic Statistics Bar */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-white/10 pt-6">
          <div className="rounded-2xl bg-white/5 p-3.5 border border-white/5">
            <div className="text-[11px] font-medium text-slate-400">Total Catalogue</div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-white">
              {statsLoading ? '...' : `${discoveryStats?.stats?.total_titles || 200}+`}
            </div>
            <div className="text-[10px] text-indigo-300 mt-0.5">
              {statsLoading ? '' : `${discoveryStats?.stats?.total_copies || 890} physical copies`}
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 p-3.5 border border-white/5">
            <div className="text-[11px] font-medium text-slate-400">Available on Shelf</div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-emerald-400">
              {statsLoading ? '...' : (discoveryStats?.stats?.available_copies ?? 0)}
            </div>
            <div className="text-[10px] text-emerald-300/80 mt-0.5">Ready for reservation</div>
          </div>

          <div className="rounded-2xl bg-white/5 p-3.5 border border-white/5">
            <div className="text-[11px] font-medium text-slate-400">Currently Issued</div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-blue-400">
              {statsLoading ? '...' : (discoveryStats?.stats?.issued_copies ?? 0)}
            </div>
            <div className="text-[10px] text-blue-300/80 mt-0.5">Active student loans</div>
          </div>

          <div className="rounded-2xl bg-white/5 p-3.5 border border-white/5">
            <div className="text-[11px] font-medium text-slate-400">Held / Reserved</div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-amber-400">
              {statsLoading ? '...' : (discoveryStats?.stats?.reserved_copies ?? 0)}
            </div>
            <div className="text-[10px] text-amber-300/80 mt-0.5">2-day pickup window</div>
          </div>
        </div>
      </div>

      {/* ====================================================
          2. "POPULAR IN OUR LIBRARY" (TOP BORROWED TITLES)
         ==================================================== */}
      {discoveryStats?.popular_books && discoveryStats.popular_books.length > 0 && !search && category === 'All' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Popular in Our Library
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">Based on verified circulation loans</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {discoveryStats.popular_books.slice(0, 6).map((pop) => {
              const stock = getStockStatus(pop);
              return (
                <div
                  key={pop.id}
                  onClick={() => handleOpenDetails(pop)}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md cursor-pointer dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="relative">
                    <BookCover
                      src={pop.cover_image}
                      title={pop.title}
                      author={pop.author?.name}
                      category={pop.category?.name}
                      className="shadow-xs rounded-xl"
                    />
                    <div className="absolute top-1.5 right-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleToggleWishlist(pop, e)}
                        className={`rounded-full p-1.5 backdrop-blur-md transition-colors ${
                          wishlistBookIds.has(pop.id)
                            ? 'bg-rose-500 text-white'
                            : 'bg-black/40 text-white hover:bg-rose-500'
                        }`}
                        title="Wishlist"
                      >
                        <Heart className="h-3 w-3 fill-current" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5 space-y-1">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {pop.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {pop.author?.name || 'Academic Author'}
                    </p>
                    <div className="pt-1 flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {pop.available_copies} avail
                      </span>
                      <span className="text-slate-400 text-[9px]">
                        {pop.borrow_count} loans
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ====================================================
          3. SEARCH & ADVANCED FILTER CONTROLS
         ==================================================== */}
      <section className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, author, ISBN, subject, publisher, or keywords..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-11 pr-10 py-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {CATEGORY_LIST.map((cat) => {
            const isSelected = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`shrink-0 rounded-xl px-3.5 py-1.5 font-semibold transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Secondary Filters Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Availability */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Availability
            </label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">All Inventory</option>
              <option value="available_now">Available Now (1+ copies)</option>
              <option value="limited">Limited (Only 1 copy)</option>
              <option value="unavailable">Currently Unavailable (0 copies)</option>
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">All Conditions</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Needs Repair">Needs Repair</option>
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">All Languages</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Sanskrit">Sanskrit</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Sort By
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="newest">Recently Added</option>
              <option value="popular">Most Popular (Loans)</option>
              <option value="available">Most Available Stock</option>
              <option value="az">Title: A to Z</option>
              <option value="za">Title: Z to A</option>
              <option value="author_az">Author: A to Z</option>
            </select>
          </div>
        </div>
      </section>

      {/* ====================================================
          4. CATALOGUE GRID (200 REALISTIC TITLES)
         ==================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing <strong className="text-slate-900 dark:text-white">{books.length}</strong> books in library catalogue
          </div>
          {(search || category !== 'All' || availability !== 'all' || condition !== 'all' || language !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategory('All');
                setAvailability('all');
                setCondition('all');
                setLanguage('all');
                setSort('newest');
              }}
              className="text-indigo-600 hover:underline font-semibold dark:text-indigo-400"
            >
              Reset all filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Searching library inventory...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
            <BookOpen className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No books found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              We couldn't find any books matching your search or filters. Try adjusting your query or category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {books.map((book) => {
              const stock = getStockStatus(book);
              const isWishlisted = wishlistBookIds.has(book.id);

              return (
                <div
                  key={book.id}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    {/* Cover + Overlay Badges */}
                    <div className="relative mb-3">
                      <BookCover
                        src={book.cover_image}
                        title={book.title}
                        author={book.author?.name}
                        category={book.category?.name}
                        className="shadow-xs rounded-xl"
                      />

                      {/* Availability status badge */}
                      <div className="absolute top-2 left-2">
                        <Badge status={stock.badgeStatus} text={stock.label} size="xs" />
                      </div>

                      {/* Wishlist Heart Button */}
                      <div className="absolute top-2 right-2">
                        <button
                          type="button"
                          onClick={(e) => handleToggleWishlist(book, e)}
                          className={`rounded-full p-2 backdrop-blur-md transition-transform active:scale-90 ${
                            isWishlisted
                              ? 'bg-rose-500 text-white shadow-sm'
                              : 'bg-black/40 text-white hover:bg-rose-500'
                          }`}
                          title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                        >
                          <Heart className="h-3.5 w-3.5 fill-current" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          {book.category?.name || 'Academic'}
                        </span>
                        <span className="text-slate-400">
                          {book.language || 'English'}
                        </span>
                      </div>

                      <h3
                        onClick={() => handleOpenDetails(book)}
                        className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 hover:text-indigo-600 cursor-pointer transition-colors"
                        title={book.title}
                      >
                        {book.title}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        By {book.author?.name || 'Author'}
                      </p>

                      {/* Stock availability line */}
                      <div className="pt-2 text-[11px] flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400">Available:</span>
                        <strong className={stock.color}>{stock.text}</strong>
                      </div>

                      {/* Shelf & Condition line */}
                      <div className="text-[11px] flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-indigo-500" />
                          {book.rack_number || 'Rack A'} · {book.shelf_number || 'Shelf 1'}
                        </span>
                        <span className="capitalize">
                          Condition: <strong className="text-slate-700 dark:text-slate-300">{book.condition || 'Good'}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(book)}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      View Details
                    </button>

                    {stock.canReserve ? (
                      <button
                        type="button"
                        onClick={() => {
                          setReservingBook(book);
                          setReservationNotes('');
                        }}
                        className="flex-1 rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs"
                      >
                        Request / Reserve
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleToggleWishlist(book, e)}
                        className="flex-1 rounded-xl border border-rose-200 bg-rose-50/60 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400 transition-colors"
                        title="Add to wishlist to track when copies become available"
                      >
                        {isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ====================================================
          5. BOOK DETAILS MODAL (FULL METADATA & STOCK BREAKDOWN)
         ==================================================== */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedBook(null)}
              className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>

            {detailLoading ? (
              <div className="py-20 text-center space-y-2">
                <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Loading comprehensive book details...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Top Header: Cover + Primary info */}
                <div className="flex flex-col sm:flex-row gap-5">
                  <div className="w-28 sm:w-36 shrink-0">
                    <BookCover
                      src={selectedBook.cover_image}
                      title={selectedBook.title}
                      author={selectedBook.author?.name}
                      category={selectedBook.category?.name}
                      className="rounded-2xl shadow-md"
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {selectedBook.category?.name || 'Academic'}
                      </span>
                      <span>·</span>
                      <span className="text-xs text-slate-500">
                        {selectedBook.subject?.name || 'Curriculum'}
                      </span>
                    </div>

                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                      {selectedBook.title}
                    </h2>

                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      By <strong className="text-slate-900 dark:text-white">{selectedBook.author?.name || 'Academic Author'}</strong>
                    </p>

                    {/* Stock Status Badge */}
                    <div className="pt-2">
                      <Badge
                        status={getStockStatus(selectedBook).badgeStatus}
                        text={getStockStatus(selectedBook).text}
                      />
                    </div>

                    {/* Action buttons inside details */}
                    <div className="pt-3 flex items-center gap-3">
                      {getStockStatus(selectedBook).canReserve ? (
                        <button
                          type="button"
                          onClick={() => {
                            setReservingBook(selectedBook);
                            setReservationNotes('');
                          }}
                          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs"
                        >
                          Request / Reserve Book
                        </button>
                      ) : (
                        <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                          Currently unavailable for online reservation
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleToggleWishlist(selectedBook, e)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors ${
                          wishlistBookIds.has(selectedBook.id)
                            ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <Heart className="h-3.5 w-3.5 fill-current" />
                        {wishlistBookIds.has(selectedBook.id) ? 'Wishlisted' : 'Add to Wishlist'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* About this Book / Summary */}
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    About this Book
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedBook.description || selectedBook.short_summary || 'No description provided for this academic title.'}
                  </p>
                </div>

                {/* Book Information Grid */}
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Book Information
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">ISBN</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">{selectedBook.isbn}</strong>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Publisher</span>
                      <strong className="text-slate-800 dark:text-slate-200 truncate block">{selectedBook.publisher?.name || 'School Board'}</strong>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Publication Year</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedBook.publication_year || '2024'}</strong>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Edition</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedBook.edition || '1st'}</strong>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Language</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedBook.language || 'English'}</strong>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Pages</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedBook.pages || 250} pages</strong>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Shelf Location</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedBook.rack_number || 'Rack A'} · {selectedBook.shelf_number || 'Shelf 1'}</strong>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Condition</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedBook.condition || 'Good'}</strong>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Circulation History</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedBook.borrow_count || 0} times borrowed</strong>
                    </div>
                  </div>
                </div>

                {/* Library Availability Breakdown */}
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Library Stock & Copies Breakdown
                  </h4>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 block">Total</span>
                      <strong className="text-slate-900 dark:text-white text-sm">{selectedBook.total_copies ?? 0}</strong>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                      <span className="text-[10px] text-emerald-600 block">Available</span>
                      <strong className="text-emerald-700 dark:text-emerald-300 text-sm">{selectedBook.available_copies ?? 0}</strong>
                    </div>
                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-2 dark:border-blue-900/60 dark:bg-blue-950/20">
                      <span className="text-[10px] text-blue-600 block">Issued</span>
                      <strong className="text-blue-700 dark:text-blue-300 text-sm">{selectedBook.issued_copies ?? 0}</strong>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2 dark:border-amber-900/60 dark:bg-amber-950/20">
                      <span className="text-[10px] text-amber-600 block">Reserved</span>
                      <strong className="text-amber-700 dark:text-amber-300 text-sm">{selectedBook.reserved_copies ?? 0}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================
          6. RESERVATION CONFIRMATION MODAL (2-DAY POLICY)
         ==================================================== */}
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
                  Author: <span className="text-slate-800 dark:text-slate-200">{reservingBook.author?.name || 'Author'}</span>
                </p>
                <p className="text-slate-500">
                  Current availability: <strong className="text-emerald-600">{reservingBook.available_copies} copies available</strong>
                </p>
              </div>

              {/* 2-Day Policy Banner */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>Reservation Window: Exactly 2 Days</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  If approved by the librarian, this reservation will remain valid for 2 days. The librarian will notify you when the book is ready for collection at the school library counter.
                </p>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Optional notes for librarian:
                </label>
                <textarea
                  value={reservationNotes}
                  onChange={(e) => setReservationNotes(e.target.value)}
                  placeholder="e.g. Needed for Class 10 Board prep / Physics project..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Modal Buttons */}
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
