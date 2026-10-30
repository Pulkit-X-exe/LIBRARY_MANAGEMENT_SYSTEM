const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');

// --- 1. User & Profiles ---
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { 
    type: DataTypes.ENUM('student', 'teacher', 'librarian', 'admin'), 
    allowNull: false, 
    defaultValue: 'student' 
  },
  phone: { type: DataTypes.STRING },
  avatar: { type: DataTypes.STRING, defaultValue: '' },
  profile_picture: { type: DataTypes.STRING, defaultValue: '' },
  status: { 
    type: DataTypes.ENUM('active', 'inactive', 'suspended'), 
    defaultValue: 'active' 
  },
  reset_password_code: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  reset_password_expires: { 
    type: DataTypes.DATE, 
    allowNull: true 
  }
}, { timestamps: true });

const StudentProfile = sequelize.define('StudentProfile', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.STRING },
  roll_number: { type: DataTypes.STRING },
  class_name: { type: DataTypes.STRING, allowNull: false },
  section: { type: DataTypes.STRING },
  admission_number: { type: DataTypes.STRING, unique: true },
  barcode_id: { type: DataTypes.STRING, unique: true },
  library_card_number: { type: DataTypes.STRING }
}, { timestamps: true });

const TeacherProfile = sequelize.define('TeacherProfile', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.STRING, unique: true },
  department: { type: DataTypes.STRING, allowNull: false }
}, { timestamps: true });

const LibrarianProfile = sequelize.define('LibrarianProfile', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.STRING, unique: true }
}, { timestamps: true });

// --- 2. Master Catalog: Category, Subject, Author, Publisher ---
const Category = sequelize.define('Category', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  code: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT }
}, { timestamps: true });

const Subject = sequelize.define('Subject', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING }
}, { timestamps: true });

const Author = sequelize.define('Author', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  biography: { type: DataTypes.TEXT }
}, { timestamps: true });

const Publisher = sequelize.define('Publisher', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.STRING },
  contact: { type: DataTypes.STRING }
}, { timestamps: true });

// --- 3. Book & Copies ---
const Book = sequelize.define('Book', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  isbn: { type: DataTypes.STRING, allowNull: false, unique: true },
  title: { type: DataTypes.STRING, allowNull: false },
  edition: { type: DataTypes.STRING, defaultValue: '1st' },
  publication_year: { type: DataTypes.INTEGER, defaultValue: 2024 },
  language: { type: DataTypes.STRING, defaultValue: 'English' },
  description: { type: DataTypes.TEXT },
  short_summary: { type: DataTypes.TEXT },
  cover_image: { type: DataTypes.STRING, defaultValue: '' },
  total_copies: { type: DataTypes.INTEGER, defaultValue: 1 },
  available_copies: { type: DataTypes.INTEGER, defaultValue: 1 },
  issued_copies: { type: DataTypes.INTEGER, defaultValue: 0 },
  reserved_copies: { type: DataTypes.INTEGER, defaultValue: 0 },
  shelf_number: { type: DataTypes.STRING, defaultValue: 'Shelf 1' },
  rack_number: { type: DataTypes.STRING, defaultValue: 'Rack A' },
  row_number: { type: DataTypes.STRING, defaultValue: 'Row 1' },
  condition: { type: DataTypes.STRING, defaultValue: 'Good' },
  pages: { type: DataTypes.INTEGER, defaultValue: 250 },
  borrow_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  price: { type: DataTypes.FLOAT, defaultValue: 0.0 },
  acquisition_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  status: { 
    type: DataTypes.ENUM('available', 'issued', 'reserved', 'lost', 'damaged', 'under_repair', 'archived'), 
    defaultValue: 'available' 
  }
}, { timestamps: true });

const BookCopy = sequelize.define('BookCopy', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  barcode: { type: DataTypes.STRING, allowNull: false, unique: true },
  condition: { 
    type: DataTypes.ENUM('new', 'good', 'fair', 'damaged'), 
    defaultValue: 'good' 
  },
  status: { 
    type: DataTypes.ENUM('available', 'issued', 'reserved', 'lost', 'damaged', 'under_repair', 'archived'), 
    defaultValue: 'available' 
  }
}, { timestamps: true });

