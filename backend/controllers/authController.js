const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { User, StudentProfile, TeacherProfile, LibrarianProfile, BookIssue, Fine, PasswordResetToken, EmailVerificationToken } = require('../models');
const { JWT_SECRET } = require('../middleware/auth');
const { logActivity } = require('../middleware/logger');
const { sendPasswordResetOtpEmail, sendSignupVerificationEmail } = require('../services/emailService');

// Helper to mask email for user-facing verification screens (e.g. p***t@gmail.com)
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// In-memory rate limiting map for password reset requests (max 3 requests within 15 minutes per email + IP)
const resetRateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 3;

const checkResetRateLimit = (key) => {
  if (!key) return false;
  const now = Date.now();
  const history = resetRateLimitStore.get(key) || [];
  const recentHistory = history.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recentHistory.length >= RATE_LIMIT_MAX_ATTEMPTS) {
    return true; // Rate limited
  }
  recentHistory.push(now);
  resetRateLimitStore.set(key, recentHistory);
  return false;
};

// Export helper to reset in-memory rate limit store for tests or server lifecycle
exports._clearResetRateLimits = () => {
  resetRateLimitStore.clear();
};

// Clean up old uploaded image file if present in uploads/profiles
const deleteLocalFile = (fileUrl) => {
  if (!fileUrl || !fileUrl.startsWith('/uploads/profiles/')) return;
  try {
    const filename = path.basename(fileUrl);
    const filepath = path.join(__dirname, '..', 'uploads', 'profiles', filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (err) {
    console.error('Failed to delete old profile image file:', err.message);
  }
};

// 1. Login with real database verification
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() },
      include: [
        { model: StudentProfile, as: 'student_profile' },
        { model: TeacherProfile, as: 'teacher_profile' },
        { model: LibrarianProfile, as: 'librarian_profile' }
      ]
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: `Your account is ${user.status}. Please contact the school administration.` });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logActivity({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_LOGIN',
      details: `User logged in from ${req.ip || 'local'}`,
      ip: req.ip
    });

    const userData = user.toJSON();
    delete userData.password;

    // Ensure profile_picture and avatar match
    userData.profile_picture = userData.profile_picture || userData.avatar || '';
    userData.avatar = userData.profile_picture;

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during authentication.' });
  }
};

// 2. Step 1: User registration submission -> generates verification code & sends email
exports.register = async (req, res) => {
  try {
    const {
      name, email, password, confirm_password, role, phone,
      roll_number, class_name, section, admission_number, department
    } = req.body;

    if (!name || !email || !password) {
      // Clean up uploaded file if validation fails
      if (req.file) deleteLocalFile(`/uploads/profiles/${req.file.filename}`);
      return res.status(400).json({ success: false, message: 'Full name, email, and password are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      if (req.file) deleteLocalFile(`/uploads/profiles/${req.file.filename}`);
      return res.status(400).json({ success: false, message: 'Please enter a valid school email address.' });
    }

    if (confirm_password && password !== confirm_password) {
      if (req.file) deleteLocalFile(`/uploads/profiles/${req.file.filename}`);
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      if (req.file) deleteLocalFile(`/uploads/profiles/${req.file.filename}`);
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const existing = await User.findOne({ where: { email: trimmedEmail } });
    if (existing) {
      if (req.file) deleteLocalFile(`/uploads/profiles/${req.file.filename}`);
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in instead.'
      });
    }

    // Role security: Public signup can ONLY register as student or teacher (never admin or librarian)
    const userRole = role === 'teacher' ? 'teacher' : 'student';
    const hashedPassword = await bcrypt.hash(password, 10);

    let profilePictureUrl = '';
    if (req.file) {
      profilePictureUrl = `/uploads/profiles/${req.file.filename}`;
    }

    // Prepare pending registration data
    const pendingSignupData = {
      name: name.trim(),
      email: trimmedEmail,
      password: hashedPassword,
      role: userRole,
      phone: phone ? phone.trim() : '',
      profile_picture: profilePictureUrl,
      class_name: class_name ? class_name.trim() : 'Class X',
      section: section ? section.trim().toUpperCase() : 'A',
      roll_number: roll_number ? roll_number.trim() : '',
      admission_number: admission_number ? admission_number.trim() : `ASSS-${Date.now().toString().slice(-4)}`,
      department: department ? department.trim() : 'General Studies'
    };

    // Generate cryptographically secure random 6-digit code
    const verificationCode = crypto.randomInt(100000, 1000000).toString();
    const verificationHash = crypto.createHash('sha256').update(verificationCode).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert into email_verification_tokens
    let tokenRecord = await EmailVerificationToken.findOne({ where: { email: trimmedEmail } });
    if (tokenRecord) {
      await tokenRecord.update({
        verification_code_hash: verificationHash,
        signup_data: JSON.stringify(pendingSignupData),
        expires_at: expiresAt,
        verified_at: null,
        attempts: 0,
        last_resend_at: new Date()
      });
    } else {
      tokenRecord = await EmailVerificationToken.create({
        email: trimmedEmail,
        verification_code_hash: verificationHash,
        signup_data: JSON.stringify(pendingSignupData),
        expires_at: expiresAt,
        verified_at: null,
        attempts: 0,
        last_resend_at: new Date()
      });
    }

    // Dispatch verification code via Nodemailer SMTP
    const mailResult = await sendSignupVerificationEmail({
      userEmail: trimmedEmail,
      userName: name.trim(),
      otpCode: verificationCode,
      expiresInMinutes: 10
    });

    if (!mailResult.success && !mailResult.simulated) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please check server SMTP configuration.'
      });
    }

    await logActivity({
      userId: null,
      userName: name.trim(),
      userRole: userRole,
      action: 'SIGNUP_VERIFICATION_SENT',
      details: `Verification code sent to ${trimmedEmail}`,
      ip: req.ip
    });

    return res.status(200).json({
      success: true,
      requiresVerification: true,
      message: 'A 6-digit verification code has been sent to your email address.',
      email: trimmedEmail,
      maskedEmail: maskEmail(trimmedEmail)
    });
  } catch (error) {
    if (req.file) deleteLocalFile(`/uploads/profiles/${req.file.filename}`);
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration: ' + error.message });
  }
};

