const { Op } = require('sequelize');
const { 
  Book, BookCopy, BookIssue, BookReturn, User, StudentProfile, 
  TeacherProfile, Fine, Reservation, Notification, ActivityLog,
  Category, Author
} = require('../models');
const { getRules, calculateOverdueFine } = require('../services/ruleEngine');
const { logActivity } = require('../middleware/logger');

exports.issueBook = async (req, res) => {
  try {
    const { user_id, book_id, copy_barcode, student_identifier } = req.body;
    const rules = await getRules();

    // 1. Identify Target User
    // Students CANNOT directly issue books online. Strict requirement.
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'Students cannot directly issue books online. Please submit a Book Reservation request for librarian approval and counter issue.'
      });
    }

    let borrower;
    if (req.user.role === 'teacher') {
      // Faculty borrow directly for themselves
      borrower = await User.findByPk(req.user.id, {
        include: [
          { model: StudentProfile, as: 'student_profile' },
          { model: TeacherProfile, as: 'teacher_profile' }
        ]
      });
    } else if (user_id) {
      borrower = await User.findByPk(user_id, {
        include: [{ model: StudentProfile, as: 'student_profile' }]
      });
    } else if (student_identifier) {
      // Find by roll number, admission number, or student barcode
      const profile = await StudentProfile.findOne({
        where: {
          [Op.or]: [
            { roll_number: student_identifier },
            { admission_number: student_identifier },
            { barcode_id: student_identifier }
          ]
        },
        include: [{ model: User, as: 'user' }]
      });
      if (profile && profile.user) {
        borrower = profile.user;
      } else {
        // Fallback: check User email
        borrower = await User.findOne({ where: { email: student_identifier } });
      }
    }

    if (!borrower) {
      return res.status(404).json({ success: false, message: 'Borrower user not found.' });
    }

    if (borrower.status !== 'active') {
      return res.status(400).json({ success: false, message: `Cannot issue book: User account is ${borrower.status}.` });
    }

    // 2. Enforce Borrowing Limits
    const maxLimit = borrower.role === 'teacher' ? rules.teacher_max_books : rules.student_max_books;
    const activeLoansCount = await BookIssue.count({
      where: {
        user_id: borrower.id,
        status: ['issued', 'overdue']
      }
    });

    if (activeLoansCount >= maxLimit) {
      return res.status(400).json({
        success: false,
        message: `Maximum borrowing limit reached. ${borrower.role === 'teacher' ? 'Teachers' : 'Students'} are allowed up to ${maxLimit} books concurrently (currently holding: ${activeLoansCount}).`
      });
    }

    // 3. Check Pending Unpaid Fines
    const pendingFinesTotal = await Fine.sum('amount', {
      where: { user_id: borrower.id, status: 'pending' }
    });
    if (pendingFinesTotal && pendingFinesTotal > 100) {
      return res.status(400).json({
        success: false,
        message: `User has ₹${pendingFinesTotal} in unpaid overdue fines. Please clear fines before borrowing new books.`
      });
    }

    // 4. Locate Available Physical Copy
    let copy;
    if (copy_barcode) {
      copy = await BookCopy.findOne({
        where: { barcode: copy_barcode },
        include: [{ model: Book, as: 'book' }]
      });
      if (!copy) {
        return res.status(404).json({ success: false, message: `Book copy with barcode "${copy_barcode}" not found.` });
      }
      if (copy.status !== 'available') {
        return res.status(400).json({ success: false, message: `Book copy (${copy.barcode}) is currently "${copy.status}".` });
      }
    } else if (book_id) {
      copy = await BookCopy.findOne({
        where: { book_id, status: 'available' },
        include: [{ model: Book, as: 'book' }]
      });
      if (!copy) {
        return res.status(400).json({ success: false, message: 'No available physical copies remain for this title.' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Please specify book_id or copy_barcode.' });
    }

    const book = copy.book;

    // 5. Check Reservations Queue
    // If book is reserved by someone else, check if borrower is the one holding priority
    const topReservation = await Reservation.findOne({
      where: { book_id: book.id, status: ['waiting', 'notified'] },
      order: [['queue_position', 'ASC']]
    });

    if (topReservation && topReservation.user_id !== borrower.id) {
      // Someone else has a reserved claim
      return res.status(400).json({
        success: false,
        message: 'This book copy is held for a pending reservation by another student/faculty member.'
      });
    }

    // 6. Calculate Due Date
    const loanDays = borrower.role === 'teacher' ? Math.max(28, rules.borrow_duration_days) : rules.borrow_duration_days;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanDays);

    // 7. Execute Issue Transaction
    await copy.update({ status: 'issued' });
    
    const issue = await BookIssue.create({
      book_id: book.id,
      copy_id: copy.id,
      user_id: borrower.id,
      issued_by_id: req.user.id,
      issue_date: new Date(),
      due_date: dueDate,
      status: 'issued',
      renewal_count: 0
    });

    // Update book inventory counts consistently
    const activeIssued = await BookIssue.count({ where: { book_id: book.id, status: 'issued' } });
    const activeReserved = await Reservation.count({ where: { book_id: book.id, status: ['Approved', 'Ready for Pickup'] } });
    const newAvail = Math.max(0, book.total_copies - activeIssued - activeReserved);
    await book.update({
      available_copies: newAvail,
      issued_copies: activeIssued,
      borrow_count: (book.borrow_count || 0) + 1
    });

    // Fulfill reservation if borrower had reserved it
    if (topReservation && topReservation.user_id === borrower.id) {
      await topReservation.update({ status: 'fulfilled' });
    }

    // Send Notification
    await Notification.create({
      user_id: borrower.id,
      title: 'Book Issued Successfully',
      message: `"${book.title}" (Copy: ${copy.barcode}) has been issued to you. Due date is ${dueDate.toLocaleDateString()}.`,
      type: 'issue'
    });

    // Audit Log
    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'BOOK_ISSUED',
      entityType: 'BookIssue',
      entityId: issue.id,
      details: `Issued "${book.title}" (${copy.barcode}) to ${borrower.name} (${borrower.email})`,
      ip: req.ip
    });

    return res.status(201).json({
      success: true,
      message: `Successfully issued "${book.title}" to ${borrower.name}.`,
      issue: {
        ...issue.toJSON(),
        book,
        copy,
        borrower
      }
    });
  } catch (error) {
    console.error('issueBook error:', error);
    return res.status(500).json({ success: false, message: 'Failed to issue book: ' + error.message });
  }
};

