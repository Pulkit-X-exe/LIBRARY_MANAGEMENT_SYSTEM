const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { handleProfileUpload, handleBulkImportUpload } = require('../middleware/upload');

// Controllers
const authCtrl = require('../controllers/authController');
const bookCtrl = require('../controllers/bookController');
const circCtrl = require('../controllers/circulationController');
const resCtrl = require('../controllers/reservationController');
const fineCtrl = require('../controllers/fineController');
const userCtrl = require('../controllers/userController');
const masterCtrl = require('../controllers/masterController');
const ruleCtrl = require('../controllers/ruleController');
const annCtrl = require('../controllers/announcementController');
const digCtrl = require('../controllers/digitalController');
const revCtrl = require('../controllers/reviewController');
const wishCtrl = require('../controllers/wishlistController');
const notifCtrl = require('../controllers/notificationController');
const repCtrl = require('../controllers/reportController');
const anaCtrl = require('../controllers/analyticsController');
const bkpCtrl = require('../controllers/backupController');
const actCtrl = require('../controllers/activityController');
const studentCtrl = require('../controllers/studentController');
const libraryOpsCtrl = require('../controllers/libraryOperationsController');
const gamifyCtrl = require('../controllers/gamificationController');
const readingListCtrl = require('../controllers/readingListController');
const recCtrl = require('../controllers/recommendationController');
const curatedRecCtrl = require('../controllers/curatedRecommendationController');
const bulkImportCtrl = require('../controllers/bulkImportController');

// 1. Auth & Profile
router.post('/auth/login', authCtrl.login);
router.post('/auth/register', handleProfileUpload, authCtrl.register);
router.post('/auth/verify-signup-email', authCtrl.verifySignupEmail);
router.post('/auth/resend-signup-verification', authCtrl.resendSignupVerification);
router.get('/auth/me', verifyToken, authCtrl.getMe);
router.put('/auth/profile', verifyToken, authCtrl.updateProfile);
router.post('/auth/profile-picture', verifyToken, handleProfileUpload, authCtrl.updateProfilePicture);
router.post('/auth/forgot-password', authCtrl.forgotPassword);
router.post('/auth/verify-reset-code', authCtrl.verifyResetCode);
router.post('/auth/reset-password', authCtrl.resetPassword);

// 2. Books & Inventory
router.get('/books/discovery-stats', bookCtrl.getDiscoveryStats);
router.get('/books', bookCtrl.getAllBooks);
router.get('/books/:id', bookCtrl.getBookById);
router.post('/books', verifyToken, authorizeRoles('librarian', 'admin'), bookCtrl.createBook);
router.put('/books/:id', verifyToken, authorizeRoles('librarian', 'admin'), bookCtrl.updateBook);
router.delete('/books/:id', verifyToken, authorizeRoles('admin'), bookCtrl.deleteBook);
router.put('/books/copies/:copyId', verifyToken, authorizeRoles('librarian', 'admin'), bookCtrl.updateCopyStatus);
router.post('/books/bulk-import', verifyToken, authorizeRoles('librarian', 'admin'), handleBulkImportUpload, bulkImportCtrl.bulkImportBooks);

// 3. Circulation (Issues, Returns, Renewals) - Physical issue by Librarian / Admin ONLY
router.post('/circulation/issue', verifyToken, authorizeRoles('librarian', 'admin'), circCtrl.issueBook);
router.post('/circulation/return', verifyToken, authorizeRoles('librarian', 'admin'), circCtrl.returnBook);
router.post('/circulation/renew', verifyToken, circCtrl.renewBook);
router.get('/circulation/loans/active', verifyToken, circCtrl.getActiveLoans);
router.get('/circulation/loans/history', verifyToken, circCtrl.getLoanHistory);
router.get('/circulation/scan-patron/:identifier', verifyToken, authorizeRoles('librarian', 'admin'), circCtrl.scanPatron);
router.get('/circulation/scan-book/:identifier', verifyToken, authorizeRoles('librarian', 'admin'), circCtrl.scanBook);

