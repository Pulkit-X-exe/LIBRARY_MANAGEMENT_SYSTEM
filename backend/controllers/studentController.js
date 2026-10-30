const { Op } = require('sequelize');
const { 
  User, StudentProfile, BookIssue, BookReturn, Book, BookCopy, Fine, FinePayment 
} = require('../models');

// Helper to normalize class query variations
const getClassMatchVariants = (className) => {
  const clean = String(className).trim().replace(/^class\s+/i, '').replace(/^grade\s+/i, '');
  const romanMap = { '9': 'IX', '10': 'X', '11': 'XI', '12': 'XII' };
  const roman = romanMap[clean];

  const variants = [clean, `Class ${clean}`, `Grade ${clean}`];
  if (roman) {
    variants.push(roman, `Class ${roman}`, `Grade ${roman}`);
  }
  return variants;
};

// 1. Get summary count of students for Class 9, 10, 11, 12 and Sections A, B, C, D
exports.getClassesSummary = async (req, res) => {
  try {
    const classes = ['9', '10', '11', '12'];
    const sections = ['A', 'B', 'C', 'D'];

    const allStudents = await StudentProfile.findAll({
      include: [
        {
          model: User,
          as: 'user',
          where: { role: 'student', status: 'active' },
          attributes: ['id', 'status']
        }
      ],
      attributes: ['id', 'class_name', 'section']
    });

    const summary = classes.map(cls => {
      const clsVariants = getClassMatchVariants(cls).map(v => v.toLowerCase());
      const classStudents = allStudents.filter(s => 
        clsVariants.includes(String(s.class_name || '').toLowerCase())
      );

      const sectionCounts = {};
      sections.forEach(sec => {
        sectionCounts[sec] = classStudents.filter(s => 
          String(s.section || '').toUpperCase() === sec
        ).length;
      });

      return {
        class_number: cls,
        class_name: `Class ${cls}`,
        total_students: classStudents.length,
        sections: sectionCounts
      };
    });

    const totalStudents = summary.reduce((acc, curr) => acc + curr.total_students, 0);

    return res.json({
      success: true,
      total_students: totalStudents,
      classes: summary
    });
  } catch (error) {
    console.error('getClassesSummary error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve classes summary.' });
  }
};

// 2. Get students by specific Class and Section with search & sorting
exports.getStudentsBySection = async (req, res) => {
  try {
    const { className, section } = req.params;
    const { search, sortBy = 'roll_number', sortOrder = 'ASC' } = req.query;

    if (!className || !section) {
      return res.status(400).json({ success: false, message: 'Class and section are required.' });
    }

    const clsVariants = getClassMatchVariants(className);
    const secNormalized = String(section).trim().toUpperCase();

    const studentWhere = {
      class_name: { [Op.in]: clsVariants },
      section: secNormalized
    };

    const userWhere = {
      role: 'student'
    };

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      // Search by student name, email, roll number, admission number, student_id, or library_card_number
      userWhere[Op.or] = [
        { name: { [Op.like]: q } },
        { email: { [Op.like]: q } },
        { '$student_profile.roll_number$': { [Op.like]: q } },
        { '$student_profile.admission_number$': { [Op.like]: q } },
        { '$student_profile.student_id$': { [Op.like]: q } },
        { '$student_profile.library_card_number$': { [Op.like]: q } },
        { '$student_profile.barcode_id$': { [Op.like]: q } }
      ];
    }

    const users = await User.findAll({
      where: userWhere,
      attributes: { exclude: ['password'] },
      include: [
        {
          model: StudentProfile,
          as: 'student_profile',
          where: studentWhere,
          required: true
        }
      ]
    });

    // Format students and attach active loans and pending fine stats
    const studentList = await Promise.all(users.map(async u => {
      const sp = u.student_profile;
      const activeLoansCount = await BookIssue.count({
        where: { user_id: u.id, status: ['issued', 'overdue'] }
      });
      const pendingFines = await Fine.sum('amount', {
        where: { user_id: u.id, status: 'pending' }
      }) || 0;

      const studentId = sp.student_id || sp.barcode_id || `STU${String(u.id).padStart(4, '0')}`;
      const libraryCardNo = sp.library_card_number || sp.barcode_id || `LIB-${String(u.id).padStart(4, '0')}`;

      return {
        id: u.id,
        user_id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        profile_picture: u.profile_picture || u.avatar || '',
        avatar: u.profile_picture || u.avatar || '',
        status: u.status,
        class: sp.class_name,
        section: sp.section,
        roll_number: sp.roll_number,
        admission_number: sp.admission_number,
        student_id: studentId,
        library_card_number: libraryCardNo,
        active_loans_count: activeLoansCount,
        total_pending_fine: pendingFines,
        library_status: activeLoansCount > 0 ? (pendingFines > 0 ? 'Fines Due' : 'Books Issued') : 'Clear',
        created_at: u.createdAt,
        updated_at: u.updatedAt
      };
    }));

    // In-memory sorting (handles numerical roll numbers correctly)
    studentList.sort((a, b) => {
      if (sortBy === 'roll_number') {
        const numA = parseInt(a.roll_number, 10);
        const numB = parseInt(b.roll_number, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortOrder.toUpperCase() === 'DESC' ? numB - numA : numA - numB;
        }
        return sortOrder.toUpperCase() === 'DESC'
          ? String(b.roll_number).localeCompare(String(a.roll_number))
          : String(a.roll_number).localeCompare(String(b.roll_number));
      } else if (sortBy === 'name') {
        return sortOrder.toUpperCase() === 'DESC'
          ? b.name.localeCompare(a.name)
          : a.name.localeCompare(b.name);
      }
      return 0;
    });

    return res.json({
      success: true,
      class_name: `Class ${className.replace(/^class\s+/i, '')}`,
      section: secNormalized,
      total_students: studentList.length,
      students: studentList
    });
  } catch (error) {
    console.error('getStudentsBySection error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve students for selected section.' });
  }
};

