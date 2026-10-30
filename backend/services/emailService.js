const nodemailer = require('nodemailer');

const SCHOOL_NAME = 'Adarsh Senior Secondary School';
const SCHOOL_LOCATION = 'Garhi Bazidpur, Gurugram';

/**
 * Returns sender address matching authenticated user to prevent SMTP sender rejection
 */
function getFromAddress() {
  if (process.env.EMAIL_FROM) {
    return process.env.EMAIL_FROM;
  }
  if (process.env.EMAIL_USER) {
    return `"${SCHOOL_NAME} Library" <${process.env.EMAIL_USER}>`;
  }
  return `"${SCHOOL_NAME} Library" <library@adarshschool.edu>`;
}

const DEFAULT_FROM = getFromAddress();

/**
 * Creates and returns configured Nodemailer transport
 */
function getTransporter() {
  const service = process.env.EMAIL_SERVICE;
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  // Support service preset like 'gmail', 'yahoo', 'outlook'
  if (service && user && pass) {
    return nodemailer.createTransport({
      service,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
  }

  // Support custom SMTP host
  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
  }

  // Fallback for development/testing when SMTP is not configured:
  return null;
}

/**
 * Format date nicely for email display in Indian context
 */
function formatDate(dateValue) {
  if (!dateValue) return 'N/A';
  try {
    const d = new Date(dateValue);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  } catch {
    return String(dateValue);
  }
}

/**
 * Send Due Tomorrow / Return Reminder Email
 */
async function sendDueReminderEmail({
  studentName,
  studentEmail,
  bookTitle,
  bookId = 'N/A',
  issueDate,
  dueDate,
  isTomorrow = false
}) {
  const formattedIssueDate = formatDate(issueDate);
  const formattedDueDate = formatDate(dueDate);

  const subject = isTomorrow
    ? 'Reminder: Library Book Due Tomorrow'
    : 'Library Book Return Reminder';

  const textBody = `Dear ${studentName},

This is a reminder from the ${SCHOOL_NAME} Library.

Book Details:
Book Name: ${bookTitle}
Book ID: ${bookId}
Issue Date: ${formattedIssueDate}
Due Date: ${formattedDueDate}

Please return the book to the library by ${formattedDueDate}.

Thank you,
Library Department
${SCHOOL_NAME}
${SCHOOL_LOCATION}`;

  const htmlBody = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
  <div style="background: #1e3a8a; color: #ffffff; padding: 20px 24px;">
    <h2 style="margin: 0; font-size: 18px;">${SCHOOL_NAME}</h2>
    <p style="margin: 4px 0 0; font-size: 12px; color: #bfdbfe;">Central Library & Learning Hub • ${SCHOOL_LOCATION}</p>
  </div>
  <div style="padding: 24px;">
    <p style="font-size: 14px; font-weight: bold;">Dear ${studentName},</p>
    <p style="font-size: 13px; color: #475569;">
      This is a reminder from the ${SCHOOL_NAME} Library regarding a book currently issued to your library account.
    </p>

    <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
      <h4 style="margin: 0 0 8px; font-size: 13px; text-transform: uppercase; color: #1e40af;">Book Details</h4>
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; color: #64748b; width: 110px;">Book Title:</td>
          <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">${bookTitle}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Book ID:</td>
          <td style="padding: 4px 0; font-family: monospace;">${bookId}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Issue Date:</td>
          <td style="padding: 4px 0;">${formattedIssueDate}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Due Date:</td>
          <td style="padding: 4px 0; font-weight: bold; color: #b91c1c;">${formattedDueDate}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #334155;">
      Please return the book to the library desk by <strong>${formattedDueDate}</strong> to avoid overdue fines of ₹5 per day.
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
    <p style="font-size: 12px; color: #64748b; margin: 0;">
      Thank you,<br />
      <strong>Library Department</strong><br />
      ${SCHOOL_NAME}<br />
      ${SCHOOL_LOCATION}
    </p>
  </div>
</div>`;

  return await sendMail({
    to: studentEmail,
    subject,
    text: textBody,
    html: htmlBody
  });
}

/**
 * Send Overdue Defaulter Reminder Email
 */
async function sendOverdueDefaulterEmail({
  studentName,
  studentEmail,
  bookTitle,
  bookId = 'N/A',
  issueDate,
  dueDate,
  daysOverdue,
  fineAmount
}) {
  const formattedIssueDate = formatDate(issueDate);
  const formattedDueDate = formatDate(dueDate);

  const subject = 'Overdue Library Book – Please Return Immediately';

  const textBody = `Dear ${studentName},

Our records show that the following library book has not been returned by its due date.

Book Details:
Book: ${bookTitle}
Book ID: ${bookId}
Issue Date: ${formattedIssueDate}
Due Date: ${formattedDueDate}
Days Overdue: ${daysOverdue}
Current Fine: ₹${fineAmount}
Fine Rate: ₹5 per day

Please return the book to the library as soon as possible.

Thank you,
Library Department
${SCHOOL_NAME}
${SCHOOL_LOCATION}`;

  const htmlBody = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #fecdd3; border-radius: 12px; overflow: hidden;">
  <div style="background: #991b1b; color: #ffffff; padding: 20px 24px;">
    <h2 style="margin: 0; font-size: 18px;">${SCHOOL_NAME}</h2>
    <p style="margin: 4px 0 0; font-size: 12px; color: #fecdd3;">URGENT: Overdue Library Circulation Notice • ${SCHOOL_LOCATION}</p>
  </div>
  <div style="padding: 24px;">
    <p style="font-size: 14px; font-weight: bold;">Dear ${studentName},</p>
    <p style="font-size: 13px; color: #475569;">
      Our records show that the following library book has not been returned by its designated due date.
    </p>

    <div style="background: #fff1f2; border-left: 4px solid #e11d48; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
      <h4 style="margin: 0 0 8px; font-size: 13px; text-transform: uppercase; color: #9f1239;">Defaulter Record Details</h4>
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; color: #64748b; width: 110px;">Book Title:</td>
          <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">${bookTitle}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Book ID:</td>
          <td style="padding: 4px 0; font-family: monospace;">${bookId}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Issue Date:</td>
          <td style="padding: 4px 0;">${formattedIssueDate}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Due Date:</td>
          <td style="padding: 4px 0; font-weight: bold; color: #991b1b;">${formattedDueDate}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Days Overdue:</td>
          <td style="padding: 4px 0; font-weight: bold; color: #e11d48;">${daysOverdue} days</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Current Fine:</td>
          <td style="padding: 4px 0; font-weight: bold; color: #e11d48; font-size: 15px;">₹${fineAmount}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Fine Rate:</td>
          <td style="padding: 4px 0; color: #64748b;">₹5 per day</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #334155;">
      Please return the book to the library desk as soon as possible to prevent additional overdue fines from accumulating.
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
    <p style="font-size: 12px; color: #64748b; margin: 0;">
      Thank you,<br />
      <strong>Library Department</strong><br />
      ${SCHOOL_NAME}<br />
      ${SCHOOL_LOCATION}
    </p>
  </div>
</div>`;

  return await sendMail({
    to: studentEmail,
    subject,
    text: textBody,
    html: htmlBody
  });
}

/**
 * Underlying helper to send email safely with error handling and fallback
 */
async function sendMail({ to, subject, text, html }) {
  if (!to) {
    return { success: false, message: 'Recipient email address is required.' };
  }

  const transporter = getTransporter();
  const fromAddress = getFromAddress();

  if (!transporter) {
    // Development fallback: safe simulated message logged cleanly to server console
    console.log(`\n======================================================`);
    console.log(`📨 [SIMULATED EMAIL DISPATCH] (No SMTP credentials configured in .env)`);
    console.log(`To:      ${to}`);
    console.log(`From:    ${fromAddress}`);
    console.log(`Subject: ${subject}`);
    console.log(`Notice:  Password reset email generated for user.`);
    console.log(`======================================================\n`);

    return {
      success: true,
      simulated: true,
      messageId: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      recipient: to,
      message: 'SMTP credentials are not configured in backend/.env. Simulated dispatch.'
    };
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html
    });

    console.log(`✅ [EMAIL DISPATCHED VIA SMTP] Message ID: ${info.messageId} to ${to}`);
    return {
      success: true,
      simulated: false,
      messageId: info.messageId,
      recipient: to
    };
  } catch (error) {
    console.error(`❌ [EMAIL DISPATCH FAILED] to ${to}:`, error.message);
    return {
      success: false,
      message: error.message || 'Unable to send email',
      error: error.message
    };
  }
}