exports.returnBook = async (req, res) => {
  try {
    const { issue_id, copy_barcode, condition = 'good' } = req.body;
    const rules = await getRules();

    let issue;
    if (issue_id) {
      issue = await BookIssue.findByPk(issue_id, {
        include: [
          { model: Book, as: 'book' },
          { model: BookCopy, as: 'copy' },
          { model: User, as: 'user' }
        ]
      });
    } else if (copy_barcode) {
      const copy = await BookCopy.findOne({ where: { barcode: copy_barcode } });
      if (!copy) {
        return res.status(404).json({ success: false, message: `Barcode "${copy_barcode}" not found.` });
      }
      issue = await BookIssue.findOne({
        where: { copy_id: copy.id, status: ['issued', 'overdue'] },
        include: [
          { model: Book, as: 'book' },
          { model: BookCopy, as: 'copy' },
          { model: User, as: 'user' }
        ]
      });
    }

    if (!issue || !['issued', 'overdue'].includes(issue.status)) {
      return res.status(404).json({
        success: false,
        message: 'No active issued transaction found for this book or barcode.'
      });
    }

    const returnDate = new Date();
    const { overdueDays, fineAmount } = calculateOverdueFine(
      issue.due_date, 
      returnDate, 
      rules.fine_per_day, 
      rules.grace_period_days
    );

    // Update Issue status
    await issue.update({
      return_date: returnDate,
      status: 'returned'
    });

    // Create BookReturn record
    await BookReturn.create({
      issue_id: issue.id,
      return_date: returnDate,
      received_by_id: req.user.id,
      overdue_days: overdueDays,
      fine_amount: fineAmount,
      condition_on_return: condition
    });

    // Create Fine if overdue
    let fineRecord = null;
    if (fineAmount > 0) {
      fineRecord = await Fine.create({
        issue_id: issue.id,
        user_id: issue.user_id,
        amount: fineAmount,
        fine_type: 'late_return',
        status: 'pending'
      });

      await Notification.create({
        user_id: issue.user_id,
        title: 'Overdue Fine Assessed',
        message: `A fine of ₹${fineAmount} (${overdueDays} days late) was assessed on return of "${issue.book.title}".`,
        type: 'fine'
      });
    }

    // Update Physical Copy condition and status
    const copy = issue.copy;
    const book = issue.book;
    const copyStatus = condition === 'damaged' ? 'damaged' : 'available';
    await copy.update({
      status: copyStatus,
      condition
    });

    // Recalculate book counts accurately
    const activeIssued = await BookIssue.count({ where: { book_id: book.id, status: 'issued' } });
    const activeReserved = await Reservation.count({ where: { book_id: book.id, status: ['Approved', 'Ready for Pickup'] } });
    const availCount = Math.max(0, book.total_copies - activeIssued - activeReserved);
    await book.update({
      available_copies: availCount,
      issued_copies: activeIssued,
      reserved_copies: activeReserved
    });

    // Check reservation queue
    let nextReservationUser = null;
    if (copyStatus === 'available') {
      const nextReservation = await Reservation.findOne({
        where: { book_id: book.id, status: 'waiting' },
        order: [['queue_position', 'ASC']],
        include: [{ model: User, as: 'user' }]
      });

      if (nextReservation) {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + (rules.reservation_expiry_hours || 48));

        await nextReservation.update({
          status: 'notified',
          notified_at: new Date(),
          expires_at: expiry
        });

        nextReservationUser = nextReservation.user;

        await Notification.create({
          user_id: nextReservation.user_id,
          title: 'Reserved Book Now Available!',
          message: `The book "${book.title}" you reserved is now waiting at the circulation desk. Please pick it up before ${expiry.toLocaleDateString()}.`,
          type: 'reservation_available'
        });
      }
    }

    await Notification.create({
      user_id: issue.user_id,
      title: 'Book Returned Successfully',
      message: `"${book.title}" has been received and checked in.`,
      type: 'return'
    });

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'BOOK_RETURNED',
      entityType: 'BookReturn',
      entityId: issue.id,
      details: `Returned "${book.title}" (${copy.barcode}) from ${issue.user.name}. Fine: ₹${fineAmount}`,
      ip: req.ip
    });

    return res.json({
      success: true,
      message: `Book "${book.title}" checked in successfully.`,
      overdueDays,
      fineAmount,
      fine: fineRecord,
      nextReservationNotified: nextReservationUser ? nextReservationUser.name : null
    });
  } catch (error) {
    console.error('returnBook error:', error);
    return res.status(500).json({ success: false, message: 'Failed to return book: ' + error.message });
  }
};

