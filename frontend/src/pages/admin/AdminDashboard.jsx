import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import MetricCard from '../../components/MetricCard';
import { 
  BookOpen, Users, ArrowLeftRight, AlertTriangle, 
  Receipt, TrendingUp, FolderTree, Database, Sliders, BarChart3
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Link } from 'react-router-dom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics/dashboard');
        if (res.data.success) {
          setAnalytics(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading || !analytics) {
    return (
      <div className="py-20 text-center text-xs font-semibold text-slate-400">
        Aggregating system metrics from relational database...
      </div>
    );
  }

  const { kpis, categoryData, monthlyTrend, classBorrowing, mostBorrowed } = analytics;

  // 1. Monthly Trends Chart
  const lineChartData = {
    labels: monthlyTrend.map(m => m.month),
    datasets: [
      {
        label: 'Books Issued',
        data: monthlyTrend.map(m => m.issued),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Books Returned',
        data: monthlyTrend.map(m => m.returned),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  // 2. Category Doughnut Chart
  const doughnutData = {
    labels: categoryData.map(c => c.name),
    datasets: [
      {
        data: categoryData.map(c => c.count),
        backgroundColor: [
          '#6366f1',
          '#3b82f6',
          '#10b981',
          '#f59e0b',
          '#ec4899',
          '#8b5cf6'
        ],
        borderWidth: 0
      }
    ]
  };

  // 3. Class-wise Bar Chart
  const barData = {
    labels: classBorrowing.map(c => c.className),
    datasets: [
      {
        label: 'Total Borrows',
        data: classBorrowing.map(c => c.count),
        backgroundColor: '#818cf8',
        borderRadius: 8
      }
    ]
  };

  return (
    <div className="space-y-8">
      {/* Admin Master Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Institutional Administration & Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time library usage indicators, relational database metrics, and master configuration
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/rules"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <Sliders className="h-3.5 w-3.5" /> Library Rules
          </Link>
          <Link
            to="/admin/reports"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
          >
            <BarChart3 className="h-3.5 w-3.5" /> Full Audit Reports
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          title="Catalog Titles"
          value={kpis.totalBooks}
          color="indigo"
        />
        <MetricCard
          title="Physical Copies"
          value={kpis.totalCopies}
          color="blue"
        />
        <MetricCard
          title="Currently Issued"
          value={kpis.issuedCopies}
          color="purple"
        />
        <MetricCard
          title="Overdue Loans"
          value={kpis.overdueLoans}
          color="rose"
        />
        <MetricCard
          title="Fines Collected"
          value={`₹${kpis.collectedFines}`}
          color="emerald"
        />
        <MetricCard
          title="Pending Dues"
          value={`₹${kpis.pendingFines}`}
          color="amber"
        />
      </div>

      {/* Primary Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Trend Line Chart (8 cols) */}
        <div className="lg:col-span-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Monthly Circulation Volume
              </h3>
              <p className="text-xs text-slate-400">Issues vs Returns comparison over the last 6 months</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" /> +18% Monthly
            </span>
          </div>
          <div className="h-72">
            <Line
              data={lineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } }
              }}
            />
          </div>
        </div>

        {/* Category Breakdown Doughnut (4 cols) */}
        <div className="lg:col-span-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Category Distribution
            </h3>
            <p className="text-xs text-slate-400">Stock distribution across academic disciplines</p>
          </div>
          <div className="h-56 my-auto flex items-center justify-center pt-2">
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
              }}
            />
          </div>
        </div>
      </div>

      {/* Secondary Row: Class-Wise Borrowing & Most Popular Titles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Class Borrowing Bar Chart (6 cols) */}
        <div className="lg:col-span-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Grade & Class-Wise Borrowing Activity
          </h3>
          <p className="text-xs text-slate-400 mb-4">Total circulation checkouts aggregated per grade</p>
          <div className="h-60">
            <Bar
              data={barData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
              }}
            />
          </div>
        </div>

        {/* Most Borrowed Titles Table (6 cols) */}
        <div className="lg:col-span-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Most Borrowed Academic Titles
            </h3>
            <p className="text-xs text-slate-400 mb-4">Highest circulation frequency this academic term</p>

            <div className="space-y-3">
              {mostBorrowed.map((b, idx) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-[11px] font-black text-white">
                      #{idx + 1}
                    </span>
                    <img
                      src={b.cover_image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=100&q=80'}
                      alt={b.title}
                      className="h-10 w-8 rounded-md object-cover shadow-xs"
                    />
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs">
                      {b.title}
                    </span>
                  </div>

                  <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                    {b.borrowCount} Checkouts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
