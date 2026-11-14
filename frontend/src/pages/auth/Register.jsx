import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap, Camera, X, AlertCircle, User, Mail, Lock, Phone,
  CheckCircle2, Clock, RefreshCw, ArrowLeft, ShieldCheck, KeyRound
} from 'lucide-react';
import ImageCropModal from '../../components/ImageCropModal';
import { validateImageFile } from '../../utils/cropImage';

export default function Register() {
  // Steps: 1: Details Form, 2: Verify Email OTP, 3: Account Created / Success
  const [step, setStep] = useState(1);

  // Step 1 Form Data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    role: 'student',
    class_name: 'Class X',
    section: 'A',
    roll_number: '',
    department: 'Science & Mathematics'
  });

  const [profileImageFile, setProfileImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const fileInputRef = useRef(null);

  // Step 2 OTP State
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef([]);

  // UI Feedback States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const { register, verifySignupEmail, resendSignupVerification } = useAuth();
  const navigate = useNavigate();

  // 60-second Resend Cooldown Countdown Timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageChange = async (e) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const validation = await validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);
    setCropModalOpen(true);
  };

  const handlePickNewFile = (newFile) => {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
    }
    const objectUrl = URL.createObjectURL(newFile);
    setCropImageSrc(objectUrl);
  };

  const handleCropModalClose = () => {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setCropImageSrc('');
    setCropModalOpen(false);
  };

  const handleCropSuccess = async (croppedFile) => {
    setProfileImageFile(croppedFile);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(URL.createObjectURL(croppedFile));
  };

  const handleClearImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setProfileImageFile(null);
    setImagePreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ==========================================
  // STEP 1: SUBMIT REGISTRATION DETAILS
  // ==========================================
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match. Please verify both password fields.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('name', formData.name.trim());
      data.append('email', formData.email.trim());
      data.append('password', formData.password);
      data.append('confirm_password', formData.confirm_password);
      data.append('role', formData.role);
      data.append('phone', formData.phone.trim());

      if (formData.role === 'student') {
        data.append('class_name', formData.class_name);
        data.append('section', formData.section);
        data.append('roll_number', formData.roll_number.trim());
      } else {
        data.append('department', formData.department.trim());
      }

      if (profileImageFile) {
        data.append('profile_picture', profileImageFile);
      }

      const res = await register(data);

      if (res && res.success) {
        setSubmittedEmail(res.email || formData.email.trim().toLowerCase());
        setMaskedEmail(res.maskedEmail || formData.email.trim());
        setStep(2);
        setResendCooldown(60); // 60s cooldown
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      } else {
        setError(res?.message || 'Registration failed. Please check your details.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // STEP 2: OTP INPUT HANDLERS
  // ==========================================
  const handleOtpChange = (index, value) => {
    // Keep only the last numeric character entered
    const cleanDigit = value.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = cleanDigit;
    setOtpDigits(updated);
    setError('');

    // Auto-advance cursor to next input box
    if (cleanDigit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Backspace: move to previous box if current is empty
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const updated = ['', '', '', '', '', ''];
    for (let i = 0; i < pasteData.length; i++) {
      updated[i] = pasteData[i];
    }
    setOtpDigits(updated);
    setError('');

    // Focus appropriate box
    const focusIdx = Math.min(pasteData.length, 5);
    otpInputRefs.current[focusIdx]?.focus();
  };

  // STEP 2: VERIFY SUBMITTED CODE
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const code = otpDigits.join('');
    if (code.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      const res = await verifySignupEmail(submittedEmail, code);
      if (res && res.success) {
        setStep(3); // Advance to Account Created Success Screen
      } else {
        setError(res?.message || 'Invalid verification code. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: RESEND CODE (60s cooldown enforced)
  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const res = await resendSignupVerification(submittedEmail);
      if (res && res.success) {
        setResendCooldown(60);
        setOtpDigits(['', '', '', '', '', '']);
        setInfoMessage('A new verification code has been dispatched to your email.');
        otpInputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        
        {/* School Header */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white shadow-xs">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              Adarsh Senior Secondary School
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Garhi Bazidpur, Gurugram • Library Management Portal
            </p>
          </div>
        </div>

        {/* 3-Step Progress Indicator */}
        <div className="mt-4 mb-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-2">
            <span className={step >= 1 ? 'text-blue-700 dark:text-blue-400 font-bold' : ''}>
              1. Registration Details
            </span>
            <span className={step >= 2 ? 'text-blue-700 dark:text-blue-400 font-bold' : ''}>
              2. Verify Email
            </span>
            <span className={step >= 3 ? 'text-blue-700 dark:text-blue-400 font-bold' : ''}>
              3. Account Ready
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
            <div
              className="h-full bg-blue-700 transition-all duration-300 rounded-full"
              style={{ width: step === 1 ? '33.33%' : step === 2 ? '66.66%' : '100%' }}
            ></div>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Global Info / Success Banner */}
        {infoMessage && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* ====================================================
            STEP 1: ENTER REGISTRATION DETAILS
           ==================================================== */}
        {step === 1 && (
          <form onSubmit={handleRegisterSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'student' }))}
                  className={`rounded-xl border py-2 text-xs font-bold transition-colors cursor-pointer ${
                    formData.role === 'student'
                      ? 'border-blue-700 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  Student Account
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'teacher' }))}
                  className={`rounded-xl border py-2 text-xs font-bold transition-colors cursor-pointer ${
                    formData.role === 'teacher'
                      ? 'border-blue-700 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  Faculty / Teacher
                </button>
              </div>
            </div>

            {/* Profile Picture Upload */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Student / Faculty Photograph (Optional)
              </label>
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                  {imagePreviewUrl ? (
                    <img src={imagePreviewUrl} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <Camera className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                      id="profile-upload"
                    />
                    <label
                      htmlFor="profile-upload"
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {profileImageFile ? 'Change Photo' : 'Upload Photo'}
                    </label>
                    {profileImageFile && (
                      <button
                        type="button"
                        onClick={handleClearImage}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <X className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">JPG, PNG, or WEBP (Max 5MB)</p>
                </div>
              </div>
            </div>

            {/* Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Pulkit Bhardwaj"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="student@school.edu"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Role-Specific Fields */}
            {formData.role === 'student' ? (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Class</label>
                  <select
                    name="class_name"
                    value={formData.class_name}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="Class IX">Class IX</option>
                    <option value="Class X">Class X</option>
                    <option value="Class XI">Class XI</option>
                    <option value="Class XII">Class XII</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Section</label>
                  <select
                    name="section"
                    value={formData.section}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Roll No.</label>
                  <input
                    type="text"
                    name="roll_number"
                    value={formData.roll_number}
                    onChange={handleChange}
                    placeholder="e.g. 14"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Academic Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g. Science & Mathematics"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            )}

            {/* Mobile Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contact Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 characters"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="password"
                    name="confirm_password"
                    required
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-700 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              {loading ? 'Submitting Details & Sending Code...' : 'Continue to Email Verification'}
            </button>

            <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Already registered?{' '}
                <Link to="/login" className="font-bold text-blue-700 hover:underline dark:text-blue-400">
                  Sign In to Library
                </Link>
              </p>
            </div>
          </form>
        )}

        {/* ====================================================
            STEP 2: EMAIL VERIFICATION SCREEN
           ==================================================== */}
        {step === 2 && (
          <div className="mt-5 space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-800 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900/60 mb-2">
                <KeyRound className="h-3 w-3" /> Step 2: Verification
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Verify Your Email
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                We've sent a 6-digit verification code to <strong className="text-slate-900 dark:text-white font-mono">{maskedEmail || submittedEmail}</strong>.
              </p>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 text-center mb-2.5">
                  Enter 6-Digit Verification Code
                </label>

                {/* 6-Box OTP Input with Auto-Advance & Paste */}
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
                      className="h-12 w-11 sm:h-13 sm:w-12 text-center text-xl font-mono font-bold rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 focus:border-blue-700 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all shadow-xs"
                    />
                  ))}
                </div>

                <p className="mt-3 text-center text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  The verification code will expire in <strong>10 minutes</strong>.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otpDigits.join('').length < 6}
                className="w-full rounded-xl bg-blue-700 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {loading ? 'Verifying Code...' : 'Verify Email'}
              </button>

              {/* Resend Code Section with 60s Timer */}
              <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center space-y-1.5">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Didn't receive the code?
                </p>

                {resendCooldown > 0 ? (
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Resend available in <strong className="text-blue-700 dark:text-blue-400">{resendCooldown} seconds</strong>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-xs font-bold text-blue-700 hover:underline dark:text-blue-400 cursor-pointer disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError('');
                    setInfoMessage('');
                  }}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Change Registration Details
                </button>

                <Link to="/login" className="text-slate-500 hover:underline dark:text-slate-400">
                  Cancel & Sign In
                </Link>
              </div>
            </form>
          </div>
        )}

        {/* ====================================================
            STEP 3: ACCOUNT CREATED / SUCCESS SCREEN
           ==================================================== */}
        {step === 3 && (
          <div className="mt-8 text-center space-y-5 py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Email Verified Successfully
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                Your <strong>Adarsh Senior Secondary School Library</strong> account has been verified and activated.
              </p>
            </div>

            {/* Account Confirmation Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-left text-xs dark:border-slate-800 dark:bg-slate-800/50 space-y-2">
              <div className="flex justify-between text-slate-500">
                <span>Account Name:</span>
                <strong className="text-slate-800 dark:text-slate-200">{formData.name}</strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Registered Email:</span>
                <strong className="text-slate-800 dark:text-slate-200">{submittedEmail}</strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Role:</span>
                <strong className="text-slate-800 dark:text-slate-200 capitalize">{formData.role}</strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Institution:</span>
                <span className="text-slate-700 dark:text-slate-300">Adarsh Sr. Sec. School, Gurugram</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full rounded-xl bg-blue-700 py-3 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-colors cursor-pointer"
            >
              Continue to Sign In
            </button>
          </div>
        )}

        {/* Profile Picture Crop Modal */}
        <ImageCropModal
          isOpen={cropModalOpen}
          imageSrc={cropImageSrc}
          onClose={handleCropModalClose}
          onUploadSuccess={handleCropSuccess}
          onPickNewFile={handlePickNewFile}
        />

      </div>
    </div>
  );
}
