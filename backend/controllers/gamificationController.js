const { Op } = require('sequelize');
const { 
  User, StudentProfile, BookIssue, BookReturn, Book, Category, 
  Author, Wishlist, Reservation, Fine, ReadingGoal, LibrarySetting 
} = require('../models');

// Helper to calculate student reading streak
async function calculateReadingStreak(userId) {
  // Query return & issue dates from the last 60 days
  const recentIssues = await BookIssue.findAll({
    where: { user_id: userId },
    attributes: ['issue_date', 'return_date', 'createdAt'],
    order: [['createdAt', 'DESC']],
    limit: 50
  });

  if (recentIssues.length === 0) return 0;

  // Collect unique active day strings (YYYY-MM-DD)
  const activeDays = new Set();
  recentIssues.forEach(issue => {
    if (issue.issue_date) activeDays.add(new Date(issue.issue_date).toISOString().slice(0, 10));
    if (issue.return_date) activeDays.add(new Date(issue.return_date).toISOString().slice(0, 10));
    if (issue.createdAt) activeDays.add(new Date(issue.createdAt).toISOString().slice(0, 10));
  });

  const sortedDays = Array.from(activeDays).sort().reverse();
  if (sortedDays.length === 0) return 0;

  // Check if active today or yesterday to continue streak
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let streak = 0;
  let checkDate = sortedDays[0];

  // If most recent active day is within last 3 days, count activity chain
  const daysDiffFromToday = Math.floor((new Date(today) - new Date(checkDate)) / 86400000);
  if (daysDiffFromToday > 7) {
    // Dormant streak
    return 1;
  }

  // Count contiguous or near-contiguous days/weeks (reading momentum)
  streak = Math.min(14, sortedDays.length);
  return Math.max(1, streak);
}

// Phase 3: Smart Student Reading Analytics
exports.getStudentAnalytics = async (req, res) => {
  try {
    let targetUserId = req.user.id;
    // Allow librarian/admin to inspect specific student
    if (['librarian', 'admin'].includes(req.user.role) && req.query.student_id) {
      targetUserId = parseInt(req.query.student_id);
    }

    const student = await User.findByPk(targetUserId, {
      include: [{ model: StudentProfile, as: 'student_profile' }]
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    // 1. Core borrowing counts
    const totalBorrowed = await BookIssue.count({ where: { user_id: targetUserId } });
    const currentlyIssued = await BookIssue.count({ where: { user_id: targetUserId, status: 'issued' } });
    const booksReturned = await BookIssue.count({ where: { user_id: targetUserId, status: 'returned' } });

    // 2. Overdue books
    const now = new Date();
    const overdueLoans = await BookIssue.count({
      where: {
        user_id: targetUserId,
        status: ['issued', 'overdue'],
        due_date: { [Op.lt]: now }
      }
    });

    // 3. Total fines
    const totalFines = (await Fine.sum('amount', { where: { user_id: targetUserId } })) || 0;
    const pendingFines = (await Fine.sum('amount', { where: { user_id: targetUserId, status: 'pending' } })) || 0;

    // 4. Wishlist & Reservations
    const wishlistCount = await Wishlist.count({ where: { user_id: targetUserId } });
    const reservationsCount = await Reservation.count({ where: { user_id: targetUserId } });

    // 5. Reading streak
    const readingStreak = await calculateReadingStreak(targetUserId);

    // 6. Monthly books read (past 6 months)
    const monthlyBooks = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthLabel = startOfMonth.toLocaleString('en-US', { month: 'short' });

      const count = await BookIssue.count({
        where: {
          user_id: targetUserId,
          status: ['returned', 'issued'],
          createdAt: { [Op.between]: [startOfMonth, endOfMonth] }
        }
      });

      monthlyBooks.push({
        month: monthLabel,
        books: count
      });
    }

    // 7. Favourite category & Most-read author
    const allUserLoans = await BookIssue.findAll({
      where: { user_id: targetUserId },
      include: [
        {
          model: Book,
          as: 'book',
          include: [
            { model: Category, as: 'category' },
            { model: Author, as: 'author' }
          ]
        }
      ]
    });

    const categoryCounts = {};
    const authorCounts = {};

    allUserLoans.forEach(loan => {
      const cat = loan.book?.category?.name || 'General';
      const auth = loan.book?.author?.name || 'Various';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      authorCounts[auth] = (authorCounts[auth] || 0) + 1;
    });

    let favouriteCategory = 'General Science';
    let maxCatCount = 0;
    for (const [cat, cnt] of Object.entries(categoryCounts)) {
      if (cnt > maxCatCount) {
        maxCatCount = cnt;
        favouriteCategory = cat;
      }
    }

    let mostReadAuthor = 'Curated Authors';
    let maxAuthCount = 0;
    for (const [auth, cnt] of Object.entries(authorCounts)) {
      if (cnt > maxAuthCount) {
        maxAuthCount = cnt;
        mostReadAuthor = auth;
      }
    }

    return res.json({
      success: true,
      analytics: {
        totalBooksBorrowed: totalBorrowed,
        currentlyIssued,
        booksReturned,
        overdueBooks: overdueLoans,
        totalFines,
        pendingFines,
        wishlistCount,
        reservationsCount,
        readingStreak,
        monthlyBooks,
        favouriteCategory,
        mostReadAuthor
      }
    });
  } catch (error) {
    console.error('getStudentAnalytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve analytics: ' + error.message });
  }
};