// --- 4. Circulation: Issues, Returns, Renewals ---
const BookIssue = sequelize.define('BookIssue', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  issue_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  due_date: { type: DataTypes.DATE, allowNull: false },
  return_date: { type: DataTypes.DATE },
  status: { 
    type: DataTypes.ENUM('issued', 'returned', 'overdue', 'lost'), 
    defaultValue: 'issued' 
  },
  renewal_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  notes: { type: DataTypes.TEXT }
}, { timestamps: true });

const BookReturn = sequelize.define('BookReturn', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  return_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  overdue_days: { type: DataTypes.INTEGER, defaultValue: 0 },
  fine_amount: { type: DataTypes.FLOAT, defaultValue: 0.0 },
  condition_on_return: { type: DataTypes.STRING, defaultValue: 'good' }
}, { timestamps: true });

// --- 4.1 Reminders ---
const BookIssueReminder = sequelize.define('BookIssueReminder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  issue_id: { type: DataTypes.INTEGER, allowNull: false },
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  reminder_type: { 
    type: DataTypes.ENUM('DUE_TOMORROW', 'MANUAL_DUE_REMINDER', 'OVERDUE'), 
    defaultValue: 'DUE_TOMORROW' 
  },
  recipient_email: { type: DataTypes.STRING, allowNull: false },
  sent_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  status: { 
    type: DataTypes.ENUM('sent', 'failed', 'logged'), 
    defaultValue: 'sent' 
  },
  notes: { type: DataTypes.TEXT }
}, { timestamps: true });

// --- 5. Reservations / Book Requests ---
const Reservation = sequelize.define('Reservation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  reservation_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  requested_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  reservation_start: { type: DataTypes.DATE, allowNull: true },
  reservation_expiry: { type: DataTypes.DATE, allowNull: true },
  status: { 
    type: DataTypes.STRING, 
    defaultValue: 'Pending' 
  },
  queue_position: { type: DataTypes.INTEGER, defaultValue: 1 },
  notified_at: { type: DataTypes.DATE, allowNull: true },
  expires_at: { type: DataTypes.DATE, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, { timestamps: true });

// --- 6. Fines & Payments ---
const Fine = sequelize.define('Fine', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  amount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.0 },
  fine_type: { 
    type: DataTypes.ENUM('late_return', 'lost_book', 'damaged_book'), 
    defaultValue: 'late_return' 
  },
  status: { 
    type: DataTypes.ENUM('pending', 'paid', 'waived'), 
    defaultValue: 'pending' 
  },
  waiver_reason: { type: DataTypes.TEXT },
  paid_at: { type: DataTypes.DATE }
}, { timestamps: true });

const FinePayment = sequelize.define('FinePayment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  amount_paid: { type: DataTypes.FLOAT, allowNull: false },
  payment_method: { 
    type: DataTypes.ENUM('cash', 'card', 'online', 'waived'), 
    defaultValue: 'cash' 
  },
  transaction_reference: { type: DataTypes.STRING },
  paid_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { timestamps: true });

// --- 7. Wishlist, Reviews & Ratings ---
const Wishlist = sequelize.define('Wishlist', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }
}, { timestamps: true });

const Review = sequelize.define('Review', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  review_text: { type: DataTypes.TEXT },
  is_moderated: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true });

// --- 8. Digital Library ---
const DigitalResource = sequelize.define('DigitalResource', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  resource_type: { 
    type: DataTypes.ENUM('ebook_pdf', 'question_paper', 'notes', 'magazine'), 
    defaultValue: 'ebook_pdf' 
  },
  file_url: { type: DataTypes.STRING, allowNull: false },
  file_size: { type: DataTypes.STRING, defaultValue: '1.2 MB' },
  access_role: { 
    type: DataTypes.ENUM('all', 'students_only', 'teachers_only'), 
    defaultValue: 'all' 
  },
  downloads_count: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { timestamps: true });