// 2.1 Step 2: Verify Email & Activate Account
exports.verifySignupEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and 6-digit verification code are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const cleanCode = code.toString().trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({ success: false, message: 'Invalid verification code. Please enter the 6-digit code.' });
    }

    const tokenRecord = await EmailVerificationToken.findOne({ where: { email: trimmedEmail } });
    if (!tokenRecord || !tokenRecord.signup_data) {
      return res.status(400).json({
        success: false,
        message: 'No pending registration record found for this email. Please sign up again.'
      });
    }

    if (tokenRecord.verified_at) {
      return res.status(400).json({
        success: false,
        message: 'This email address has already been verified. Please proceed to sign in.'
      });
    }

    // Check expiration
    if (new Date() > new Date(tokenRecord.expires_at)) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired (10-minute limit). Please click "Resend Code".'
      });
    }

    // Check rate limit on failed attempts (max 5)
    if (tokenRecord.attempts >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Too many incorrect verification attempts. Please click "Resend Code" to receive a new code.'
      });
    }

    // Compare hash
    const submittedHash = crypto.createHash('sha256').update(cleanCode).digest('hex');
    if (submittedHash !== tokenRecord.verification_code_hash) {
      await tokenRecord.increment('attempts');
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please try again.'
      });
    }

    // Code matches: Parse stored signup data and create permanent User account
    let signupData;
    try {
      signupData = JSON.parse(tokenRecord.signup_data);
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Corrupt signup data. Please register again.' });
    }

    // Double check email uniqueness before insert
    const existing = await User.findOne({ where: { email: trimmedEmail } });
    if (existing) {
      await tokenRecord.update({ verified_at: new Date(), verification_code_hash: '' });
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in instead.'
      });
    }

    const user = await User.create({
      name: signupData.name,
      email: trimmedEmail,
      password: signupData.password, // Pre-hashed bcrypt string
      role: signupData.role,
      phone: signupData.phone || '',
      profile_picture: signupData.profile_picture || '',
      avatar: signupData.profile_picture || '',
      status: 'active'
    });

    if (signupData.role === 'student') {
      const barcode = `ADARSH-STU-${Date.now().toString().slice(-6)}`;
      await StudentProfile.create({
        user_id: user.id,
        roll_number: signupData.roll_number || '',
        class_name: signupData.class_name || 'Class X',
        section: signupData.section || 'A',
        admission_number: signupData.admission_number || `ASSS-${Date.now().toString().slice(-4)}`,
        barcode_id: barcode
      });
    } else if (signupData.role === 'teacher') {
      await TeacherProfile.create({
        user_id: user.id,
        employee_id: `ASSS-TCH-${Date.now().toString().slice(-4)}`,
        department: signupData.department || 'General Studies'
      });
    }

    // Invalidate token so single-use
    await tokenRecord.update({
      verified_at: new Date(),
      verification_code_hash: ''
    });

    await logActivity({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_REGISTERED_VERIFIED',
      details: `Email verified and account activated for ${trimmedEmail}`,
      ip: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! Your account has been created.'
    });
  } catch (error) {
    console.error('verifySignupEmail error:', error);
    return res.status(500).json({ success: false, message: 'Server error during verification: ' + error.message });
  }
};