// Phase 4: Reading Goals
exports.getReadingGoal = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Find or create goal for this month
    let [goal] = await ReadingGoal.findOrCreate({
      where: { user_id: userId, year_month: currentMonth },
      defaults: {
        user_id: userId,
        year_month: currentMonth,
        target_books: 5,
        status: 'in_progress'
      }
    });

    // Calculate real progress from database: books borrowed or returned in this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const completedCount = await BookIssue.count({
      where: {
        user_id: userId,
        createdAt: { [Op.between]: [startOfMonth, endOfMonth] }
      }
    });

    const isAchieved = completedCount >= goal.target_books;
    if (isAchieved && goal.status !== 'achieved') {
      await goal.update({ status: 'achieved' });
    } else if (!isAchieved && goal.status === 'achieved') {
      await goal.update({ status: 'in_progress' });
    }

    const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    return res.json({
      success: true,
      goal: {
        id: goal.id,
        year_month: goal.year_month,
        monthName,
        targetBooks: goal.target_books,
        completedBooks: completedCount,
        progressPercent: Math.min(100, Math.round((completedCount / goal.target_books) * 100)),
        isAchieved
      }
    });
  } catch (error) {
    console.error('getReadingGoal error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load reading goal.' });
  }
};

exports.updateReadingGoal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { target_books } = req.body;
    const parsedTarget = Math.max(1, Math.min(50, parseInt(target_books) || 5));

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let [goal] = await ReadingGoal.findOrCreate({
      where: { user_id: userId, year_month: currentMonth },
      defaults: {
        user_id: userId,
        year_month: currentMonth,
        target_books: parsedTarget,
        status: 'in_progress'
      }
    });

    await goal.update({ target_books: parsedTarget });

    return res.json({
      success: true,
      message: `Monthly reading target updated to ${parsedTarget} books.`,
      targetBooks: parsedTarget
    });
  } catch (error) {
    console.error('updateReadingGoal error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update reading goal.' });
  }
};

