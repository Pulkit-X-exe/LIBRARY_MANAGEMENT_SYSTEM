const { Op } = require('sequelize');
const { 
  BookIssue, Book, BookCopy, BookReturn, User, StudentProfile, 
  Fine, FinePayment, BookIssueReminder, Reservation 
} = require('../models');
const { evaluateIssueCirculation, getKolkataDateString } = require('../services/circulationDateUtils');
const { sendDueReminderEmail, sendOverdueDefaulterEmail, verifySmtpConnection } = require('../services/emailService');
const { runDailyLibraryAudit } = require('../services/scheduler');
const { logActivity } = require('../middleware/logger');

/**
 * 1. GET Currently Issued Books
 * Full active loan register for librarian
 */
exports.getIssuedBooks = async (req, res) => {
  try {
    const { search, status } = req.query;

    const issues = await BookIssue.findAll({
      where: {
        status: { [Op.in]: ['issued', 'overdue'] }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'role'],
          include: [{ model: StudentProfile, as: 'student_profile' }]
        },
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'isbn', 'cover_image']
        },
        {
          model: BookCopy,
          as: 'copy',
          attributes: ['id', 'barcode', 'condition']
        },
        {
          model: BookIssueReminder,
          as: 'reminders',
          limit: 1,
          order: [['createdAt', 'DESC']]
        }
      ],
      order: [['due_date', 'ASC']]
    });

    let mapped = issues.map(item => {
      const sp = item.user?.student_profile || {};
      const evalData = evaluateIssueCirculation(item.due_date, item.status, new Date(), 5);

      return {
        id: item.id,
        user_id: item.user_id,
        student_name: item.user?.name || 'N/A',
        student_id: sp.student_id || sp.barcode_id || `STU${String(item.user_id).padStart(4, '0')}`,
        admission_number: sp.admission_number || '',
        class: (sp.class_name || 'Class 9').replace(/^class\s+/i, ''),
        section: sp.section || 'A',
        roll_number: sp.roll_number || '1',
        email: item.user?.email || '',
        phone: item.user?.phone || '',
        book_id: item.book_id,
        book_title: item.book?.title || 'Unknown Title',
        isbn: item.book?.isbn || '',
        copy_barcode: item.copy?.barcode || '',
        issue_date: item.issue_date,
        due_date: item.due_date,
        days_remaining: evalData.daysRemaining,
        days_remaining_text: evalData.daysRemainingText,
        status: evalData.status,
        is_overdue: evalData.isOverdue,
        fine_amount: evalData.fineAmount,
        last_reminder: item.reminders?.[0] ? item.reminders[0].sent_at : null
      };
    });

    // Apply status filter if provided
    if (status && status !== 'ALL') {
      mapped = mapped.filter(i => i.status.toUpperCase() === status.toUpperCase());
    }

    // Apply search filter if provided
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      mapped = mapped.filter(i => 
        i.student_name.toLowerCase().includes(q) ||
        i.student_id.toLowerCase().includes(q) ||
        i.book_title.toLowerCase().includes(q) ||
        i.isbn.toLowerCase().includes(q) ||
        String(i.roll_number).toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q)
      );
    }

    return res.json({
      success: true,
      total_count: mapped.length,
      issued_books: mapped
    });
  } catch (error) {
    console.error('getIssuedBooks error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve issued books.' });
  }
};

/**
 * 2. GET Defaulters
 * Unreturned loans past due date with accumulated fine
 */
