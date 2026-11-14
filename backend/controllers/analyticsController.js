const { Op } = require('sequelize');
const { 
  Book, BookCopy, BookIssue, BookReturn, User, StudentProfile, 
  TeacherProfile, Fine, Category, Author, Reservation 
} = require('../models');

// Phase 14: Real Database Librarian & Admin Analytics
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const totalBooks = await Book.count();
    const totalCopies = await BookCopy.count();
    const availableCopies = await BookCopy.count({ where: { status: 'available' } });
    const issuedCopies = await BookCopy.count({ where: { status: 'issued' } });
    const reservedCopies = await BookCopy.count({ where: { status: 'reserved' } });
    const lostCopies = await BookCopy.count({ where: { status: 'lost' } });
    const damagedCopies = await BookCopy.count({ where: { status: 'damaged' } });

    const totalStudents = await User.count({ where: { role: 'student' } });
    const totalTeachers = await User.count({ where: { role: 'teacher' } });

    const now = new Date();
    const overdueLoans = await BookIssue.count({
      where: {
        status: ['issued', 'overdue'],
        due_date: { [Op.lt]: now }
      }
    });

    const pendingFines = (await Fine.sum('amount', { where: { status: 'pending' } })) || 0;
    const collectedFines = (await Fine.sum('amount', { where: { status: 'paid' } })) || 0;
    const waivedFines = (await Fine.sum('amount', { where: { status: 'waived' } })) || 0;
    const activeReservations = await Reservation.count({ where: { status: ['waiting', 'notified', 'Approved'] } });

    // Books never borrowed
    const neverBorrowedCount = await Book.count({
      where: {
        [Op.or]: [
          { borrow_count: 0 },
          { borrow_count: null }
        ]
      }
    });

    // 1. Most Popular Categories by Actual Borrows
    const allIssues = await BookIssue.findAll({
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'cover_image', 'borrow_count', 'category_id', 'author_id'],
          include: [
            { model: Category, as: 'category', attributes: ['id', 'name'] },
            { model: Author, as: 'author', attributes: ['id', 'name'] }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'role'],
          include: [{ model: StudentProfile, as: 'student_profile', attributes: ['class_name', 'section', 'roll_number'] }]
        }
      ]
    });

    const categoryBorrowMap = {};
    const bookFrequency = {};
    const studentFrequency = {};
    const classBorrowMap = { 'Class IX': 0, 'Class X': 0, 'Class XI': 0, 'Class XII': 0 };

    allIssues.forEach(issue => {
      // Category count
      const catName = issue.book?.category?.name || 'General';
      categoryBorrowMap[catName] = (categoryBorrowMap[catName] || 0) + 1;

      // Book count
      if (issue.book) {
        const bId = issue.book.id;
        if (!bookFrequency[bId]) {
          bookFrequency[bId] = {
            id: bId,
            title: issue.book.title,
            cover_image: issue.book.cover_image,
            category: catName,
            author: issue.book.author?.name || 'Academic Author',
            borrowCount: 0
          };
        }
        bookFrequency[bId].borrowCount++;
      }

      // Student count
      if (issue.user && issue.user.role === 'student') {
        const uId = issue.user.id;
        const studentClass = issue.user.student_profile?.class_name || 'Class X';
        classBorrowMap[studentClass] = (classBorrowMap[studentClass] || 0) + 1;

        if (!studentFrequency[uId]) {
          studentFrequency[uId] = {
            id: uId,
            name: issue.user.name,
            className: studentClass,
            section: issue.user.student_profile?.section || 'A',
            rollNumber: issue.user.student_profile?.roll_number || '1001',
            borrowCount: 0
          };
        }
        studentFrequency[uId].borrowCount++;
      }
    });

    const classBorrowing = Object.entries(classBorrowMap).map(([className, count]) => ({
      className,
      count
    }));

    // Format top categories
    const mostPopularCategories = Object.entries(categoryBorrowMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Format top books
    const mostBorrowedBooks = Object.values(bookFrequency)
      .sort((a, b) => b.borrowCount - a.borrowCount)
      .slice(0, 10);

    // Format top active students
    const mostActiveStudents = Object.values(studentFrequency)
      .sort((a, b) => b.borrowCount - a.borrowCount)
      .slice(0, 10);

    // 2. Real Monthly Issues vs Returns Trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthLabel = startOfMonth.toLocaleString('en-US', { month: 'short' });

      const issuedCount = await BookIssue.count({
        where: {
          issue_date: { [Op.between]: [startOfMonth, endOfMonth] }
        }
      });

      const returnedCount = await BookReturn.count({
        where: {
          return_date: { [Op.between]: [startOfMonth, endOfMonth] }
        }
      });

      monthlyTrend.push({
        month: monthLabel,
        issued: issuedCount,
        returned: returnedCount
      });
    }

    // 3. Category Total Stock Distribution
    const categories = await Category.findAll({
      include: [{ model: Book, as: 'books', attributes: ['id'] }]
    });
    const categoryData = categories.map(c => ({
      name: c.name,
      count: c.books ? c.books.length : 0
    }));

    return res.json({
      success: true,
      kpis: {
        totalBooks,
        totalCopies,
        availableCopies,
        issuedCopies,
        reservedCopies,
        lostCopies,
        damagedCopies,
        neverBorrowedCount,
        totalStudents,
        totalTeachers,
        overdueLoans,
        pendingFines,
        collectedFines,
        waivedFines,
        activeReservations
      },
      categoryData,
      classBorrowing,
      mostPopularCategories,
      mostBorrowed: mostBorrowedBooks,
      mostActiveStudents,
      monthlyTrend
    });
  } catch (error) {
    console.error('getDashboardAnalytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve analytics: ' + error.message });
  }
};
