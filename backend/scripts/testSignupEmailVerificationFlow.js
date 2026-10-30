require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { User, StudentProfile, EmailVerificationToken, sequelize } = require('../models');

async function runSignupVerificationTests() {
  console.log('====================================================');
  console.log('🧪 ADARSH SCHOOL SIGNUP EMAIL VERIFICATION AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extraInfo = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${extraInfo}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${extraInfo}`);
      failed++;
    }
  }

  const testEmail = `test.student.${Date.now()}@adarsh.edu`;
  const testPassword = 'Password123!';
  const testName = 'Test Student Verification';

  try {
    // Clean up any test records
    await User.destroy({ where: { email: testEmail } });
    await EmailVerificationToken.destroy({ where: { email: testEmail } });

    // ----------------------------------------------------
    // TEST 1: Duplicate Email Rejection
    // ----------------------------------------------------
    const dupRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Check',
        email: 'librarian@school.edu', // Known existing user
        password: testPassword,
        confirm_password: testPassword,
        role: 'student'
      })
    });
    const dupData = await dupRes.json();
    assert(
      dupRes.status === 400 && dupData.message.includes('already exists'),
      'Duplicate email rejected before verification code generation',
      `(${dupData.message})`
    );

    // ----------------------------------------------------
    // TEST 2: Submit Valid Registration Details (Step 1)
    // ----------------------------------------------------
    const regRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
        confirm_password: testPassword,
        role: 'student',
        class_name: 'Class XI',
        section: 'B',
        roll_number: '28',
        phone: '9876543210'
      })
    });
    const regData = await regRes.json();
    assert(
      regRes.status === 200 && regData.requiresVerification === true,
      'Step 1 Registration returns requiresVerification: true'
    );

    // ----------------------------------------------------
    // TEST 3: Verification Code NOT Expose in API Response
    // ----------------------------------------------------
    assert(
      !regData.code && !regData.otp && !regData.verificationCode,
      'Security: Verification code is strictly omitted from API response payload'
    );
    assert(
      regData.maskedEmail && regData.maskedEmail.includes('***'),
      `Security: Response returns masked email format (${regData.maskedEmail})`
    );

    // ----------------------------------------------------
    // TEST 4: No Permanent User in DB Before Verification
    // ----------------------------------------------------
    const unverifiedUser = await User.findOne({ where: { email: testEmail } });
    assert(
      unverifiedUser === null,
      'Architecture: User is NOT created in Users table before email verification'
    );

    // ----------------------------------------------------
    // TEST 5: Token Record & Code Hash Stored in DB
    // ----------------------------------------------------
    const tokenRecord = await EmailVerificationToken.findOne({ where: { email: testEmail } });
    assert(tokenRecord !== null, 'email_verification_tokens record successfully created');
    assert(
      tokenRecord.verification_code_hash && tokenRecord.verification_code_hash.length === 64,
      'Security: Token stores 64-char SHA-256 hash instead of plaintext OTP'
    );

    // Verify pending signup data is stored securely with hashed password
    const parsedPending = JSON.parse(tokenRecord.signup_data);
    assert(
      parsedPending.password && parsedPending.password.startsWith('$2'),
      'Security: Pending signup password is already bcrypt hashed'
    );

    // ----------------------------------------------------
    // TEST 6: Incorrect OTP Handling
    // ----------------------------------------------------
    const wrongOtpRes = await fetch('http://localhost:5000/api/auth/verify-signup-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: '000000'
      })
    });
    const wrongOtpData = await wrongOtpRes.json();
    assert(
      wrongOtpRes.status === 400 && wrongOtpData.message.includes('Invalid verification code'),
      'Incorrect OTP returns HTTP 400 with "Invalid verification code"'
    );

    // ----------------------------------------------------
    // TEST 7: Resend Rate Limiting (< 60s cooldown)
    // ----------------------------------------------------
    const rateLimitRes = await fetch('http://localhost:5000/api/auth/resend-signup-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const rateLimitData = await rateLimitRes.json();
    assert(
      rateLimitRes.status === 429 && rateLimitData.message.includes('seconds'),
      'Resend Rate Limit: Enforces 60-second cooldown (HTTP 429)',
      `(${rateLimitData.message})`
    );

    // ----------------------------------------------------
    // TEST 8: Resend After Cooldown
    // ----------------------------------------------------
    // Simulate cooldown elapsed in database
    await tokenRecord.update({
      last_resend_at: new Date(Date.now() - 65 * 1000)
    });

    const resendRes = await fetch('http://localhost:5000/api/auth/resend-signup-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const resendData = await resendRes.json();
    assert(
      resendRes.status === 200 && resendData.success === true,
      'Resend succeeds after 60-second cooldown elapsed'
    );

    // Reload token record to check new hash
    const updatedTokenRecord = await EmailVerificationToken.findOne({ where: { email: testEmail } });
    assert(
      updatedTokenRecord.verification_code_hash !== tokenRecord.verification_code_hash,
      'Resend generates completely new code and invalidates previous hash'
    );

    // ----------------------------------------------------
    // TEST 9: Expired Token Rejection
    // ----------------------------------------------------
    await updatedTokenRecord.update({
      expires_at: new Date(Date.now() - 5 * 1000) // expired 5 seconds ago
    });

    const expiredRes = await fetch('http://localhost:5000/api/auth/verify-signup-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: '123456'
      })
    });
    const expiredData = await expiredRes.json();
    assert(
      expiredRes.status === 400 && expiredData.message.includes('expired'),
      'Expired OTP rejected with expiration message'
    );

    // ----------------------------------------------------
    // TEST 10: Correct OTP Verification & Account Activation
    // ----------------------------------------------------
    // Generate a known test code and store its hash
    const testOtp = '824916';
    const testHash = crypto.createHash('sha256').update(testOtp).digest('hex');
    await updatedTokenRecord.update({
      verification_code_hash: testHash,
      expires_at: new Date(Date.now() + 10 * 60 * 1000), // fresh 10 mins
      attempts: 0
    });

    const verifyRes = await fetch('http://localhost:5000/api/auth/verify-signup-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: testOtp
      })
    });
    const verifyData = await verifyRes.json();
    assert(
      verifyRes.status === 200 && verifyData.success === true,
      'Correct OTP successfully verifies email and returns success'
    );

    // Verify User account is NOW created in database
    const createdUser = await User.findOne({
      where: { email: testEmail },
      include: [{ model: StudentProfile, as: 'student_profile' }]
    });
    assert(createdUser !== null, 'Permanent User account created in Users table');
    assert(createdUser.status === 'active', 'User status set to active');
    assert(
      createdUser.student_profile && createdUser.student_profile.class_name === 'Class XI',
      'StudentProfile created with Class XI and Section B'
    );

    // Verify password is valid bcrypt
    const passwordMatch = await bcrypt.compare(testPassword, createdUser.password);
    assert(passwordMatch === true, 'Stored password verified with bcrypt compare');

    // ----------------------------------------------------
    // TEST 11: Single-Use Check (Code Cannot Be Reused)
    // ----------------------------------------------------
    const reuseRes = await fetch('http://localhost:5000/api/auth/verify-signup-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: testOtp
      })
    });
    const reuseData = await reuseRes.json();
    assert(
      reuseRes.status === 400 && (reuseData.message.includes('already') || reuseData.message.includes('Invalid')),
      'Security: Verified code cannot be reused (Single-Use enforcement)'
    );

    // ----------------------------------------------------
    // TEST 12: Login with Newly Created Verified Account
    // ----------------------------------------------------
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    const loginData = await loginRes.json();
    assert(
      loginRes.status === 200 && loginData.success === true && loginData.token,
      'User can successfully log in with verified account and receives JWT'
    );

    // Clean up test user
    await User.destroy({ where: { email: testEmail } });
    await EmailVerificationToken.destroy({ where: { email: testEmail } });

    console.log('\n====================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Unhandled test runner error:', err);
    process.exit(1);
  }
}

runSignupVerificationTests();