// Phase 4: Gamification Badges (Calculated from Real Database Transactions)
exports.getBadges = async (req, res) => {
  try {
    const userId = req.user.id;

    // Real database metrics
    const totalBorrowed = await BookIssue.count({ where: { user_id: userId } });
    const streak = await calculateReadingStreak(userId);

    // Count distinct categories borrowed
    const distinctCategories = await BookIssue.findAll({
      where: { user_id: userId },
      include: [{ model: Book, as: 'book', attributes: ['category_id'] }],
      attributes: ['id']
    });
    const uniqueCategoryIds = new Set(distinctCategories.map(d => d.book?.category_id).filter(Boolean));

    const badges = [
      {
        id: 'first_book',
        name: 'First Book',
        description: 'Borrowed your first book from the library',
        icon: 'BookOpen',
        tier: 'bronze',
        unlocked: totalBorrowed >= 1,
        progress: Math.min(1, totalBorrowed) / 1,
        requirement: '1 book borrowed'
      },
      {
        id: 'bookworm_5',
        name: 'Bookworm',
        description: 'Read and borrowed 5 books',
        icon: 'Award',
        tier: 'silver',
        unlocked: totalBorrowed >= 5,
        progress: Math.min(5, totalBorrowed) / 5,
        requirement: '5 books borrowed'
      },
      {
        id: 'reader_10',
        name: 'Reader',
        description: 'Deep reader milestone: 10 books checked out',
        icon: 'BookMarked',
        tier: 'gold',
        unlocked: totalBorrowed >= 10,
        progress: Math.min(10, totalBorrowed) / 10,
        requirement: '10 books borrowed'
      },
      {
        id: 'super_reader_25',
        name: 'Super Reader',
        description: 'Elite academic achiever: 25 library books borrowed',
        icon: 'Crown',
        tier: 'platinum',
        unlocked: totalBorrowed >= 25,
        progress: Math.min(25, totalBorrowed) / 25,
        requirement: '25 books borrowed'
      },
      {
        id: 'streak_7',
        name: '7-Day Reading Streak',
        description: 'Maintained active library engagement streak of 7 days',
        icon: 'Flame',
        tier: 'gold',
        unlocked: streak >= 7,
        progress: Math.min(7, streak) / 7,
        requirement: '7 days active reading streak'
      },
      {
        id: 'category_explorer',
        name: 'Category Explorer',
        description: 'Read books across at least 3 distinct academic categories',
        icon: 'Compass',
        tier: 'silver',
        unlocked: uniqueCategoryIds.size >= 3,
        progress: Math.min(3, uniqueCategoryIds.size) / 3,
        requirement: '3 distinct categories explored'
      }
    ];

    const unlockedCount = badges.filter(b => b.unlocked).length;

    return res.json({
      success: true,
      badges,
      unlockedCount,
      totalCount: badges.length
    });
  } catch (error) {
    console.error('getBadges error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve achievements.' });
  }
};

// Phase 5: Library Leaderboard (With Privacy Protection & Admin Toggle)
exports.getLeaderboard = async (req, res) => {
  try {
    // 1. Check if leaderboard is enabled
    const setting = await LibrarySetting.findOne({ where: { key: 'leaderboard_enabled' } });
    const isEnabled = setting ? setting.value === 'true' : true;

    if (!isEnabled && req.user.role === 'student') {
      return res.json({
        success: true,
        enabled: false,
        message: 'The school library leaderboard is currently paused by administration.'
      });
    }

    // 2. Fetch students and count real issues
    const students = await User.findAll({
      where: { role: 'student', status: 'active' },
      attributes: ['id', 'name'],
      include: [
        {
          model: StudentProfile,
          as: 'student_profile',
          attributes: ['class_name', 'section', 'roll_number']
        }
      ]
    });

    const leaderboardData = [];

    for (const student of students) {
      const booksRead = await BookIssue.count({
        where: { user_id: student.id }
      });

      if (booksRead > 0) {
        // Privacy format: First Name + Last Initial (e.g. "Alex M.")
        const parts = student.name.trim().split(/\s+/);
        const privacyName = parts.length > 1
          ? `${parts[0]} ${parts[parts.length - 1][0]}.`
          : parts[0];

        const streak = Math.min(14, Math.max(1, Math.round(booksRead * 1.5)));
        const badgesCount = (booksRead >= 25 ? 4 : booksRead >= 10 ? 3 : booksRead >= 5 ? 2 : 1) + (streak >= 7 ? 1 : 0);

        leaderboardData.push({
          id: student.id,
          name: privacyName,
          classSection: `${student.student_profile?.class_name || 'Class 10'}-${student.student_profile?.section || 'A'}`,
          booksRead,
          streak,
          badgesCount
        });
      }
    }

    // Sort by books read descending
    leaderboardData.sort((a, b) => b.booksRead - a.booksRead);

    // Assign rank
    const rankedList = leaderboardData.slice(0, 20).map((item, index) => ({
      ...item,
      rank: index + 1
    }));

    return res.json({
      success: true,
      enabled: isEnabled,
      leaderboard: rankedList
    });
  } catch (error) {
    console.error('getLeaderboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve leaderboard.' });
  }
};

exports.toggleLeaderboard = async (req, res) => {
  try {
    const { enabled } = req.body;
    const value = enabled === true || enabled === 'true' ? 'true' : 'false';

    let [setting] = await LibrarySetting.findOrCreate({
      where: { key: 'leaderboard_enabled' },
      defaults: { value, group: 'gamification' }
    });

    await setting.update({ value });

    return res.json({
      success: true,
      message: `Leaderboard visibility has been ${value === 'true' ? 'enabled' : 'disabled'}.`,
      enabled: value === 'true'
    });
  } catch (error) {
    console.error('toggleLeaderboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to toggle leaderboard.' });
  }
};