// 2.2 Resend Signup Verification Code with 60-second cooldown
exports.resendSignupVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if account already created
    const existingUser = await User.findOne({ where: { email: trimmedEmail } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address is already verified. Please sign in.'
      });
    }

    const tokenRecord = await EmailVerificationToken.findOne({
      where: { email: trimmedEmail, verified_at: null }
    });

    if (!tokenRecord || !tokenRecord.signup_data) {
      return res.status(400).json({
        success: false,
        message: 'No pending registration found for this email address. Please start registration.'
      });
    }

    // Enforce 60-second rate limit between resends
    const now = Date.now();
    if (tokenRecord.last_resend_at) {
      const elapsedMs = now - new Date(tokenRecord.last_resend_at).getTime();
      if (elapsedMs < 60 * 1000) {
        const remainingSec = Math.ceil((60 * 1000 - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${remainingSec} seconds before requesting another verification code.`
        });
      }
    }

    let signupData;
    try {
      signupData = JSON.parse(tokenRecord.signup_data);
    } catch {
      signupData = { name: 'Student' };
    }

    // Generate fresh 6-digit code
    const newCode = crypto.randomInt(100000, 1000000).toString();
    const newHash = crypto.createHash('sha256').update(newCode).digest('hex');
    const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await tokenRecord.update({
      verification_code_hash: newHash,
      expires_at: newExpiresAt,
      attempts: 0,
      last_resend_at: new Date()
    });

    // Send email
    const mailResult = await sendSignupVerificationEmail({
      userEmail: trimmedEmail,
      userName: signupData.name || 'Student',
      otpCode: newCode,
      expiresInMinutes: 10
    });

    if (!mailResult.success && !mailResult.simulated) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please check server logs.'
      });
    }

    await logActivity({
      userId: null,
      userName: signupData.name || 'Student',
      userRole: signupData.role || 'student',
      action: 'SIGNUP_VERIFICATION_RESENT',
      details: `New verification code resent to ${trimmedEmail}`,
      ip: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'New verification code sent successfully to your email.'
    });
  } catch (error) {
    console.error('resendSignupVerification error:', error);
    return res.status(500).json({ success: false, message: 'Server error during resend: ' + error.message });
  }
};

// 3. Current user details
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: StudentProfile, as: 'student_profile' },
        { model: TeacherProfile, as: 'teacher_profile' },
        { model: LibrarianProfile, as: 'librarian_profile' }
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const activeLoans = await BookIssue.count({
      where: {
        user_id: user.id,
        status: ['issued', 'overdue']
      }
    });

    const pendingFines = await Fine.findAll({
      where: {
        user_id: user.id,
        status: 'pending'
      }
    });
    const totalPendingFine = pendingFines.reduce((sum, f) => sum + f.amount, 0);

    const userData = user.toJSON();
    userData.profile_picture = userData.profile_picture || userData.avatar || '';
    userData.avatar = userData.profile_picture;

    return res.json({
      success: true,
      user: {
        ...userData,
        active_loans_count: activeLoans,
        total_pending_fine: totalPendingFine
      }
    });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
};

// 4. Update profile details
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, class_name, section, roll_number, department } = req.body;

    const user = await User.findByPk(req.user.id, {
      include: [
        { model: StudentProfile, as: 'student_profile' },
        { model: TeacherProfile, as: 'teacher_profile' }
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    await user.save();

    if (user.role === 'student' && user.student_profile) {
      if (class_name) user.student_profile.class_name = class_name.trim();
      if (section) user.student_profile.section = section.trim().toUpperCase();
      if (roll_number !== undefined) user.student_profile.roll_number = roll_number.trim();
      await user.student_profile.save();
    } else if (user.role === 'teacher' && user.teacher_profile) {
      if (department) user.teacher_profile.department = department.trim();
      await user.teacher_profile.save();
    }

    await logActivity({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_PROFILE_UPDATED',
      details: `Profile updated by user ${user.name}`,
      ip: req.ip
    });

    const updated = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: StudentProfile, as: 'student_profile' },
        { model: TeacherProfile, as: 'teacher_profile' },
        { model: LibrarianProfile, as: 'librarian_profile' }
      ]
    });

    const userData = updated.toJSON();
    userData.profile_picture = userData.profile_picture || userData.avatar || '';
    userData.avatar = userData.profile_picture;

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: userData
    });
  } catch (error) {
    console.error('updateProfile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
};

// 5. Update Profile Picture
exports.updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload.' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      deleteLocalFile(`/uploads/profiles/${req.file.filename}`);
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    // Clean up previous profile picture file if it exists locally
    const previousPicture = user.profile_picture || user.avatar;
    if (previousPicture) {
      deleteLocalFile(previousPicture);
    }

    const newPictureUrl = `/uploads/profiles/${req.file.filename}`;
    user.profile_picture = newPictureUrl;
    user.avatar = newPictureUrl;
    await user.save();

    await logActivity({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'PROFILE_PICTURE_UPDATED',
      details: `Profile picture updated for user ${user.name}`,
      ip: req.ip
    });

    const fullUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: StudentProfile, as: 'student_profile' },
        { model: TeacherProfile, as: 'teacher_profile' },
        { model: LibrarianProfile, as: 'librarian_profile' }
      ]
    });

    const userData = fullUser.toJSON();
    userData.profile_picture = newPictureUrl;
    userData.avatar = newPictureUrl;

    return res.json({
      success: true,
      message: 'Profile picture updated successfully.',
      profile_picture: newPictureUrl,
      user: userData
    });
  } catch (error) {
    if (req.file) deleteLocalFile(`/uploads/profiles/${req.file.filename}`);
    console.error('updateProfilePicture error:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload profile picture.' });
  }
};

// 7. Request 6-digit password reset verification code via email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    // Rate Limiting Check: Maximum 3 OTP requests per 15 minutes per normalizedEmail + IP
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    const rateLimitKey = `${normalizedEmail}:${clientIp}`;
    const isRateLimited = checkResetRateLimit(rateLimitKey);

    if (isRateLimited) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.'
      });
    }

    // STEP 1: Search Users table first. Only proceed if user is registered!
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account is registered with this email address.'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Your account is ${user.status}. Please contact the school administration.`
      });
    }

    // STEP 2: User exists -> Generate cryptographically secure random 6-digit numeric OTP (100000 - 999999)
    const otpCode = crypto.randomInt(100000, 1000000).toString();

    // Store ONLY a secure SHA-256 hash of the OTP
    const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Strictly 10 minutes validity

    // Invalidate any existing unused reset tokens/OTPs for this user
    await PasswordResetToken.update(
      { used_at: new Date() },
      { where: { user_id: user.id, used_at: null } }
    );

    // Save hashed OTP in database
    await PasswordResetToken.create({
      user_id: user.id,
      otp_hash: otpHash,
      token_hash: otpHash,
      expires_at: expiresAt,
      used_at: null,
      attempts: 0
    });

    // Clear legacy user OTP columns
    user.reset_password_code = null;
    user.reset_password_expires = null;
    await user.save();

    // Send professional HTML email containing the 6-digit OTP (NO reset link)
    await sendPasswordResetOtpEmail({
      userName: user.name,
      userEmail: user.email,
      otpCode,
      expiresInMinutes: 10
    });

    await logActivity({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'PASSWORD_RESET_OTP_REQUESTED',
      details: `Password reset verification code dispatched for ${user.email}`,
      ip: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Verification code sent successfully.'
    });
  } catch (error) {
    console.error('forgotPassword error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process verification code request. Please try again later.'
    });
  }
};

