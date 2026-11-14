import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import MetricCard from '../../components/MetricCard';
import Badge from '../../components/Badge';
import QRCardModal from '../../components/QRCardModal';
import Modal from '../../components/Modal';
import BookCover from '../../components/BookCover';
import { 
  BookOpen, Clock, AlertTriangle, Receipt, Bookmark, 
  Heart, Flame, CheckCircle, ArrowRight, QrCode, Sparkles,
  Calendar, MapPin, Star, Award, Target, Trophy, TrendingUp,
  Compass, Crown, BookMarked, UserCheck, ShieldCheck, Edit3,
  Sliders, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Chart.js registration
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function StudentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showQRCard, setShowQRCard] = useState(false);

  // States
  const [activeLoans, setActiveLoans] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  
  // Phase 3: Analytics
  const [analytics, setAnalytics] = useState({
    totalBooksBorrowed: 0,
    currentlyIssued: 0,
    booksReturned: 0,
    overdueBooks: 0,
    totalFines: 0,
    pendingFines: 0,
    readingStreak: 1,
    monthlyBooks: [],
    favouriteCategory: 'Science',
    mostReadAuthor: 'Curated Faculty'
  });

  // Phase 4: Goals & Badges
  const [goal, setGoal] = useState({
    targetBooks: 5,
    completedBooks: 0,
    progressPercent: 0,
    isAchieved: false,
    monthName: 'Current Month'
  });
  const [badges, setBadges] = useState([]);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [newGoalTarget, setNewGoalTarget] = useState(5);
  const [updatingGoal, setUpdatingGoal] = useState(false);

  // Phase 5: Leaderboard
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(true);

  // Phase 11: AI-Style Recommendations
  const [aiRecommendations, setAiRecommendations] = useState([]);

  // Phase 12: School Curated Recommendations
  const [schoolRecommendations, setSchoolRecommendations] = useState([]);

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        loansRes, annRes, analyticsRes, goalRes, badgesRes, 
        leaderboardRes, recRes, schoolRecRes
      ] = await Promise.all([
        api.get('/circulation/loans/active'),
        api.get('/announcements'),
        api.get('/analytics/student'),
        api.get('/gamification/goals'),
        api.get('/gamification/badges'),
        api.get('/gamification/leaderboard'),
        api.get('/recommendations/for-you'),
        api.get('/curated-recommendations')
      ]);

      if (loansRes.data.success) setActiveLoans(loansRes.data.issues || []);
      if (annRes.data.success) setAnnouncements(annRes.data.announcements || []);
      if (analyticsRes.data.success) setAnalytics(analyticsRes.data.analytics);
      if (goalRes.data.success) {
        setGoal(goalRes.data.goal);
        setNewGoalTarget(goalRes.data.goal.targetBooks);
      }
      if (badgesRes.data.success) setBadges(badgesRes.data.badges || []);
      if (leaderboardRes.data.success) {
        setLeaderboardEnabled(leaderboardRes.data.enabled !== false);
        setLeaderboard(leaderboardRes.data.leaderboard || []);
      }
      if (recRes.data.success) setAiRecommendations(recRes.data.recommendations || []);
      if (schoolRecRes.data.success) setSchoolRecommendations(schoolRecRes.data.recommendations || []);
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleUpdateGoal = async (e) => {
    e.preventDefault();
    setUpdatingGoal(true);
    try {
      const res = await api.post('/gamification/goals', { target_books: newGoalTarget });
      if (res.data.success) {
        showToast(res.data.message);
        setGoalModalOpen(false);
        // Reload goal
        const gRes = await api.get('/gamification/goals');
        if (gRes.data.success) setGoal(gRes.data.goal);
      }
    } catch (err) {
      showToast('Failed to update goal', 'error');
    } finally {
      setUpdatingGoal(false);
    }
  };

  // Monthly Books Read Chart Config
  const chartData = {
    labels: analytics.monthlyBooks?.map(m => m.month) || ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    datasets: [
      {
        label: 'Books Read',
        data: analytics.monthlyBooks?.map(m => m.books) || [0, 0, 0, 0, 0, 0],
        backgroundColor: '#4f46e5',
        borderRadius: 8,
        barThickness: 24
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 12 }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, color: '#94a3b8', font: { size: 11 } },
        grid: { color: 'rgba(148, 163, 184, 0.1)' }
      },
      x: {
        ticks: { color: '#94a3b8', font: { size: 11, weight: 'bold' } },
        grid: { display: false }
      }
    }
  };

  // Badge icon resolver
  const getBadgeIcon = (iconName) => {
    switch (iconName) {
      case 'BookOpen': return BookOpen;
      case 'Award': return Award;
      case 'BookMarked': return BookMarked;
      case 'Crown': return Crown;
      case 'Flame': return Flame;
      case 'Compass': return Compass;
      default: return Award;
    }
  };

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl p-4 text-xs font-semibold shadow-xl border animate-slide-up ${
          toast.type === 'success'
            ? 'bg-emerald-600 text-white border-emerald-500'
            : 'bg-rose-600 text-white border-rose-500'
        }`}>
          {toast.message}
        </div>
      )}

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
          value={analytics.currentlyIssued}
          subtitle="Max limit: 3 books"
          icon={BookOpen}
          color="indigo"
        />
        <MetricCard
          title="Overdue Books"
          value={analytics.overdueBooks}
          subtitle={analytics.overdueBooks > 0 ? "Action required" : "All clean"}
          icon={AlertTriangle}
          color={analytics.overdueBooks > 0 ? "rose" : "emerald"}
        />
        <MetricCard
          title="Pending Fine"
          value={`₹${analytics.pendingFines}`}
          subtitle="₹5/day late fee"
          icon={Receipt}
          color={analytics.pendingFines > 0 ? "amber" : "emerald"}
        />
        <MetricCard
          title="Reading Streak"
          value={`${analytics.readingStreak} Days`}
          subtitle="Calculated from real checkouts"
          icon={Flame}
          color="purple"
        />
      </div>

      {/* ====================================================
          PHASE 4: READING GOALS & GAMIFICATION SECTION
         ==================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Monthly Goal Card */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Reading Goal</h3>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{goal.monthName}</h4>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setGoalModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Edit3 className="h-3 w-3" /> Adjust Target
              </button>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {goal.completedBooks} <span className="text-sm font-semibold text-slate-400">/ {goal.targetBooks} books</span>
                </span>
                <span className={`text-xs font-bold ${goal.isAchieved ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                  {goal.progressPercent}% Completed
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    goal.isAchieved ? 'bg-emerald-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, goal.progressPercent)}%` }}
                ></div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                {goal.isAchieved
                  ? '🎉 Congratulations! You have achieved your reading goal for this month!'
                  : `Read ${Math.max(0, goal.targetBooks - goal.completedBooks)} more books to achieve your target.`}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Lifetime Borrows: <strong>{analytics.totalBooksBorrowed}</strong></span>
            <span className="text-slate-400">Returned: <strong>{analytics.booksReturned}</strong></span>
          </div>
        </div>

        {/* Right Column (7 cols): Achievements & Badges Grid */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Achievements & Badges</h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {badges.filter(b => b.unlocked).length} of {badges.length} Unlocked
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {badges.map((b) => {
              const Icon = getBadgeIcon(b.icon);
              return (
                <div
                  key={b.id}
                  className={`relative flex flex-col justify-between rounded-2xl border p-3.5 transition-all ${
                    b.unlocked
                      ? 'border-amber-300/80 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-950/20'
                      : 'border-slate-200 bg-slate-50/50 opacity-60 dark:border-slate-800 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                      b.unlocked
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {b.unlocked ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Unlocked
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-400">Locked</span>
                    )}
                  </div>

                  <div className="mt-2.5">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{b.name}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                      {b.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ====================================================
          PHASE 3: SMART READING ANALYTICS & VISUAL CHART
         ==================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Reading Activity Chart (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monthly Books Read (Past 6 Months)</h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">Verified Database Checkouts</span>
          </div>

          <div className="mt-4 h-56 w-full">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Reading Habits & Tastes (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Reader Profile Insights
            </h3>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-indigo-50/70 p-4 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Favourite Category
                </span>
                <h4 className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">
                  {analytics.favouriteCategory}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Most frequently checked out academic discipline
                </p>
              </div>

              <div className="rounded-2xl bg-purple-50/70 p-4 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Most-Read Author
                </span>
                <h4 className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">
                  {analytics.mostReadAuthor}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Preferred author across books and curriculum references
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs flex justify-between text-slate-500 dark:text-slate-400">
            <span>Wishlist: <strong>{analytics.wishlistCount} items</strong></span>
            <span>Reservations: <strong>{analytics.reservationsCount} requests</strong></span>
          </div>
        </div>
      </div>

      {/* ====================================================
          PHASE 5: LIBRARY LEADERBOARD
         ==================================================== */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">School Library Leaderboard</h3>
              <p className="text-[11px] text-slate-400">Honoring top student readers across all grades</p>
            </div>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Academic Term 2026
          </span>
        </div>

        {!leaderboardEnabled ? (
          <div className="py-12 text-center text-xs text-slate-400">
            The school reading leaderboard is currently paused by administration.
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Leaderboard rankings will update with active circulation records.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Books Read</th>
                  <th className="px-4 py-3">Streak</th>
                  <th className="px-4 py-3">Badges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {leaderboard.slice(0, 5).map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                        row.rank === 1
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : row.rank === 2
                          ? 'bg-slate-300 text-slate-900'
                          : row.rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {row.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">
                      {row.classSection}
                    </td>
                    <td className="px-4 py-3 font-extrabold text-indigo-600 dark:text-indigo-400">
                      {row.booksRead} books
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">
                      🔥 {row.streak}d
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
                        {row.badgesCount} badges
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ====================================================
          PHASE 11 & 12: RECOMMENDATIONS SECTIONS
         ==================================================== */}
      {/* 11. AI-Style Recommendations */}
      {aiRecommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Recommended For You</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  System Generated Recommendations
                </span>
              </div>
            </div>
            <Link to="/student/books" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
              Browse All →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {aiRecommendations.slice(0, 4).map((rec) => (
              <div
                key={rec.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <BookCover
                      src={rec.cover_image}
                      title={rec.title}
                      author={rec.author?.name}
                      category={rec.category?.name}
                      className="h-18 w-13 rounded-lg shadow-xs"
                    />
                    <div className="flex-1">
                      <span className="text-[10px] font-semibold text-slate-400 block">{rec.category?.name}</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {rec.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{rec.author?.name}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-indigo-50/70 p-2.5 dark:bg-indigo-950/40 text-[11px] text-indigo-800 dark:text-indigo-300 font-medium">
                    {rec.recommendation_reason}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{rec.available_copies} available</span>
                  <Link to="/student/books" className="font-bold text-indigo-600 hover:underline dark:text-indigo-400">
                    View in Catalog
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 12. School / Teacher Curated Recommendations */}
      {schoolRecommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Recommended by School</h3>
                <p className="text-[11px] text-slate-400">Selected by faculty for your academic curriculum & examinations</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {schoolRecommendations.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-4 dark:border-blue-900/40 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  <span>{item.class_name} • {item.subject || 'Curriculum'}</span>
                  <span>Faculty Choice</span>
                </div>
                <h4 className="mt-2 text-sm font-black text-slate-900 dark:text-white line-clamp-1">{item.book?.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Author: {item.book?.author?.name || 'Academic Faculty'}</p>
                {item.notes && (
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 italic">
                    "{item.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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

          <div className="space-y-3">
            {activeLoans.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                You have no books currently issued. Visit the catalog to find your next read!
              </div>
            ) : (
              activeLoans.map((loan) => {
                const isOverdue = new Date(loan.due_date) < new Date();
                return (
                  <div
                    key={loan.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">{loan.book?.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Copy: <span className="font-mono">{loan.copy?.barcode}</span> • Due: {new Date(loan.due_date).toLocaleDateString()}
                      </p>
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

        {/* Right 1 Col: Notices & Announcements */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Library Notices
          </h3>

          <div className="space-y-3">
            {announcements.slice(0, 3).map((ann) => (
              <div
                key={ann.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {ann.category}
                </span>
                <h4 className="mt-2 font-bold text-xs text-slate-900 dark:text-white">{ann.title}</h4>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{ann.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Adjust Reading Goal Modal */}
      <Modal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        title="Set Monthly Reading Goal"
        subtitle="Challenge yourself to expand your academic knowledge this month"
      >
        <form onSubmit={handleUpdateGoal} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Target Books to Read
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={newGoalTarget}
              onChange={(e) => setNewGoalTarget(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Suggested: 3–8 books per academic month
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setGoalModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingGoal}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
            >
              Save Goal
            </button>
          </div>
        </form>
      </Modal>

      {/* Student QR Card Modal */}
      <QRCardModal
        isOpen={showQRCard}
        onClose={() => setShowQRCard(false)}
        student={user}
      />
    </div>
  );
}
