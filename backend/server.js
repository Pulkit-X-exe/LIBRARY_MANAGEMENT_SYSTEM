require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize, BookIssue, Fine, BookIssueReminder, PasswordResetToken, EmailVerificationToken } = require('./models');
const { getRules, calculateOverdueFine } = require('./services/ruleEngine');
const { initScheduler, runDailyLibraryAudit } = require('./services/scheduler');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'School Library Management System API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mount API routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`==================================================`);
  console.log(`🏫 Adarsh Senior Secondary School Management System`);
  console.log(`📍 Garhi Bazidpur, Gurugram`);
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🩺 Healthcheck:       http://localhost:${PORT}/api/health`);
  console.log(`==================================================`);

  // Verify and ensure database columns exist
  try {
    const queryInterface = sequelize.getQueryInterface();
    const { DataTypes } = require('sequelize');
    
    // Check Users table
    const userTable = await queryInterface.describeTable('Users').catch(() => null);
    if (userTable && !userTable.profile_picture) {
      await queryInterface.addColumn('Users', 'profile_picture', {
        type: DataTypes.STRING,
        defaultValue: ''
      });
      console.log('✅ Synchronized database: Added profile_picture column to Users table.');
    }
    if (userTable && !userTable.reset_password_code) {
      await queryInterface.addColumn('Users', 'reset_password_code', {
        type: DataTypes.STRING,
        allowNull: true
      });
      console.log('✅ Synchronized database: Added reset_password_code column to Users table.');
    }
    if (userTable && !userTable.reset_password_expires) {
      await queryInterface.addColumn('Users', 'reset_password_expires', {
        type: DataTypes.DATE,
        allowNull: true
      });
      console.log('✅ Synchronized database: Added reset_password_expires column to Users table.');
    }

    // Check StudentProfiles table
    const studentTable = await queryInterface.describeTable('StudentProfiles').catch(() => null);
    if (studentTable) {
      if (!studentTable.student_id) {
        await queryInterface.addColumn('StudentProfiles', 'student_id', {
          type: DataTypes.STRING,
          defaultValue: ''
        });
        console.log('✅ Synchronized database: Added student_id column to StudentProfiles table.');
      }
      if (!studentTable.library_card_number) {
        await queryInterface.addColumn('StudentProfiles', 'library_card_number', {
          type: DataTypes.STRING,
          defaultValue: ''
        });
        console.log('✅ Synchronized database: Added library_card_number column to StudentProfiles table.');
      }
    }

    // Check Books table columns
    const booksTable = await queryInterface.describeTable('Books').catch(() => null);
    if (booksTable) {
      if (!booksTable.issued_copies) {
        await queryInterface.addColumn('Books', 'issued_copies', { type: DataTypes.INTEGER, defaultValue: 0 });
      }
      if (!booksTable.reserved_copies) {
        await queryInterface.addColumn('Books', 'reserved_copies', { type: DataTypes.INTEGER, defaultValue: 0 });
      }
      if (!booksTable.pages) {
        await queryInterface.addColumn('Books', 'pages', { type: DataTypes.INTEGER, defaultValue: 250 });
      }
      if (!booksTable.condition) {
        await queryInterface.addColumn('Books', 'condition', { type: DataTypes.STRING, defaultValue: 'Good' });
      }
      if (!booksTable.borrow_count) {
        await queryInterface.addColumn('Books', 'borrow_count', { type: DataTypes.INTEGER, defaultValue: 0 });
      }
      if (!booksTable.short_summary) {
        await queryInterface.addColumn('Books', 'short_summary', { type: DataTypes.TEXT, allowNull: true });
      }
      console.log('✅ Synchronized database: Books inventory columns verified.');
    }

    // Check Reservations table columns
    const resTable = await queryInterface.describeTable('Reservations').catch(() => null);
    if (resTable) {
      if (!resTable.requested_at) {
        await queryInterface.addColumn('Reservations', 'requested_at', { type: DataTypes.DATE, defaultValue: DataTypes.NOW });
      }
      if (!resTable.reservation_start) {
        await queryInterface.addColumn('Reservations', 'reservation_start', { type: DataTypes.DATE, allowNull: true });
      }
      if (!resTable.reservation_expiry) {
        await queryInterface.addColumn('Reservations', 'reservation_expiry', { type: DataTypes.DATE, allowNull: true });
      }
      if (!resTable.notes) {
        await queryInterface.addColumn('Reservations', 'notes', { type: DataTypes.TEXT, allowNull: true });
      }
      console.log('✅ Synchronized database: Reservations request columns verified.');
    }

    // Ensure BookIssueReminder and PasswordResetToken tables exist
    await BookIssueReminder.sync();
    console.log('✅ Synchronized database: BookIssueReminder table verified.');

    await PasswordResetToken.sync();
    const resetTable = await queryInterface.describeTable('password_reset_tokens').catch(() => null);
    if (resetTable) {
      if (!resetTable.otp_hash) {
        await queryInterface.addColumn('password_reset_tokens', 'otp_hash', {
          type: DataTypes.STRING,
          allowNull: true
        });
        console.log('✅ Synchronized database: Added otp_hash column to password_reset_tokens.');
      }
      if (!resetTable.reset_token_hash) {
        await queryInterface.addColumn('password_reset_tokens', 'reset_token_hash', {
          type: DataTypes.STRING,
          allowNull: true
        });
        console.log('✅ Synchronized database: Added reset_token_hash column to password_reset_tokens.');
      }
      if (!resetTable.attempts) {
        await queryInterface.addColumn('password_reset_tokens', 'attempts', {
          type: DataTypes.INTEGER,
          defaultValue: 0
        });
        console.log('✅ Synchronized database: Added attempts column to password_reset_tokens.');
      }
    }
    console.log('✅ Synchronized database: password_reset_tokens table verified.');

    await EmailVerificationToken.sync();
    console.log('✅ Synchronized database: email_verification_tokens table verified.');
  } catch (dbErr) {
    console.warn('Database column check notice:', dbErr.message);
  }

  // Initialize automated daily scheduler
  initScheduler();

  // Run audit on startup
  await runDailyLibraryAudit();
});
