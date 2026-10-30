import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import MetricCard from '../../components/MetricCard';
import Badge from '../../components/Badge';
import { BookOpen, Clock, Bookmark, FileText, CheckCircle2, RefreshCw, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [renewMsg, setRenewMsg] = useState('');

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/circulation/loans/active');
      if (res.data.success) {
        setLoans(res.data.issues);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleRenew = async (id) => {
    try {
      const res = await api.post('/circulation/renew', { issue_id: id });
      if (res.data.success) {
        setRenewMsg(res.data.message);
        fetchLoans();
      }
    } catch (err) {
      setRenewMsg(err.response?.data?.message || 'Renewal failed.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Faculty Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
              <GraduationCap className="h-3.5 w-3.5 text-amber-400" /> Faculty Academic Portal
            </div>
            <h1 className="mt-3 text-2xl font-black sm:text-3xl tracking-tight">
              Welcome, {user?.name}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              Department: {user?.teacher_profile?.department || 'Academic Department'} • Employee ID: {user?.teacher_profile?.employee_id || 'TCH-2001'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/student/books"
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-500"
            >
              <BookOpen className="h-4 w-4" /> Academic Catalog
            </Link>
            <Link
              to="/student/digital"
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-white/20"
            >
              <FileText className="h-4 w-4" /> Research Papers
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Active Borrowings"
          value={loans.length}
          subtitle="Faculty borrowing limit: 10 books"
          icon={BookOpen}
          color="indigo"
        />
        <MetricCard
          title="Loan Duration"
          value="28 Days"
          subtitle="Extended faculty research allowance"
          icon={Clock}
          color="emerald"
        />
        <MetricCard
          title="Curriculum Reserves"
          value="Active"
          subtitle="Priority reservation privileges"
          icon={Bookmark}
          color="purple"
        />
      </div>

      {renewMsg && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-xs font-semibold text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
          {renewMsg}
        </div>
      )}

      {/* Borrowed Books */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          Active Department Borrowings ({loans.length})
        </h3>

        {loans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No books currently borrowed</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loans.map((loan) => (
              <div
                key={loan.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={loan.book?.cover_image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=150&q=80'}
                    alt={loan.book?.title}
                    className="h-20 w-14 rounded-xl object-cover shadow-xs"
                  />
                  <div>
                    <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      {loan.copy?.barcode}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {loan.book?.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Due: <strong>{new Date(loan.due_date).toLocaleDateString()}</strong>
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Badge status={loan.status} text={loan.status} size="xs" />
                  <button
                    type="button"
                    onClick={() => handleRenew(loan.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Extend Loan
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