/**
 * Send Professional 6-Digit Password Reset OTP Verification Email
 * Strictly email-based OTP; contains NO password reset link or buttons.
 */
async function sendPasswordResetOtpEmail({
  userName,
  userEmail,
  otpCode,
  expiresInMinutes = 10
}) {
  const subject = 'Your Adarsh School Password Reset Verification Code';
  const displayName = userName ? userName.trim() : 'User';

  const textBody = `Adarsh Senior Secondary School
Garhi Bazidpur, Gurugram, Haryana

Password Reset Verification

Hello ${displayName},

We received a request to reset the password for your school account.

Your verification code is:
${otpCode}

This code will expire in ${expiresInMinutes} minutes.

For your security, do not share this code with anyone.

If you did not request a password reset, you can safely ignore this email.

Regards,
Central IT Administration
Adarsh Senior Secondary School`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- School Header -->
    <tr>
      <td style="background-color: #1e3a8a; padding: 26px 32px; text-align: left;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td>
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">${SCHOOL_NAME}</h1>
              <p style="margin: 4px 0 0 0; color: #bfdbfe; font-size: 13px; font-weight: 500;">${SCHOOL_LOCATION}, Haryana</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Email Content -->
    <tr>
      <td style="padding: 32px 32px 28px;">
        <div style="display: inline-block; padding: 4px 10px; background-color: #eff6ff; color: #1e40af; border: 1px solid #dbeafe; border-radius: 6px; font-size: 12px; font-weight: 600; margin-bottom: 16px;">
          Password Reset Verification
        </div>

        <h2 style="margin: 0 0 16px 0; font-size: 17px; color: #0f172a; font-weight: 600;">
          Hello ${displayName},
        </h2>

        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
          We received a request to reset the password for your school account.
        </p>

        <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #334155;">
          Your verification code is:
        </p>

        <!-- Dynamic 6-Digit OTP Box (NO LINK, NO BUTTON) -->
        <div style="background-color: #f8fafc; border: 2px dashed #3b82f6; border-radius: 10px; padding: 20px 24px; text-align: center; margin: 20px 0;">
          <div style="font-size: 36px; font-weight: 800; letter-spacing: 0.35em; color: #1e3a8a; font-family: 'Courier New', Courier, monospace; margin: 0;">
            ${otpCode}
          </div>
          <p style="margin: 8px 0 0 0; font-size: 12px; font-weight: 600; color: #2563eb;">
            ⏱️ Valid for ${expiresInMinutes} minutes
          </p>
        </div>

        <p style="margin: 16px 0 12px 0; font-size: 13px; line-height: 1.5; color: #475569;">
          This code will expire in ${expiresInMinutes} minutes.
        </p>

        <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.5; color: #b45309; background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px 14px; border-radius: 4px;">
          <strong>Security Notice:</strong> For your security, do not share this code with anyone. School staff will never ask for your verification code.
        </p>

        <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.5; color: #64748b;">
          If you did not request a password reset, you can safely ignore this email.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 20px 0;" />

        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #334155;">
          Regards,<br />
          <strong>Central IT Administration</strong><br />
          ${SCHOOL_NAME}
        </p>
      </td>
    </tr>

    <!-- Institutional Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
          This is an official administrative notification from ${SCHOOL_NAME}.<br />
          Garhi Bazidpur, Gurugram, Haryana.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return await sendMail({
    to: userEmail,
    subject,
    text: textBody,
    html: htmlBody
  });
}