exports.renewBook = async (req, res) => {
  try {
    const { issue_id } = req.body;
    const rules = await getRules();

    const issue = await BookIssue.findByPk(issue_id, {
      include: [
        { model: Book, as: 'book' },
        { model: User, as: 'user' }
      ]
    });

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Transaction record not found.' });
    }

    // Check authorization: borrower or librarian/admin
    if (req.user.role === 'student' || req.user.role === 'teacher') {
      if (issue.user_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Unauthorized to renew this loan.' });
      }
    }

    if (issue.status !== 'issued') {
      return res.status(400).json({ success: false, message: `Cannot renew book in "${issue.status}" status.` });
    }

    // Phase 7: Block renewal if the book is already overdue
    const now = new Date();
    if (new Date(issue.due_date) < now || issue.status === 'overdue') {
      return res.status(400).json({
        success: false,
        message: 'Cannot renew book: This loan is already overdue. Please return the book at the circulation desk and clear any applicable late fees.'
      });
    }

    // Check renewal limits: Maximum 2 renewals per issue
    const maxRenewals = Math.min(2, rules.max_renewals || 2);
    if (issue.renewal_count >= maxRenewals) {
      return res.status(400).json({
        success: false,
        message: `Maximum renewal limit (${maxRenewals}) reached for this book loan.`
      });
    }

    // Check if any reservation waiting queue exists for this book!
    const pendingReservations = await Reservation.count({
      where: {
        book_id: issue.book_id,
        status: ['waiting', 'notified']
      }
    });

    if (pendingReservations > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot renew book: Another reader has placed a reservation on this title.'
      });
    }

    // Phase 7: Renewal extends due date by 7 days
    const currentDue = new Date(issue.due_date);
    const newDueDate = new Date(Math.max(Date.now(), currentDue.getTime()) + 7 * 24 * 60 * 60 * 1000);

    const newRenewalCount = (issue.renewal_count || 0) + 1;
    await issue.update({
      due_date: newDueDate,
      renewal_count: newRenewalCount
    });

    await Notification.create({
      user_id: issue.user_id,
      title: 'Book Renewal Approved',
      message: `Your loan for "${issue.book.title}" was extended until ${newDueDate.toLocaleDateString()} (Renewal ${issue.renewal_count + 1}/${rules.max_renewals}).`,
      type: 'issue'
    });

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'BOOK_RENEWED',
      entityType: 'BookIssue',
      entityId: issue.id,
      details: `Renewed "${issue.book.title}" for ${issue.user.name}. New Due Date: ${newDueDate.toLocaleDateString()}`,
      ip: req.ip
    });

    return res.json({
      success: true,
      message: `Loan renewed successfully until ${newDueDate.toLocaleDateString()}.`,
      issue
    });
  } catch (error) {
    console.error('renewBook error:', error);
    return res.status(500).json({ success: false, message: 'Failed to renew book: ' + error.message });
  }
};