exports.getDefaulters = async (req, res) => {
  try {
    const { filter = 'all', search } = req.query;

    const issues = await BookIssue.findAll({
      where: {
        status: { [Op.in]: ['issued', 'overdue'] }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'role'],
          include: [{ model: StudentProfile, as: 'student_profile' }]
        },
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'isbn', 'cover_image']
        },
        {
          model: BookCopy,
          as: 'copy',
          attributes: ['id', 'barcode', 'condition']
        },
        {
          model: BookIssueReminder,
          as: 'reminders',
          limit: 1,
          order: [['createdAt', 'DESC']]
        }
      ],
      order: [['due_date', 'ASC']]
    });

    // Filter to only overdue loans
    let defaulters = [];
    for (const item of issues) {
      const evalData = evaluateIssueCirculation(item.due_date, item.status, new Date(), 5);
      if (evalData.isOverdue) {
        const sp = item.user?.student_profile || {};
        defaulters.push({
          id: item.id,
          user_id: item.user_id,
          student_name: item.user?.name || 'N/A',
          student_id: sp.student_id || sp.barcode_id || `STU${String(item.user_id).padStart(4, '0')}`,
          class: (sp.class_name || 'Class 9').replace(/^class\s+/i, ''),
          section: sp.section || 'A',
          roll_number: sp.roll_number || '1',
          email: item.user?.email || '',
          phone: item.user?.phone || '',
          book_id: item.book_id,
          book_title: item.book?.title || 'Unknown Title',
          isbn: item.book?.isbn || '',
          copy_barcode: item.copy?.barcode || '',
          issue_date: item.issue_date,
          due_date: item.due_date,
          days_overdue: evalData.daysOverdue,
          fine_per_day: 5,
          total_fine: evalData.fineAmount,
          last_reminder: item.reminders?.[0] ? item.reminders[0].sent_at : null
        });
      }
    }

    // Apply Overdue Range filter (1-3, 4-7, 8+)
    if (filter === '1-3') {
      defaulters = defaulters.filter(d => d.days_overdue >= 1 && d.days_overdue <= 3);
    } else if (filter === '4-7') {
      defaulters = defaulters.filter(d => d.days_overdue >= 4 && d.days_overdue <= 7);
    } else if (filter === '8+') {
      defaulters = defaulters.filter(d => d.days_overdue >= 8);
    }

    // Apply Search
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      defaulters = defaulters.filter(d =>
        d.student_name.toLowerCase().includes(q) ||
        d.student_id.toLowerCase().includes(q) ||
        d.book_title.toLowerCase().includes(q) ||
        d.isbn.toLowerCase().includes(q)
      );
    }

    return res.json({
      success: true,
      total_count: defaulters.length,
      defaulters
    });
  } catch (error) {
    console.error('getDefaulters error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve defaulters list.' });
  }
};

/**
 * 3. Send Manual Reminder Email (Issued Book or Defaulter)
 */
exports.sendManualReminder = async (req, res) => {
  try {
    const { id } = req.params;

    const issue = await BookIssue.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          include: [{ model: StudentProfile, as: 'student_profile' }]
        },
        { model: Book, as: 'book' }
      ]
    });

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Book issue record not found.' });
    }

    if (!issue.user || !issue.user.email) {
      return res.status(400).json({ success: false, message: 'Student does not have a registered email address.' });
    }

    const evalData = evaluateIssueCirculation(issue.due_date, issue.status, new Date(), 5);
    const studentName = issue.user.name;
    const studentEmail = issue.user.email;
    const bookTitle = issue.book?.title || 'Library Resource';
    const bookId = issue.book?.isbn || `BOOK-${issue.book_id}`;

    let mailResult;
    let reminderType;

    if (evalData.isOverdue) {
      reminderType = 'OVERDUE';
      mailResult = await sendOverdueDefaulterEmail({
        studentName,
        studentEmail,
        bookTitle,
        bookId,
        issueDate: issue.issue_date,
        dueDate: issue.due_date,
        daysOverdue: evalData.daysOverdue,
        fineAmount: evalData.fineAmount
      });
    } else {
      reminderType = 'MANUAL_DUE_REMINDER';
      mailResult = await sendDueReminderEmail({
        studentName,
        studentEmail,
        bookTitle,
        bookId,
        issueDate: issue.issue_date,
        dueDate: issue.due_date,
        isTomorrow: evalData.isDueTomorrow
      });
    }

    // Record reminder log in DB
    await BookIssueReminder.create({
      issue_id: issue.id,
      student_id: issue.user_id,
      reminder_type: reminderType,
      recipient_email: studentEmail,
      sent_at: new Date(),
      status: mailResult.success ? 'sent' : 'failed',
      notes: mailResult.simulated ? 'Manual simulated email sent' : 'Manual email dispatched'
    });

    // Audit log
    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'REMINDER_SENT',
      entityType: 'BookIssue',
      entityId: issue.id,
      details: `Sent ${reminderType} reminder to ${studentName} (${studentEmail}) for "${bookTitle}"`,
      ip: req.ip
    });

    if (mailResult.success) {
      return res.json({
        success: true,
        message: mailResult.simulated
          ? `[Simulated Mode] Reminder generated for ${studentName} (${studentEmail}). SMTP is not configured in backend/.env, so the email was logged to the server terminal.`
          : `Reminder email dispatched successfully to ${studentName} (${studentEmail}).`,
        recipient: studentEmail,
        simulated: mailResult.simulated || false
      });
    } else {
      return res.status(500).json({
        success: false,
        message: mailResult.message || 'Unable to send reminder email. Please check server logs.',
        error: mailResult.error
      });
    }
  } catch (error) {
    console.error('sendManualReminder error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to send reminder email'
    });
  }
};

/**
 * 3.1 Check SMTP Configuration Status
 */