// 3.1 Library Operations: Issued Books, Defaulters, Reminders, Returns
router.get('/library/issues/active', verifyToken, authorizeRoles('librarian', 'admin'), libraryOpsCtrl.getIssuedBooks);
router.get('/library/issues', verifyToken, authorizeRoles('librarian', 'admin'), libraryOpsCtrl.getIssuedBooks);
router.get('/library/defaulters', verifyToken, authorizeRoles('librarian', 'admin'), libraryOpsCtrl.getDefaulters);
router.post('/library/issues/:id/send-reminder', verifyToken, authorizeRoles('librarian', 'admin'), libraryOpsCtrl.sendManualReminder);
router.get('/library/smtp-status', verifyToken, authorizeRoles('librarian', 'admin'), libraryOpsCtrl.getSmtpStatus);
router.post('/library/issues/:id/return', verifyToken, authorizeRoles('librarian', 'admin'), libraryOpsCtrl.markBookReturned);
router.get('/library/dashboard-stats', verifyToken, authorizeRoles('librarian', 'admin'), libraryOpsCtrl.getDashboardLibraryStats);
router.post('/library/run-audit', verifyToken, authorizeRoles('librarian', 'admin'), libraryOpsCtrl.triggerAudit);

// 4. Reservations & Requests (Student discovery & reservation, Librarian approval & fulfillment)
router.post('/reservations', verifyToken, resCtrl.reserveBook);
router.get('/reservations', verifyToken, resCtrl.getReservations);
router.post('/reservations/:id/approve', verifyToken, authorizeRoles('librarian', 'admin'), resCtrl.approveReservation);
router.post('/reservations/:id/reject', verifyToken, authorizeRoles('librarian', 'admin'), resCtrl.rejectReservation);
router.post('/reservations/:id/ready', verifyToken, authorizeRoles('librarian', 'admin'), resCtrl.markReady);
router.post('/reservations/:id/collect', verifyToken, authorizeRoles('librarian', 'admin'), resCtrl.markCollected);
router.delete('/reservations/:id', verifyToken, resCtrl.cancelReservation);

// 5. Fines & Payments
router.get('/fines', verifyToken, fineCtrl.getFines);
router.post('/fines/:id/pay', verifyToken, fineCtrl.payFine);
router.post('/fines/:id/waive', verifyToken, authorizeRoles('librarian', 'admin'), fineCtrl.waiveFine);

// 6. Users (Admin only)
router.get('/users', verifyToken, authorizeRoles('admin'), userCtrl.getAllUsers);
router.post('/users', verifyToken, authorizeRoles('admin'), userCtrl.createUser);
router.put('/users/:id', verifyToken, authorizeRoles('admin', 'librarian'), userCtrl.updateUser);
router.delete('/users/:id', verifyToken, authorizeRoles('admin'), userCtrl.deleteUser);

// 6.1 Students Management (Librarian / Admin)
router.get('/students/classes-summary', verifyToken, authorizeRoles('librarian', 'admin'), studentCtrl.getClassesSummary);
router.get('/students/class/:className/section/:section', verifyToken, authorizeRoles('librarian', 'admin'), studentCtrl.getStudentsBySection);
router.get('/students/:id/library', verifyToken, authorizeRoles('librarian', 'admin'), studentCtrl.getStudentLibraryProfile);
router.get('/students/:id', verifyToken, authorizeRoles('librarian', 'admin'), studentCtrl.getStudentById);
router.get('/students', verifyToken, authorizeRoles('librarian', 'admin'), studentCtrl.getAllStudents);

// 7. Master Catalog
router.get('/categories', masterCtrl.getCategories);
router.post('/categories', verifyToken, authorizeRoles('librarian', 'admin'), masterCtrl.createCategory);
router.put('/categories/:id', verifyToken, authorizeRoles('librarian', 'admin'), masterCtrl.updateCategory);
router.delete('/categories/:id', verifyToken, authorizeRoles('admin'), masterCtrl.deleteCategory);

router.get('/subjects', masterCtrl.getSubjects);
router.post('/subjects', verifyToken, authorizeRoles('librarian', 'admin'), masterCtrl.createSubject);

router.get('/authors', masterCtrl.getAuthors);
router.post('/authors', verifyToken, authorizeRoles('librarian', 'admin'), masterCtrl.createAuthor);

router.get('/publishers', masterCtrl.getPublishers);
router.post('/publishers', verifyToken, authorizeRoles('librarian', 'admin'), masterCtrl.createPublisher);

// 8. Rules & Settings
router.get('/rules', ruleCtrl.getRules);
router.put('/rules/:id', verifyToken, authorizeRoles('admin'), ruleCtrl.updateRule);
router.get('/settings', ruleCtrl.getSettings);
router.put('/settings', verifyToken, authorizeRoles('admin'), ruleCtrl.updateSettings);