exports.getActiveLoans = async (req, res) => {
  try {
    const { user_id, overdue } = req.query;
    const where = {
      status: ['issued', 'overdue']
    };

    // If student/teacher role, constrain to own loans
    if (req.user.role === 'student' || req.user.role === 'teacher') {
      where.user_id = req.user.id;
    } else if (user_id) {
      where.user_id = user_id;
    }

    if (overdue === 'true') {
      where.due_date = { [Op.lt]: new Date() };
    }

    const issues = await BookIssue.findAll({
      where,
      include: [
        { model: Book, as: 'book' },
        { model: BookCopy, as: 'copy' },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }
      ],
      order: [['due_date', 'ASC']]
    });

    return res.json({ success: true, issues });
  } catch (error) {
    console.error('getActiveLoans error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve active loans.' });
  }
};

exports.getLoanHistory = async (req, res) => {
  try {
    const { user_id } = req.query;
    const where = {};

    if (req.user.role === 'student' || req.user.role === 'teacher') {
      where.user_id = req.user.id;
    } else if (user_id) {
      where.user_id = user_id;
    }

    const history = await BookIssue.findAll({
      where,
      include: [
        { model: Book, as: 'book' },
        { model: BookCopy, as: 'copy' },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] },
        { model: BookReturn, as: 'return_record' }
      ],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    return res.json({ success: true, history });
  } catch (error) {
    console.error('getLoanHistory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve loan history.' });
  }
};

// Phase 2: Rapid Scanner Resolution for Patrons (QR Code / Barcode)
exports.scanPatron = async (req, res) => {
  try {
    let { identifier } = req.params;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Identifier is required.' });
    }

    identifier = decodeURIComponent(identifier).trim();

    // Check if identifier is stringified JSON from student QR card
    if (identifier.startsWith('{') && identifier.endsWith('}')) {
      try {
        const parsed = JSON.parse(identifier);
        identifier = parsed.barcode || parsed.roll || parsed.id || identifier;
      } catch (e) {
        // Not valid JSON, keep as raw identifier
      }
    }

    let user = null;

    // Search by student profile: barcode_id, roll_number, admission_number, student_id
    const profile = await StudentProfile.findOne({
      where: {
        [Op.or]: [
          { barcode_id: identifier },
          { roll_number: identifier },
          { admission_number: identifier },
          { student_id: identifier }
        ]
      },
      include: [{ model: User, as: 'user' }]
    });

    if (profile && profile.user) {
      user = profile.user;
    } else {
      // Fallback search by ID or Email
      if (/^\d+$/.test(identifier)) {
        user = await User.findByPk(parseInt(identifier), {
          include: [{ model: StudentProfile, as: 'student_profile' }]
        });
      }
      if (!user) {
        user = await User.findOne({
          where: { email: identifier },
          include: [{ model: StudentProfile, as: 'student_profile' }]
        });
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `No patron found matching QR / Barcode "${identifier}".`
      });
    }

    // Get active loans
    const activeLoans = await BookIssue.findAll({
      where: { user_id: user.id, status: ['issued', 'overdue'] },
      include: [
        { model: Book, as: 'book' },
        { model: BookCopy, as: 'copy' }
      ],
      order: [['due_date', 'ASC']]
    });

    const now = new Date();
    const overdueCount = activeLoans.filter(l => new Date(l.due_date) < now).length;

    // Sum pending fines
    const pendingFines = (await Fine.sum('amount', {
      where: { user_id: user.id, status: 'pending' }
    })) || 0;

    const rules = await getRules();
    const maxLimit = user.role === 'teacher' ? rules.teacher_max_books : rules.student_max_books;
    const canBorrow = user.status === 'active' && activeLoans.length < maxLimit && pendingFines <= 100;

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        profile_picture: user.profile_picture,
        student_profile: user.student_profile || profile
      },
      activeLoans,
      activeLoansCount: activeLoans.length,
      overdueCount,
      pendingFines,
      maxLimit,
      canBorrow,
      borrowLimitRemaining: Math.max(0, maxLimit - activeLoans.length)
    });
  } catch (error) {
    console.error('scanPatron error:', error);
    return res.status(500).json({ success: false, message: 'Failed to scan patron: ' + error.message });
  }
};

