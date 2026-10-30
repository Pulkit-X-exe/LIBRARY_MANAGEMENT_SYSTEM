import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import MetricCard from '../../components/MetricCard';
import { 
  BookOpen, Clock, AlertTriangle, Receipt, Bookmark, 
  ArrowLeftRight, PlusCircle, CheckCircle, BookCheck, UserX,
  ScanBarcode, BarChart3, ChevronRight, GraduationCap, Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LibrarianDashboard() {
  const [stats, setStats] = useState({
    currently_issued: 0,
    due_tomorrow: 0,
    overdue: 0,
    pending_fine: 0
  });
  const [recentIssues, setRecentIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/library/dashboard-stats');
      if (res.data && res.data.success) {
        setStats(res.data.stats || {});
        setRecentIssues(res.data.recent_issued_books || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Operations Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <GraduationCap className="h-4 w-4" />
            <span>Adarsh Senior Secondary School • Garhi Bazidpur, Gurugram</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Librarian Operations Desk
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time circulation register, due date tracking, automated defaulter fine monitoring
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/librarian/issued-books"
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
          >
            <BookCheck className="h-4 w-4" /> Issued Books Register
          </Link>
          <Link
            to="/librarian/defaulters"
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 transition-colors"
          >
            <UserX className="h-4 w-4" /> Defaulters ({stats.overdue || 0})
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Currently Issued"
          value={stats.currently_issued || 0}
          subtitle="Active borrowed titles in circulation"
          icon={BookCheck}
          color="blue"
        />
        <MetricCard
          title="Due Tomorrow"
          value={stats.due_tomorrow || 0}
          subtitle="Automated email reminder target"
          icon={Calendar}
          color="amber"
        />
        <MetricCard
          title="Overdue Loans"
          value={stats.overdue || 0}
          subtitle="Active defaulter students"
          icon={AlertTriangle}
          color="rose"
        />
        <MetricCard
          title="Pending Fine"
          value={`₹${stats.pending_fine || 0}`}
          subtitle="₹5/day overdue fine balance"
          icon={Receipt}
          color="indigo"
        />
      </div>

      {/* Currently Issued Live Register */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BookCheck className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Currently Issued Books (Recent Loans)
            </h3>
          </div>
          <Link
            to="/librarian/issued-books"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
          >
            <span>View All ({stats.currently_issued})</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {recentIssues.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
            <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No active book issues</p>
            <p className="text-[11px] text-slate-400">All library books are currently checked into inventory.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-5 py-3.5">Book Title</th>
                    <th className="px-5 py-3.5">Issue Date</th>
                    <th className="px-5 py-3.5">Due Date</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {recentIssues.map((item) => {
                    let badgeClass = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300';
                    if (item.status === 'DUE SOON' || item.status === 'DUE TODAY') {
                      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300';
                    } else if (item.status === 'OVERDUE') {
                      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300';
                    }

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                          {item.student_name}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white truncate max-w-xs">
                          {item.book_title}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                          {new Date(item.issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                          {new Date(item.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${badgeClass}`}>
                            {item.status} ({item.days_remaining_text})
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            to="/librarian/issued-books"
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400"
                          >
                            Details →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Quick Desk Links Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/librarian/issued-books"
          className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <BookCheck className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Issued Books Register</h4>
            <p className="text-xs text-slate-400 mt-0.5">Track all active circulation & due dates</p>
          </div>
        </Link>

        <Link
          to="/librarian/defaulters"
          className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-rose-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
            <UserX className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Defaulters & Overdue Fines</h4>
            <p className="text-xs text-slate-400 mt-0.5">Overdue loans accumulating ₹5/day fine</p>
          </div>
        </Link>

        <Link
          to="/librarian/students"
          className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-indigo-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Students Management</h4>
            <p className="text-xs text-slate-400 mt-0.5">Classes 9–12 cohort directory & ID cards</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