/**
 * Send Signup Email Verification OTP Code
 */
async function sendSignupVerificationEmail({
  userEmail,
  userName = 'Student',
  otpCode,
  expiresInMinutes = 10
}) {
  const subject = `Verify Your Adarsh Senior Secondary School Library Account`;
  const displayName = userName ? userName.trim() : 'Student';

  const textBody = `Dear ${displayName},

Welcome to Adarsh Senior Secondary School Digital Library Management System.

To verify your email address and activate your account, please enter the following verification code:

Verification Code: ${otpCode}

The verification code will expire in ${expiresInMinutes} minutes.
Please do not share this code with anyone. School staff will never ask for your verification code.

If you did not request this account registration, please ignore this email.

Regards,
Adarsh Senior Secondary School Library
Garhi Bazidpur, Gurugram, Haryana`;

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Header with School Identity -->
    <tr>
      <td style="background-color: #1e3a8a; padding: 24px 32px; border-bottom: 3px solid #f59e0b;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.025em;">
                ${SCHOOL_NAME}
              </h1>
              <p style="margin: 4px 0 0 0; color: #bfdbfe; font-size: 13px; font-weight: 500;">
                Library Management System • ${SCHOOL_LOCATION}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Email Content -->
    <tr>
      <td style="padding: 32px 32px 28px;">
        <div style="display: inline-block; padding: 4px 10px; background-color: #eff6ff; color: #1e40af; border: 1px solid #dbeafe; border-radius: 6px; font-size: 12px; font-weight: 600; margin-bottom: 16px;">
          Account Registration Verification
        </div>

        <h2 style="margin: 0 0 16px 0; font-size: 17px; color: #0f172a; font-weight: 600;">
          Hello ${displayName},
        </h2>

        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
          Thank you for registering with the <strong>${SCHOOL_NAME} Digital Library</strong>. To complete your registration and activate your account, please verify your email address.
        </p>

        <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #334155;">
          Your verification code is:
        </p>

        <!-- 6-Digit OTP Box -->
        <div style="background-color: #f8fafc; border: 2px dashed #3b82f6; border-radius: 10px; padding: 20px 24px; text-align: center; margin: 20px 0;">
          <div style="font-size: 36px; font-weight: 800; letter-spacing: 0.35em; color: #1e3a8a; font-family: 'Courier New', Courier, monospace; margin: 0;">
            ${otpCode}
          </div>
          <p style="margin: 8px 0 0 0; font-size: 12px; font-weight: 600; color: #2563eb;">
            ⏱️ The verification code will expire in ${expiresInMinutes} minutes.
          </p>
        </div>

        <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.5; color: #b45309; background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px 14px; border-radius: 4px;">
          <strong>Security Notice:</strong> Please do not share this code with anyone. School staff will never ask for your verification code.
        </p>

        <p style="margin: 16px 0 20px 0; font-size: 13px; line-height: 1.5; color: #64748b;">
          If you did not initiate this account registration, you can safely ignore this email. No account will be created without this verification.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 20px 0;" />

        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #334155;">
          Regards,<br />
          <strong>Central IT & Library Administration</strong><br />
          ${SCHOOL_NAME}
        </p>
      </td>
    </tr>

    <!-- Institutional Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
          This is an official administrative notification from ${SCHOOL_NAME}.<br />
          ${SCHOOL_LOCATION}, Haryana.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return await sendMail({
    to: userEmail,
    subject,
    text: textBody,
    html: htmlBody
  });
}

/**
 * Diagnostic helper to verify whether SMTP is configured and credentials are valid
 */
async function verifySmtpConnection() {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      configured: false,
      message: 'SMTP is not configured in backend/.env (EMAIL_USER / EMAIL_PASSWORD missing).'
    };
  }

  try {
    await transporter.verify();
    return {
      configured: true,
      success: true,
      message: 'SMTP connection verified successfully.'
    };
  } catch (error) {
    return {
      configured: true,
      success: false,
      message: `SMTP connection error: ${error.message}`,
      error: error.message
    };
  }
}

module.exports = {
  sendDueReminderEmail,
  sendOverdueDefaulterEmail,
  sendPasswordResetOtpEmail,
  sendSignupVerificationEmail,
  sendMail,
  verifySmtpConnection
};