// 8. Verify submitted 6-digit OTP code and generate short-lived reset authorization token
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and 6-digit verification code are required.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const cleanCode = code.toString().trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit verification code.'
      });
    }

    const user = await User.findOne({ where: { email: trimmedEmail } });
    if (!user || user.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check your email and try again.'
      });
    }

    // Find the latest active OTP record for that user
    const record = await PasswordResetToken.findOne({
      where: { user_id: user.id, used_at: null },
      order: [['created_at', 'DESC']]
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'No active verification code found. Please request a new code.'
      });
    }

    // Check expiration (10 minutes)
    if (new Date() > new Date(record.expires_at)) {
      record.used_at = new Date();
      await record.save();
      return res.status(400).json({
        success: false,
        reason: 'expired',
        message: 'Verification code has expired. Please request a new code.'
      });
    }

    // Brute-force protection: check attempt count (maximum 5 attempts per OTP)
    if ((record.attempts || 0) >= 5) {
      record.used_at = new Date();
      await record.save();
      return res.status(400).json({
        success: false,
        reason: 'too_many_attempts',
        message: 'Too many incorrect attempts. Please request a new verification code.'
      });
    }

    // Hash the submitted OTP and compare with stored hash
    const submittedHash = crypto.createHash('sha256').update(cleanCode).digest('hex');
    const storedHash = record.otp_hash || record.token_hash;

    if (submittedHash !== storedHash) {
      record.attempts = (record.attempts || 0) + 1;
      await record.save();

      const remaining = 5 - record.attempts;
      if (remaining <= 0) {
        record.used_at = new Date();
        await record.save();
        return res.status(400).json({
          success: false,
          reason: 'too_many_attempts',
          message: 'Too many incorrect attempts. Please request a new verification code.'
        });
      }

      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      });
    }

    // OTP is verified successfully! Invalidate OTP and create a short-lived reset authorization token
    const resetAuthToken = crypto.randomBytes(32).toString('hex');
    const resetAuthTokenHash = crypto.createHash('sha256').update(resetAuthToken).digest('hex');

    record.reset_token_hash = resetAuthTokenHash;
    record.used_at = new Date(); // Mark OTP as single-use
    await record.save();

    await logActivity({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'PASSWORD_RESET_OTP_VERIFIED',
      details: `Password reset verification code successfully verified for ${user.email}`,
      ip: req.ip
    });

    return res.json({
      success: true,
      message: 'Verification code confirmed. You may now create your new password.',
      resetAuthToken
    });
  } catch (error) {
    console.error('verifyResetCode error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify reset code. Please try again later.'
    });
  }
};