// --- 9. Announcements & Notifications ---
const Announcement = sequelize.define('Announcement', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  priority: { 
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'), 
    defaultValue: 'medium' 
  },
  category: { 
    type: DataTypes.ENUM('general', 'holiday', 'timings', 'new_arrivals'), 
    defaultValue: 'general' 
  },
  start_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  expiry_date: { type: DataTypes.DATEONLY }
}, { timestamps: true });

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: { 
    type: DataTypes.ENUM('issue', 'return', 'due_reminder', 'overdue', 'fine', 'reservation_available', 'announcement', 'system'), 
    defaultValue: 'system' 
  },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true });

// --- 10. Rules, Settings & Activity Logs ---
const LibraryRule = sequelize.define('LibraryRule', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  rule_key: { type: DataTypes.STRING, allowNull: false, unique: true },
  rule_value: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  role_target: { type: DataTypes.STRING, defaultValue: 'all' }
}, { timestamps: true });

const LibrarySetting = sequelize.define('LibrarySetting', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  key: { type: DataTypes.STRING, allowNull: false, unique: true },
  value: { type: DataTypes.TEXT, allowNull: false },
  group: { type: DataTypes.STRING, defaultValue: 'general' }
}, { timestamps: true });

const ActivityLog = sequelize.define('ActivityLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER },
  user_name: { type: DataTypes.STRING },
  user_role: { type: DataTypes.STRING },
  action: { type: DataTypes.STRING, allowNull: false },
  entity_type: { type: DataTypes.STRING },
  entity_id: { type: DataTypes.INTEGER },
  details: { type: DataTypes.TEXT },
  ip_address: { type: DataTypes.STRING }
}, { timestamps: true });