// 9. Announcements
router.get('/announcements', annCtrl.getAnnouncements);
router.post('/announcements', verifyToken, authorizeRoles('librarian', 'admin'), annCtrl.createAnnouncement);
router.delete('/announcements/:id', verifyToken, authorizeRoles('librarian', 'admin'), annCtrl.deleteAnnouncement);

// 10. Digital Library
router.get('/digital', verifyToken, digCtrl.getResources);
router.get('/digital/:id/download', verifyToken, digCtrl.downloadResource);

// 11. Reviews & Ratings
router.get('/reviews/book/:bookId', revCtrl.getBookReviews);
router.post('/reviews', verifyToken, revCtrl.addReview);
router.delete('/reviews/:id', verifyToken, revCtrl.deleteReview);
router.put('/reviews/:id/moderate', verifyToken, authorizeRoles('librarian', 'admin'), revCtrl.moderateReview);

// 11.1 Personal Reading Lists
router.get('/reading-lists', verifyToken, readingListCtrl.getReadingLists);
router.post('/reading-lists', verifyToken, readingListCtrl.createReadingList);
router.put('/reading-lists/:id', verifyToken, readingListCtrl.updateReadingList);
router.delete('/reading-lists/:id', verifyToken, readingListCtrl.deleteReadingList);
router.post('/reading-lists/:id/books', verifyToken, readingListCtrl.addBookToList);
router.delete('/reading-lists/:id/books/:bookId', verifyToken, readingListCtrl.removeBookFromList);

// 11.2 Recommendations (Local Algorithmic & School Curated)
router.get('/recommendations/for-you', verifyToken, recCtrl.getRecommendationsForYou);
router.get('/curated-recommendations', verifyToken, curatedRecCtrl.getCuratedRecommendations);
router.post('/curated-recommendations', verifyToken, authorizeRoles('librarian', 'admin'), curatedRecCtrl.createCuratedRecommendation);
router.delete('/curated-recommendations/:id', verifyToken, authorizeRoles('librarian', 'admin'), curatedRecCtrl.deleteCuratedRecommendation);

// 11.3 Gamification, Goals & Leaderboard
router.get('/analytics/student', verifyToken, gamifyCtrl.getStudentAnalytics);
router.get('/gamification/goals', verifyToken, gamifyCtrl.getReadingGoal);
router.post('/gamification/goals', verifyToken, gamifyCtrl.updateReadingGoal);
router.get('/gamification/badges', verifyToken, gamifyCtrl.getBadges);
router.get('/gamification/leaderboard', verifyToken, gamifyCtrl.getLeaderboard);
router.put('/gamification/leaderboard/toggle', verifyToken, authorizeRoles('librarian', 'admin'), gamifyCtrl.toggleLeaderboard);

// 12. Wishlist
router.get('/wishlist', verifyToken, wishCtrl.getWishlist);
router.post('/wishlist/toggle', verifyToken, wishCtrl.toggleWishlist);

// 13. Notifications
router.get('/notifications', verifyToken, notifCtrl.getNotifications);
router.put('/notifications/:id/read', verifyToken, notifCtrl.markAsRead);
router.put('/notifications/read-all', verifyToken, notifCtrl.markAllAsRead);

// 14. Reports & Analytics
router.get('/reports/circulation', verifyToken, authorizeRoles('librarian', 'admin'), repCtrl.getCirculationReport);
router.get('/reports/overdue', verifyToken, authorizeRoles('librarian', 'admin'), repCtrl.getOverdueReport);
router.get('/reports/fines', verifyToken, authorizeRoles('librarian', 'admin'), repCtrl.getFineReport);
router.get('/reports/inventory', verifyToken, authorizeRoles('librarian', 'admin'), repCtrl.getInventoryReport);
router.get('/reports/inventory-intelligence', verifyToken, authorizeRoles('librarian', 'admin'), repCtrl.getInventoryIntelligence);
router.get('/reports/pdf/:type', verifyToken, authorizeRoles('librarian', 'admin'), repCtrl.downloadPdfReport);
router.get('/analytics/dashboard', verifyToken, authorizeRoles('librarian', 'admin'), anaCtrl.getDashboardAnalytics);

// 15. Activity Logs & Backup (Admin)
router.get('/activity-logs', verifyToken, authorizeRoles('admin', 'librarian'), actCtrl.getActivityLogs);
router.get('/backup/export', verifyToken, authorizeRoles('admin'), bkpCtrl.exportBackup);
router.post('/backup/restore', verifyToken, authorizeRoles('admin'), bkpCtrl.restoreBackup);

module.exports = router;
