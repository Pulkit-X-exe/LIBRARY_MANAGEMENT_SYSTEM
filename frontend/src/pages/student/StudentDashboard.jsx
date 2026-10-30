import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import MetricCard from '../../components/MetricCard';
import Badge from '../../components/Badge';
import QRCardModal from '../../components/QRCardModal';
import { 
  BookOpen, Clock, AlertTriangle, Receipt, Bookmark, 
  Heart, Flame, CheckCircle, ArrowRight, QrCode, Sparkles,
  Calendar, MapPin, Star
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeLoans: [],
    overdueLoans: [],
    reservations: [],
    wishlistCount: 0,
    pendingFine: 0,
    recommendations: [],
    announcements: []
  });
  const [loading, setLoading] = useState(true);
  const [showQRCard, setShowQRCard] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [loansRes, resvRes, wishRes, finesRes, booksRes, annRes] = await Promise.all([
          api.get('/circulation/loans/active'),
          api.get('/reservations'),
          api.get('/wishlist'),
          api.get('/fines'),
          api.get('/books?limit=4&sort=popular'),
          api.get('/announcements')
        ]);

        const active = loansRes.data.issues || [];
        const now = new Date();
        const overdue = active.filter(i => new Date(i.due_date) < now);

        setStats({
          activeLoans: active,
          overdueLoans: overdue,
          reservations: resvRes.data.reservations || [],
          wishlistCount: (wishRes.data.wishlist || []).length,
          pendingFine: finesRes.data.totalPending || 0,
          recommendations: booksRes.data.books || [],
          announcements: annRes.data.announcements || []
        });
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md text-indigo-200 border border-white/10">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Student Academic Workspace
            </div>
            <h1 className="mt-3 text-2xl font-black sm:text-3xl tracking-tight">
              Welcome back, {user?.name}!
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
              Grade {user?.student_profile?.class_name || '10'} • Section {user?.student_profile?.section || 'A'} • Roll #{user?.student_profile?.roll_number || '1001'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowQRCard(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 shadow-md transition-all hover:bg-slate-100 hover:shadow-lg"
            >
              <QrCode className="h-4 w-4 text-indigo-600" /> Digital Library Card
            </button>
            <Link
              to="/student/books"
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-indigo-500"
            >
              <BookOpen className="h-4 w-4" /> Browse Catalog
            </Link>
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Books Issued"
          value={stats.activeLoans.length}
          subtitle="Max limit: 3 books"
          icon={BookOpen}
          color="indigo"
        />
        <MetricCard
          title="Overdue Books"
          value={stats.overdueLoans.length}
          subtitle={stats.overdueLoans.length > 0 ? "Action required" : "All clean"}
          icon={AlertTriangle}
          color={stats.overdueLoans.length > 0 ? "rose" : "emerald"}
        />
        <MetricCard
          title="Pending Fine"
          value={`₹${stats.pendingFine}`}
          subtitle="₹5/day late fee"
          icon={Receipt}
          color={stats.pendingFine > 0 ? "amber" : "emerald"}
        />
        <MetricCard
          title="Reading Streak"
          value="5 Days"
          subtitle="Top 10% reader this month"
          icon={Flame}
          color="purple"
        />
      </div>

      {/* Main 2-Column Split: Active Loans & Announcements */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Currently Issued Books */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Currently Issued Books
              </h3>
            </div>
            <Link to="/student/loans" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
              View All Loans →
            </Link>
          </div>

          {stats.activeLoans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No books currently borrowed</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Explore the academic catalog to issue your next read.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.activeLoans.map((loan) => {
                const isOverdue = new Date(loan.due_date) < new Date();
                const dueDays = Math.ceil((new Date(loan.due_date) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <div
                    key={loan.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-colors hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={loan.book?.cover_image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=150&q=80'}
                        alt={loan.book?.title}
                        className="h-16 w-12 rounded-lg object-cover shadow-xs"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{loan.book?.title}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          Copy: {loan.copy?.barcode}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-indigo-500" /> {loan.book?.rack_number}, {loan.book?.shelf_number}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center sm:flex-col sm:items-end justify-between border-t border-slate-100 sm:border-0 pt-2 sm:pt-0">
                      <Badge status={isOverdue ? 'overdue' : 'issued'} text={isOverdue ? 'Overdue' : 'Active Loan'} />
                      <span className={`text-[11px] font-bold mt-1.5 ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {isOverdue ? `Overdue by ${Math.abs(dueDays)} days` : `Due in ${dueDays} days`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Active Announcements */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Library Notices
            </h3>
          </div>

          <div className="space-y-3">
            {stats.announcements.slice(0, 3).map((ann) => (
              <div
                key={ann.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge status={ann.priority} text={ann.priority} size="xs" />
                  <span className="text-[10px] text-slate-400">
                    {new Date(ann.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                  {ann.title}
                </h4>
                <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                  {ann.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended Books Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Recommended For Your Curriculum
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Based on your borrowing history in Computer Science & Science
            </p>
          </div>
          <Link to="/student/books" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            Explore All →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.recommendations.map((b) => (
            <div
              key={b.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <img
                  src={b.cover_image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80'}
                  alt={b.title}
                  className="h-44 w-full rounded-xl object-cover shadow-xs"
                />
                <div className="mt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {b.category?.name || 'General'}
                  </span>
                  <h4 className="mt-0.5 text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                    {b.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {b.author?.name || 'Academic Author'}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-amber-500 font-bold text-[11px]">
                  <Star className="h-3.5 w-3.5 fill-current" /> {b.avg_rating || 5.0}
                </div>
                <Badge
                  status={b.available_copies > 0 ? 'available' : 'reserved'}
                  text={b.available_copies > 0 ? `${b.available_copies} available` : 'Reserved'}
                  size="xs"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Digital Library Card Modal */}
      <QRCardModal
        isOpen={showQRCard}
        onClose={() => setShowQRCard(false)}
        student={user}
      />
    </div>
  );
}
