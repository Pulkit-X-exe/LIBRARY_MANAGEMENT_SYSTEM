import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  BookOpen,
  Award,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Clock
} from 'lucide-react';

export default function ForgotPassword() {
  // Steps: 1: Email, 2: Verification Code (OTP), 3: New Password, 4: Success
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resetAuthToken, setResetAuthToken] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRefs = useRef([]);
  const { requestPasswordReset, verifyPasswordResetCode, completePasswordReset } = useAuth();
  const navigate = useNavigate();

  // Explicitly ensure old errors are never restored on page load/mount
  useEffect(() => {
    setError('');
    setIsRateLimited(false);
    setInfoMessage('');
    try {
      sessionStorage.removeItem('forgot_password_error');
      sessionStorage.removeItem('forgot_pwd_state');
      localStorage.removeItem('forgot_password_error');
    } catch {
      // safe fallback
    }
  }, []);

  // Resend Cooldown Timer (30s)
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Mask email for privacy (e.g. s***@gmail.com)
  const maskEmail = (str) => {
    if (!str || !str.includes('@')) return str;
    const [name, domain] = str.split('@');
    if (name.length <= 2) {
      return `${name[0]}***@${domain}`;
    }
    return `${name[0]}***${name[name.length - 1]}@${domain}`;
  };

  // STEP 1: Submit Email for 6-Digit OTP
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setIsRateLimited(false);
    setInfoMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await requestPasswordReset(cleanEmail);
      // ONLY advance to Step 2 if the backend confirms success: true
      if (response && response.success === true) {
        setResendCooldown(30);
        setOtpDigits(['', '', '', '', '', '']);
        setStep(2);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 100);
      } else {
        setError(response?.message || 'Unable to send verification code. Please try again.');
      }
    } catch (err) {
      const is429 = err.response?.status === 429;
      const is404 = err.response?.status === 404;
      const is400 = err.response?.status === 400;
      setIsRateLimited(is429);
      if (is429) {
        setError(err.response?.data?.message || 'Too many requests. Please try again later.');
      } else if (is404) {
        setError(err.response?.data?.message || 'No account is registered with this email address.');
      } else if (is400) {
        setError(err.response?.data?.message || 'Please enter a valid email address.');
      } else {
        setError(err.response?.data?.message || err.message || 'Unable to send verification code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Resend Code
  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setIsRateLimited(false);
    setInfoMessage('');
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setResendCooldown(30);
      setOtpDigits(['', '', '', '', '', '']);
      setInfoMessage('A new verification code has been dispatched to your email.');
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      const is429 = err.response?.status === 429;
      setIsRateLimited(is429);
      if (is429) {
        setError('Too many requests. Please try again in 15 minutes.');
      } else {
        setError(err.response?.data?.message || err.message || 'Unable to resend verification code. Please wait and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit box input
  const handleOtpChange = (index, value) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = char;
    setOtpDigits(updated);

    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP key events (backspace navigation)
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Paste of full 6-digit code
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const updated = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i];
    }
    setOtpDigits(updated);
    const nextIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  // STEP 2: Verify Submitted OTP Code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setIsRateLimited(false);
    setInfoMessage('');

    const fullCode = otpDigits.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyPasswordResetCode(email.trim(), fullCode);
      if (res.resetAuthToken) {
        setResetAuthToken(res.resetAuthToken);
      }
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Complete Password Reset
  const hasMinLength = newPassword.length >= 8;
  const hasMixedChars = /[a-zA-Z]/.test(newPassword) && /\d/.test(newPassword);
  const isMatching = newPassword && confirmPassword && newPassword === confirmPassword;

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setIsRateLimited(false);

    if (!hasMinLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);
    try {
      await completePasswordReset(email.trim(), resetAuthToken, newPassword, confirmPassword);
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Left Column: School Educational Identity Showcase */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-blue-900 p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/85 via-blue-900/90 to-slate-950/95 pointer-events-none"></div>

        <div className="relative z-10">
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

          <div className="mt-20 max-w-lg">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-800/80 px-3.5 py-1 text-xs font-semibold text-blue-100 border border-blue-700">
              <KeyRound className="h-3.5 w-3.5 text-amber-400" /> Account Security & Recovery
            </span>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl leading-snug">
              Secure Verification Code System
            </h1>
            <p className="mt-4 text-sm text-blue-100/90 leading-relaxed">
              Verify your registered school identity via a one-time 6-digit numeric verification code sent directly to your email inbox.
            </p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-3.5 pt-8 border-t border-blue-800/60 text-xs">
          <div className="rounded-xl bg-blue-950/40 p-3.5 border border-blue-800/40">
            <ShieldCheck className="h-4 w-4 text-amber-400 mb-1.5" />
            <h4 className="font-bold text-white">Email Verification</h4>
            <p className="text-blue-200 text-[11px] mt-0.5">Secure 6-digit OTP code</p>
          </div>
          <div className="rounded-xl bg-blue-950/40 p-3.5 border border-blue-800/40">
            <Clock className="h-4 w-4 text-emerald-400 mb-1.5" />
            <h4 className="font-bold text-white">10-Min Expiry</h4>
            <p className="text-blue-200 text-[11px] mt-0.5">Time-bound OTP protection</p>
          </div>
          <div className="rounded-xl bg-blue-950/40 p-3.5 border border-blue-800/40">
            <Award className="h-4 w-4 text-sky-400 mb-1.5" />
            <h4 className="font-bold text-white">IT Administration</h4>
            <p className="text-blue-200 text-[11px] mt-0.5">Adarsh School Portal</p>
          </div>
        </div>
      </div>

      {/* Right Column: 3-Step Password Reset Card */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-6 py-12 sm:px-12 xl:px-20 bg-white dark:bg-slate-900">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile School Branding */}
          <div className="flex items-center gap-3 lg:hidden mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white shadow-xs">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-white block">
                Adarsh Senior Secondary School
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Garhi Bazidpur, Gurugram
              </span>
            </div>
          </div>

          {/* Navigation Back */}
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 mb-6 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
          </Link>

          {/* Stepper Progress Bar */}
          {step < 4 && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-2">
                <span className={step >= 1 ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}>
                  1. Email
                </span>
                <span className={step >= 2 ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}>
                  2. Verification Code
                </span>
                <span className={step >= 3 ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}>
                  3. New Password
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                  style={{ width: step === 1 ? '33.33%' : step === 2 ? '66.66%' : '100%' }}
                ></div>
              </div>
            </div>
          )}

          {/* Rate-Limit Professional Notice (shown only when 429 received from active attempt) */}
          {error && isRateLimited && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/90 px-3.5 py-2.5 text-xs font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Standard Error Notice (For Step 2 & 3) */}
          {error && !isRateLimited && step > 1 && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Info Notice */}
          {infoMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-xs font-medium text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* STEP 1: ENTER REGISTERED EMAIL */}
          {step === 1 && (
            <div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Forgot Your Password?
                </h2>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Enter your registered school email address and we'll send you a 6-digit verification code.
                </p>
              </div>

              <form onSubmit={handleRequestCode} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="school-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    School Email Address
                  </label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="school-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError('');
                        if (isRateLimited) setIsRateLimited(false);
                        if (infoMessage) setInfoMessage('');
                      }}
                      placeholder="e.g. student@adarshschool.edu"
                      autoComplete="email"
                      className={`w-full rounded-xl border ${
                        error && !isRateLimited && step === 1
                          ? 'border-rose-300 bg-rose-50/20 text-slate-900 focus:border-rose-500'
                          : 'border-slate-200 bg-slate-50/60 text-slate-900 focus:border-blue-600'
                      } py-2.5 pr-4 pl-10 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800 transition-colors`}
                    />
                  </div>
                  {/* Clean inline error below the email field */}
                  {error && !isRateLimited && step === 1 && (
                    <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{error}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full rounded-xl bg-blue-700 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  {loading ? 'Sending Verification Code...' : 'Send Verification Code'}
                </button>
              </form>

              <div className="mt-8 text-center border-t border-slate-100 pt-6 dark:border-slate-800">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Remembered your password?{' '}
                  <Link to="/login" className="font-bold text-blue-700 hover:underline dark:text-blue-400">
                    Sign In
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: VERIFICATION CODE (6-DIGIT OTP) */}
          {step === 2 && (
            <div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Verify Your Email
                </h2>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Sent to: <strong className="text-slate-800 dark:text-slate-200">{maskEmail(email)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setOtpDigits(['', '', '', '', '', '']);
                      setError('');
                      setInfoMessage('');
                    }}
                    className="font-semibold text-blue-600 hover:underline dark:text-blue-400 text-[11px] cursor-pointer"
                  >
                    Change Email
                  </button>
                </div>
              </div>

              <form onSubmit={handleVerifyCode} className="mt-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 text-center mb-2.5">
                    Enter Verification Code
                  </label>
                  
                  {/* 6-Box OTP Input with Auto-Advance */}
                  <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="h-12 w-11 sm:h-13 sm:w-12 text-center text-xl font-mono font-bold rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800 transition-all shadow-xs"
                      />
                    ))}
                  </div>

                  <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
                    ⏱️ Code expires in <strong>10 minutes</strong>. Maximum 5 attempts.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpDigits.join('').length < 6}
                  className="w-full rounded-xl bg-blue-700 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  {loading ? 'Verifying Code...' : 'Verify Code'}
                </button>

                <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Didn't receive the code?
                  </p>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleResendCode}
                    className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline dark:text-blue-400 dark:disabled:text-slate-600 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    {resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : 'Resend Code'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: CREATE NEW PASSWORD */}
          {step === 3 && (
            <div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Create New Password
                </h2>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Please create a strong new password to secure your school account.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    New Password
                  </label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pr-10 pl-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Confirm Password
                  </label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pr-10 pl-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Requirements Checklist */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[11px] space-y-1.5 dark:border-slate-800 dark:bg-slate-850">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                    <CheckCircle2 className={`h-3.5 w-3.5 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`} />
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasMixedChars ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                    <CheckCircle2 className={`h-3.5 w-3.5 ${hasMixedChars ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`} />
                    <span>Contains letters and numbers</span>
                  </div>
                  {confirmPassword && (
                    <div className={`flex items-center gap-1.5 ${isMatching ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400'}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${isMatching ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-400'}`} />
                      <span>{isMatching ? 'Passwords match' : 'Passwords do not match'}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !hasMinLength || !isMatching}
                  className="w-full rounded-xl bg-blue-700 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  {loading ? 'Updating Password...' : 'Reset Password'}
                </button>
              </form>
            </div>
          )}

          {/* SUCCESS STATE */}
          {step === 4 && (
            <div className="text-center py-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mb-4 shadow-xs">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Password Reset Successful
              </h2>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                Your password has been updated successfully. You can now use your new password to sign in.
              </p>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full rounded-xl bg-blue-700 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-colors cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