// --- 11. Password Reset Tokens (Email OTP & Authorization) ---
const PasswordResetToken = sequelize.define('PasswordResetToken', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  otp_hash: { type: DataTypes.STRING, allowNull: true },
  reset_token_hash: { type: DataTypes.STRING, allowNull: true },
  token_hash: { type: DataTypes.STRING, allowNull: true },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  used_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
  attempts: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
  tableName: 'password_reset_tokens',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// --- 12. Email Verification Tokens (Signup Verification) ---
const EmailVerificationToken = sequelize.define('EmailVerificationToken', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  verification_code_hash: { type: DataTypes.STRING, allowNull: false },
  signup_data: { type: DataTypes.TEXT, allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  verified_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
  attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
  last_resend_at: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'email_verification_tokens',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// ==========================================
// ASSOCIATIONS
// ==========================================

// User -> Profiles
User.hasOne(StudentProfile, { foreignKey: 'user_id', as: 'student_profile', onDelete: 'CASCADE' });
StudentProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasOne(TeacherProfile, { foreignKey: 'user_id', as: 'teacher_profile', onDelete: 'CASCADE' });
TeacherProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasOne(LibrarianProfile, { foreignKey: 'user_id', as: 'librarian_profile', onDelete: 'CASCADE' });
LibrarianProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Book -> Masters
Book.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
Category.hasMany(Book, { foreignKey: 'category_id', as: 'books' });

Book.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
Subject.hasMany(Book, { foreignKey: 'subject_id', as: 'books' });

Book.belongsTo(Author, { foreignKey: 'author_id', as: 'author' });
Author.hasMany(Book, { foreignKey: 'author_id', as: 'books' });

Book.belongsTo(Publisher, { foreignKey: 'publisher_id', as: 'publisher' });
Publisher.hasMany(Book, { foreignKey: 'publisher_id', as: 'books' });

// Book -> Copies
Book.hasMany(BookCopy, { foreignKey: 'book_id', as: 'copies', onDelete: 'CASCADE' });
BookCopy.belongsTo(Book, { foreignKey: 'book_id', as: 'book' });

// Issues
User.hasMany(BookIssue, { foreignKey: 'user_id', as: 'issues' });
BookIssue.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(BookIssue, { foreignKey: 'issued_by_id', as: 'issued_by_transactions' });
BookIssue.belongsTo(User, { foreignKey: 'issued_by_id', as: 'librarian' });

Book.hasMany(BookIssue, { foreignKey: 'book_id', as: 'issues' });
BookIssue.belongsTo(Book, { foreignKey: 'book_id', as: 'book' });

BookCopy.hasMany(BookIssue, { foreignKey: 'copy_id', as: 'issues' });
BookIssue.belongsTo(BookCopy, { foreignKey: 'copy_id', as: 'copy' });

// Returns
BookIssue.hasOne(BookReturn, { foreignKey: 'issue_id', as: 'return_record', onDelete: 'CASCADE' });
BookReturn.belongsTo(BookIssue, { foreignKey: 'issue_id', as: 'issue' });

User.hasMany(BookReturn, { foreignKey: 'received_by_id', as: 'received_returns' });
BookReturn.belongsTo(User, { foreignKey: 'received_by_id', as: 'receiver' });

// Reservations
User.hasMany(Reservation, { foreignKey: 'user_id', as: 'reservations' });
Reservation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Book.hasMany(Reservation, { foreignKey: 'book_id', as: 'reservations' });
Reservation.belongsTo(Book, { foreignKey: 'book_id', as: 'book' });

// Fines
BookIssue.hasOne(Fine, { foreignKey: 'issue_id', as: 'fine' });
Fine.belongsTo(BookIssue, { foreignKey: 'issue_id', as: 'issue' });

User.hasMany(Fine, { foreignKey: 'user_id', as: 'fines' });
Fine.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Fine, { foreignKey: 'waived_by_id', as: 'waived_fines' });
Fine.belongsTo(User, { foreignKey: 'waived_by_id', as: 'waiver_officer' });

Fine.hasMany(FinePayment, { foreignKey: 'fine_id', as: 'payments', onDelete: 'CASCADE' });
FinePayment.belongsTo(Fine, { foreignKey: 'fine_id', as: 'fine' });

// Wishlist
User.hasMany(Wishlist, { foreignKey: 'user_id', as: 'wishlist_items', onDelete: 'CASCADE' });
Wishlist.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Book.hasMany(Wishlist, { foreignKey: 'book_id', as: 'wishlisted_by', onDelete: 'CASCADE' });
Wishlist.belongsTo(Book, { foreignKey: 'book_id', as: 'book' });

// Reviews
User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews', onDelete: 'CASCADE' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Book.hasMany(Review, { foreignKey: 'book_id', as: 'reviews', onDelete: 'CASCADE' });
Review.belongsTo(Book, { foreignKey: 'book_id', as: 'book' });

// Notifications
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Announcements
User.hasMany(Announcement, { foreignKey: 'created_by_id', as: 'announcements' });
Announcement.belongsTo(User, { foreignKey: 'created_by_id', as: 'author' });

// Reminders
BookIssue.hasMany(BookIssueReminder, { foreignKey: 'issue_id', as: 'reminders', onDelete: 'CASCADE' });
BookIssueReminder.belongsTo(BookIssue, { foreignKey: 'issue_id', as: 'issue' });

User.hasMany(BookIssueReminder, { foreignKey: 'student_id', as: 'reminders', onDelete: 'CASCADE' });
BookIssueReminder.belongsTo(User, { foreignKey: 'student_id', as: 'student' });

// Password Reset Tokens
User.hasMany(PasswordResetToken, { foreignKey: 'user_id', as: 'password_reset_tokens', onDelete: 'CASCADE' });
PasswordResetToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  Op,
  User,
  StudentProfile,
  TeacherProfile,
  LibrarianProfile,
  Category,
  Subject,
  Author,
  Publisher,
  Book,
  BookCopy,
  BookIssue,
  BookReturn,
  BookIssueReminder,
  Reservation,
  Fine,
  FinePayment,
  Wishlist,
  Review,
  DigitalResource,
  Announcement,
  Notification,
  LibraryRule,
  LibrarySetting,
  ActivityLog,
  PasswordResetToken,
  EmailVerificationToken
};