// 3. Get individual student profile
exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      where: { id, role: 'student' },
      attributes: { exclude: ['password'] },
      include: [{ model: StudentProfile, as: 'student_profile' }]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    const sp = user.student_profile || {};
    const studentId = sp.student_id || sp.barcode_id || `STU${String(user.id).padStart(4, '0')}`;
    const libraryCardNo = sp.library_card_number || sp.barcode_id || `LIB-${String(user.id).padStart(4, '0')}`;

    return res.json({
      success: true,
      student: {
        id: user.id,
        user_id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        profile_picture: user.profile_picture || user.avatar || '',
        avatar: user.profile_picture || user.avatar || '',
        status: user.status,
        class: sp.class_name,
        section: sp.section,
        roll_number: sp.roll_number,
        admission_number: sp.admission_number,
        student_id: studentId,
        library_card_number: libraryCardNo,
        created_at: user.createdAt,
        updated_at: user.updatedAt
      }
    });
  } catch (error) {
    console.error('getStudentById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve student record.' });
  }
};

// 4. Get Student's Complete Library Profile (Digital Card, Active Issues, Book History, Fines)
exports.getStudentLibraryProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      where: { id, role: 'student' },
      attributes: { exclude: ['password'] },
      include: [{ model: StudentProfile, as: 'student_profile' }]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    const sp = user.student_profile || {};
    const studentId = sp.student_id || sp.barcode_id || `STU${String(user.id).padStart(4, '0')}`;
    const libraryCardNo = sp.library_card_number || sp.barcode_id || `LIB-${String(user.id).padStart(4, '0')}`;

    // A. Currently Issued Books
    const activeIssues = await BookIssue.findAll({
      where: {
        user_id: user.id,
        status: ['issued', 'overdue']
      },
      include: [
        { model: Book, as: 'book', attributes: ['id', 'title', 'isbn', 'cover_image'] },
        { model: BookCopy, as: 'copy', attributes: ['id', 'barcode', 'condition'] }
      ],
      order: [['issue_date', 'DESC']]
    });

    // B. Past Book History (Returned)
    const returnedIssues = await BookIssue.findAll({
      where: {
        user_id: user.id,
        status: 'returned'
      },
      include: [
        { model: Book, as: 'book', attributes: ['id', 'title', 'isbn'] },
        { model: BookReturn, as: 'return_record', attributes: ['return_date', 'overdue_days', 'fine_amount'] }
      ],
      order: [['return_date', 'DESC']],
      limit: 50
    });

    // C. Fine Records
    const fines = await Fine.findAll({
      where: { user_id: user.id },
      include: [
        {
          model: BookIssue,
          as: 'issue',
          include: [{ model: Book, as: 'book', attributes: ['id', 'title'] }]
        },
        { model: FinePayment, as: 'payments' }
      ],
      order: [['createdAt', 'DESC']]
    });

    // D. Calculate Summary Stats
    const currentlyIssuedCount = activeIssues.length;
    const overdueCount = activeIssues.filter(i => {
      const now = new Date();
      return i.status === 'overdue' || (i.due_date && new Date(i.due_date) < now);
    }).length;

    const totalBorrowedCount = currentlyIssuedCount + returnedIssues.length;

    const pendingFines = fines.filter(f => f.status === 'pending');
    const paidFines = fines.filter(f => f.status === 'paid');

    const outstandingFineAmount = pendingFines.reduce((sum, f) => sum + (f.amount || 0), 0);
    const totalPaidFineAmount = paidFines.reduce((sum, f) => sum + (f.amount || 0), 0);

    return res.json({
      success: true,
      student: {
        id: user.id,
        user_id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        profile_picture: user.profile_picture || user.avatar || '',
        avatar: user.profile_picture || user.avatar || '',
        status: user.status,
        class: sp.class_name,
        section: sp.section,
        roll_number: sp.roll_number,
        admission_number: sp.admission_number,
        student_id: studentId,
        library_card_number: libraryCardNo,
        created_at: user.createdAt,
        updated_at: user.updatedAt
      },
      library_card: {
        card_number: libraryCardNo,
        student_id: studentId,
        student_name: user.name,
        class: sp.class_name,
        section: sp.section,
        roll_number: sp.roll_number,
        admission_number: sp.admission_number,
        status: user.status === 'active' ? 'Active' : user.status,
        profile_picture: user.profile_picture || user.avatar || ''
      },
      library_summary: {
        currently_issued: currentlyIssuedCount,
        overdue_books: overdueCount,
        total_borrowed: totalBorrowedCount,
        outstanding_fine: outstandingFineAmount,
        total_paid_fine: totalPaidFineAmount,
        current_fine: outstandingFineAmount
      },
      currently_issued_books: activeIssues.map(i => ({
        issue_id: i.id,
        book_id: i.book?.id,
        title: i.book?.title || 'Unknown Title',
        author: i.book?.author || 'Academic Faculty',
        isbn: i.book?.isbn || '',
        copy_barcode: i.copy?.barcode || '',
        issue_date: i.issue_date,
        due_date: i.due_date,
        status: i.status === 'overdue' || (new Date(i.due_date) < new Date()) ? 'Overdue' : 'Issued',
        renewal_count: i.renewal_count
      })),
      past_book_history: returnedIssues.map(i => ({
        issue_id: i.id,
        book_id: i.book?.id,
        title: i.book?.title || 'Unknown Title',
        author: i.book?.author || 'Academic Faculty',
        issue_date: i.issue_date,
        return_date: i.return_record?.return_date || i.return_date || i.updatedAt,
        status: 'Returned',
        overdue_days: i.return_record?.overdue_days || 0
      })),
      fine_information: {
        current_fine: outstandingFineAmount,
        total_paid: totalPaidFineAmount,
        outstanding_fine: outstandingFineAmount,
        history: fines.map(f => ({
          fine_id: f.id,
          reason: f.fine_type === 'late_return' ? 'Late Return' : (f.fine_type === 'lost_book' ? 'Lost Book' : 'Damaged Book'),
          book_title: f.issue?.book?.title || 'Library Resource',
          amount: f.amount,
          date: f.paid_at || f.createdAt,
          status: f.status === 'paid' ? 'Paid' : (f.status === 'waived' ? 'Waived' : 'Pending')
        }))
      }
    });
  } catch (error) {
    console.error('getStudentLibraryProfile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve student library profile.' });
  }
};

