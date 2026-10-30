import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, ShieldCheck, Mail, Lock, Eye, EyeOff, BookOpen, Award, Users } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'librarian') navigate('/librarian');
      else if (user.role === 'teacher') navigate('/teacher');
      else navigate('/student');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Left Column: School Educational Identity Showcase */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-blue-900 p-12 text-white relative overflow-hidden">
        {/* Subtle institutional pattern overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/80 via-blue-900/90 to-slate-950/95 pointer-events-none"></div>

        <div className="relative z-10">
          {/* Header Brand */}
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-900 shadow-md">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white leading-tight">
                Adarsh Senior Secondary School
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                Garhi Bazidpur, Gurugram, Haryana
              </p>
            </div>
          </div>

          {/* School Vision & Core Message */}
          <div className="mt-20 max-w-lg">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-800/80 px-3.5 py-1 text-xs font-semibold text-blue-100 border border-blue-700">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" /> Official Academic & Management Portal
            </span>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl leading-snug">
              Nurturing Excellence, Integrity & Knowledge
            </h1>
            <p className="mt-4 text-sm text-blue-100/90 leading-relaxed">
              Welcome to the centralized internal portal of Adarsh Senior Secondary School. Designed to manage academic resources, student records, library circulation, and faculty coordination seamlessly.
            </p>
          </div>
        </div>

        {/* Institutional Pillars */}
        <div className="relative z-10 grid grid-cols-3 gap-3.5 pt-8 border-t border-blue-800/60 text-xs">
          <div className="rounded-xl bg-blue-950/40 p-3.5 border border-blue-800/40">
            <BookOpen className="h-4 w-4 text-amber-400 mb-1.5" />
            <h4 className="font-bold text-white">Central Library</h4>
            <p className="text-blue-200 text-[11px] mt-0.5">Automated book catalog & loans</p>
          </div>
          <div className="rounded-xl bg-blue-950/40 p-3.5 border border-blue-800/40">
            <Users className="h-4 w-4 text-emerald-400 mb-1.5" />
            <h4 className="font-bold text-white">Students & Faculty</h4>
            <p className="text-blue-200 text-[11px] mt-0.5">Dedicated portals & digital IDs</p>
          </div>
          <div className="rounded-xl bg-blue-950/40 p-3.5 border border-blue-800/40">
            <Award className="h-4 w-4 text-sky-400 mb-1.5" />
            <h4 className="font-bold text-white">Adarsh School</h4>
            <p className="text-blue-200 text-[11px] mt-0.5">Garhi Bazidpur, Gurugram</p>
          </div>
        </div>
      </div>

      {/* Right Column: Clean School Sign In Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-6 py-12 sm:px-12 xl:px-20 bg-white dark:bg-slate-900">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Branding */}
          <div className="flex items-center gap-3 lg:hidden mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white shadow-xs">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-white block">
                Adarsh Senior Secondary School
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Garhi Bazidpur, Gurugram
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sign In to School Portal
            </h2>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Please enter your registered email address and password to access your dashboard.
            </p>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school.edu"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pr-4 pl-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pr-10 pl-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-blue-700 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying Credentials...' : 'Sign In to Portal'}
            </button>
          </form>

          {/* Registration Link */}
          <div className="mt-8 text-center border-t border-slate-100 pt-6 dark:border-slate-800">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Don't have an account yet?{' '}
              <Link to="/register" className="font-bold text-blue-700 hover:underline dark:text-blue-400">
                Register as Student or Teacher
              </Link>
            </p>
            <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
              For administrative assistance, contact the school office at Garhi Bazidpur.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