// Phase 2: Rapid Scanner Resolution for Books (QR Code / Copy Barcode / ISBN)
exports.scanBook = async (req, res) => {
  try {
    let { identifier } = req.params;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Identifier is required.' });
    }

    identifier = decodeURIComponent(identifier).trim();

    // Check if identifier is stringified JSON
    if (identifier.startsWith('{') && identifier.endsWith('}')) {
      try {
        const parsed = JSON.parse(identifier);
        identifier = parsed.barcode || parsed.isbn || parsed.id || identifier;
      } catch (e) {
        // Keep as raw identifier
      }
    }

    // Try finding by physical copy barcode first
    let copy = await BookCopy.findOne({
      where: { barcode: identifier },
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

    let book = null;
    if (copy) {
      book = copy.book;
    } else {
      // Try finding book by ISBN or ID
      if (/^\d+$/.test(identifier)) {
        book = await Book.findByPk(parseInt(identifier), {
          include: [
            { model: Category, as: 'category' },
            { model: Author, as: 'author' },
            { model: BookCopy, as: 'copies' }
          ]
        });
      }
      if (!book) {
        book = await Book.findOne({
          where: { isbn: identifier },
          include: [
            { model: Category, as: 'category' },
            { model: Author, as: 'author' },
            { model: BookCopy, as: 'copies' }
          ]
        });
      }
      if (book && book.copies && book.copies.length > 0) {
        // Pick first available copy or first copy
        copy = book.copies.find(c => c.status === 'available') || book.copies[0];
      }
    }

    if (!book) {
      return res.status(404).json({
        success: false,
        message: `No book copy or title found matching barcode/ISBN "${identifier}".`
      });
    }

    // Check if there is an active loan on this copy
    let activeIssue = null;
    let overdueDays = 0;
    let fineEstimate = 0;
    if (copy) {
      activeIssue = await BookIssue.findOne({
        where: { copy_id: copy.id, status: ['issued', 'overdue'] },
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }]
      });

      if (activeIssue) {
        const now = new Date();
        const due = new Date(activeIssue.due_date);
        if (now > due) {
          const diffTime = Math.abs(now - due);
          overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const rules = await getRules();
          fineEstimate = overdueDays * (rules.fine_per_day || 5);
        }
      }
    }

    // Check reservation queue count
    const reservationCount = await Reservation.count({
      where: { book_id: book.id, status: ['Pending', 'Approved', 'waiting'] }
    });

    return res.json({
      success: true,
      book,
      copy,
      isIssued: !!activeIssue,
      activeIssue,
      overdueDays,
      fineEstimate,
      reservationCount,
      canIssue: copy ? copy.status === 'available' : book.available_copies > 0
    });
  } catch (error) {
    console.error('scanBook error:', error);
    return res.status(500).json({ success: false, message: 'Failed to scan book: ' + error.message });
  }
};