// 5. General student search or listing endpoint
exports.getAllStudents = async (req, res) => {
  try {
    const { className, section, search, page = 1, limit = 50 } = req.query;
    const studentWhere = {};
    const userWhere = { role: 'student' };

    if (className) {
      studentWhere.class_name = { [Op.in]: getClassMatchVariants(className) };
    }
    if (section) {
      studentWhere.section = String(section).trim().toUpperCase();
    }
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      userWhere[Op.or] = [
        { name: { [Op.like]: q } },
        { email: { [Op.like]: q } }
      ];
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { count, rows: users } = await User.findAndCountAll({
      where: userWhere,
      attributes: { exclude: ['password'] },
      include: [
        {
          model: StudentProfile,
          as: 'student_profile',
          where: Object.keys(studentWhere).length ? studentWhere : undefined,
          required: true
        }
      ],
      order: [['name', 'ASC']],
      limit: parseInt(limit, 10),
      offset
    });

    const students = users.map(u => {
      const sp = u.student_profile || {};
      return {
        id: u.id,
        user_id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        profile_picture: u.profile_picture || u.avatar || '',
        class: sp.class_name,
        section: sp.section,
        roll_number: sp.roll_number,
        admission_number: sp.admission_number,
        student_id: sp.student_id || sp.barcode_id || `STU${String(u.id).padStart(4, '0')}`,
        library_card_number: sp.library_card_number || sp.barcode_id || `LIB-${String(u.id).padStart(4, '0')}`,
        status: u.status
      };
    });

    return res.json({
      success: true,
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      students
    });
  } catch (error) {
    console.error('getAllStudents error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve students list.' });
  }
};