exports.getSmtpStatus = async (req, res) => {
  try {
    const status = await verifySmtpConnection();
    return res.json({ success: true, ...status });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Mark Book as Returned
 * Closes active issue, stops fines, removes from Issued Books & Defaulters
 */
exports.markBookReturned = async (req, res) => {
  try {
    const { id } = req.params;
    const { condition = 'good' } = req.body;

    const issue = await BookIssue.findByPk(id, {
      include: [
        { model: Book, as: 'book' },
        { model: BookCopy, as: 'copy' },
        { model: User, as: 'user' }
      ]
    });

    if (!issue || issue.status === 'returned') {
      return res.status(400).json({
        success: false,
        message: 'Active book issue transaction not found or already returned.'
      });
    }

    const returnDate = new Date();
    const evalData = evaluateIssueCirculation(issue.due_date, 'issued', returnDate, 5);

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
      overdue_days: evalData.daysOverdue,
      fine_amount: evalData.fineAmount,
      condition_on_return: condition
    });

    // Update book copy to available
    if (issue.copy) {
      await issue.copy.update({ status: 'available' });
    }

    // Recalculate book stock counts accurately
    if (issue.book) {
      const activeIssued = await BookIssue.count({ where: { book_id: issue.book.id, status: 'issued' } });
      const activeReserved = await Reservation.count({ where: { book_id: issue.book.id, status: ['Approved', 'Ready for Pickup'] } });
      const availCount = Math.max(0, issue.book.total_copies - activeIssued - activeReserved);
      await issue.book.update({
        available_copies: availCount,
        issued_copies: activeIssued,
        reserved_copies: activeReserved
      });
    }

    // Finalize Fine if overdue
    let fineRecord = null;
    if (evalData.fineAmount > 0) {
      fineRecord = await Fine.findOne({ where: { issue_id: issue.id } });
      if (!fineRecord) {
        fineRecord = await Fine.create({
          issue_id: issue.id,
          user_id: issue.user_id,
          amount: evalData.fineAmount,
          fine_type: 'late_return',
          status: 'pending'
        });
      } else if (fineRecord.status === 'pending') {
        await fineRecord.update({ amount: evalData.fineAmount });
      }
    }

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'BOOK_RETURNED',
      entityType: 'BookIssue',
      entityId: issue.id,
      details: `Returned "${issue.book?.title}" from ${issue.user?.name}. Fine: ₹${evalData.fineAmount}`,
      ip: req.ip
    });

    return res.json({
      success: true,
      message: `Book "${issue.book?.title}" successfully marked as returned.`,
      overdue_days: evalData.daysOverdue,
      fine_amount: evalData.fineAmount,
      fine_status: fineRecord ? fineRecord.status : 'None'
    });
  } catch (error) {
    console.error('markBookReturned error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process return: ' + error.message });
  }
};

/**
 * 5. GET Dashboard Library Statistics
 * Real database-driven stats for Librarian Dashboard
 */
exports.getDashboardLibraryStats = async (req, res) => {
  try {
    const activeIssues = await BookIssue.findAll({
      where: {
        status: { [Op.in]: ['issued', 'overdue'] }
      },
      include: [
        { model: Book, as: 'book', attributes: ['title'] },
        { model: User, as: 'user', attributes: ['name', 'email'] }
      ],
      order: [['due_date', 'ASC']]
    });

    let dueTomorrowCount = 0;
    let overdueCount = 0;

    const recentIssues = activeIssues.slice(0, 6).map(item => {
      const evalData = evaluateIssueCirculation(item.due_date, item.status, new Date(), 5);
      if (evalData.isDueTomorrow) dueTomorrowCount++;
      if (evalData.isOverdue) overdueCount++;

      return {
        id: item.id,
        student_name: item.user?.name || 'Student',
        book_title: item.book?.title || 'Book',
        issue_date: item.issue_date,
        due_date: item.due_date,
        status: evalData.status,
        days_remaining_text: evalData.daysRemainingText
      };
    });

    // Check all active issues for accurate counts
    for (const item of activeIssues) {
      const evalData = evaluateIssueCirculation(item.due_date, item.status, new Date(), 5);
      if (evalData.isDueTomorrow) dueTomorrowCount++;
      if (evalData.isOverdue) overdueCount++;
    }

    const pendingFinesSum = await Fine.sum('amount', {
      where: { status: 'pending' }
    }) || 0;

    return res.json({
      success: true,
      stats: {
        currently_issued: activeIssues.length,
        due_tomorrow: dueTomorrowCount,
        overdue: overdueCount,
        pending_fine: pendingFinesSum
      },
      recent_issued_books: recentIssues
    });
  } catch (error) {
    console.error('getDashboardLibraryStats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve dashboard statistics.' });
  }
};

/**
 * 6. Trigger Audit Manually (Librarian/Admin)
 */
exports.triggerAudit = async (req, res) => {
  try {
    const result = await runDailyLibraryAudit();
    return res.json({
      success: true,
      message: 'Automated library circulation and reminder audit triggered successfully.',
      result
    });
  } catch (error) {
    console.error('triggerAudit error:', error);
    return res.status(500).json({ success: false, message: 'Audit failed: ' + error.message });
  }
};