// 9. Reset password with verified OTP authorization
exports.resetPassword = async (req, res) => {
  try {
    const { email, resetAuthToken, token, password, new_password, confirm_password } = req.body;
    const newPassword = (password || new_password || '').trim();
    const confPassword = (confirm_password || '').trim();
    const authToken = (resetAuthToken || token || '').trim();

    // Security check: Must NOT allow reset without authorization
    if (!authToken) {
      return res.status(400).json({
        success: false,
        message: 'Password reset authorization is missing. Please verify your email code first.'
      });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.'
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password is required.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    if (confPassword && newPassword !== confPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match. Please verify both password fields.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ where: { email: trimmedEmail } });
    if (!user || user.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset session.'
      });
    }

    // Verify the short-lived reset authorization token
    const authTokenHash = crypto.createHash('sha256').update(authToken).digest('hex');
    const record = await PasswordResetToken.findOne({
      where: {
        user_id: user.id,
        reset_token_hash: authTokenHash
      }
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset authorization. Please request a new verification code.'
      });
    }

    // Ensure authorization session is fresh (valid for 15 minutes after verification)
    const sessionAgeMs = Date.now() - new Date(record.updatedAt || record.updated_at).getTime();
    if (sessionAgeMs > 15 * 60 * 1000) {
      record.reset_token_hash = null;
      await record.save();
      return res.status(400).json({
        success: false,
        message: 'Password reset session has expired. Please request a new verification code.'
      });
    }

    // Hash the new password with bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.reset_password_code = null;
    user.reset_password_expires = null;
    await user.save();

    // Invalidate the reset authorization token immediately
    record.reset_token_hash = null;
    record.used_at = new Date();
    await record.save();

    // Invalidate any other active reset tokens/OTPs for this user
    await PasswordResetToken.update(
      { used_at: new Date() },
      { where: { user_id: user.id, used_at: null } }
    );

    await logActivity({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'PASSWORD_RESET_COMPLETED',
      details: `Password reset successfully completed for ${user.email}`,
      ip: req.ip
    });

    return res.json({
      success: true,
      message: 'Your password has been updated successfully.'
    });
  } catch (error) {
    console.error('resetPassword error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password. Please try again later.'
    });
  }
};

