const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const { 
  BookIssue, BookReturn, Book, BookCopy, User, StudentProfile, 
  TeacherProfile, Fine, Category, Author, Publisher 
} = require('../models');

// Phase 13: Inventory Intelligence Dashboard
exports.getInventoryIntelligence = async (req, res) => {
  try {
    const totalTitles = await Book.count();
    const totalCopies = await BookCopy.count();
    const availableCopies = await BookCopy.count({ where: { status: 'available' } });
    const issuedCopies = await BookCopy.count({ where: { status: 'issued' } });
    const reservedCopies = await BookCopy.count({ where: { status: 'reserved' } });
    const lostCopies = await BookCopy.count({ where: { status: 'lost' } });
    const damagedCopies = await BookCopy.count({ where: { status: 'damaged' } });

    const now = new Date();
    const overdueLoans = await BookIssue.findAll({
      where: {
        status: ['issued', 'overdue'],
        due_date: { [Op.lt]: now }
      },
      include: [
        { model: Book, as: 'book' },
        { model: BookCopy, as: 'copy' },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
      ]
    });

    // Low stock books (available_copies <= 1 and total_copies > 0)
    const lowStockBooks = await Book.findAll({
      where: {
        available_copies: { [Op.lte]: 1 }
      },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      limit: 25
    });

    // Never borrowed books
    const neverBorrowedBooks = await Book.findAll({
      where: {
        [Op.or]: [
          { borrow_count: 0 },
          { borrow_count: null }
        ]
      },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      limit: 25
    });

    const neverBorrowedCount = await Book.count({
      where: {
        [Op.or]: [
          { borrow_count: 0 },
          { borrow_count: null }
        ]
      }
    });

    // Generate intelligent alerts
    const alerts = [];
    if (overdueLoans.length > 0) {
      alerts.push({
        id: 'overdue-alert',
        severity: 'high',
        message: `${overdueLoans.length} books are currently overdue and require follow-up reminders.`,
        action: '/librarian/defaulters'
      });
    }

    if (lowStockBooks.length > 0) {
      alerts.push({
        id: 'low-stock-alert',
        severity: 'medium',
        message: `${lowStockBooks.length} titles have low availability (1 or 0 copies remaining on shelves).`,
        action: '/librarian/books'
      });
    }

    if (neverBorrowedCount > 0) {
      alerts.push({
        id: 'never-borrowed-alert',
        severity: 'low',
        message: `${neverBorrowedCount} catalog titles have never been borrowed. Consider featuring them in student discovery.`,
        action: '/librarian/books'
      });
    }

    if (damagedCopies > 0 || lostCopies > 0) {
      alerts.push({
        id: 'damage-lost-alert',
        severity: 'medium',
        message: `${damagedCopies} copies marked damaged and ${lostCopies} copies marked lost require physical audit or replacement.`,
        action: '/librarian/inventory-health'
      });
    }

    return res.json({
      success: true,
      summary: {
        totalTitles,
        totalCopies,
        availableCopies,
        issuedCopies,
        reservedCopies,
        lostCopies,
        damagedCopies,
        overdueCount: overdueLoans.length,
        lowStockCount: lowStockBooks.length,
        neverBorrowedCount
      },
      alerts,
      lowStockBooks,
      overdueLoans,
      neverBorrowedBooks
    });
  } catch (error) {
    console.error('getInventoryIntelligence error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve inventory intelligence: ' + error.message });
  }
};

exports.getCirculationReport = async (req, res) => {
  try {
    const { startDate, endDate, type = 'issues' } = req.query;
    const dateField = type === 'returns' ? 'return_date' : 'issue_date';
    const where = {};

    if (startDate && endDate) {
      where[dateField] = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    if (type === 'returns') {
      where.status = 'returned';
    }

    const records = await BookIssue.findAll({
      where,
      include: [
        { model: Book, as: 'book', attributes: ['id', 'title', 'isbn'] },
        { model: BookCopy, as: 'copy', attributes: ['id', 'barcode'] },
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'name', 'email', 'role'],
          include: [{ model: StudentProfile, as: 'student_profile' }]
        },
        { model: BookReturn, as: 'return_record' }
      ],
      order: [[dateField, 'DESC']]
    });

    return res.json({ success: true, count: records.length, records });
  } catch (error) {
    console.error('getCirculationReport error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate circulation report.' });
  }
};

exports.getOverdueReport = async (req, res) => {
  try {
    const now = new Date();
    const overdues = await BookIssue.findAll({
      where: {
        status: ['issued', 'overdue'],
        due_date: { [Op.lt]: now }
      },
      include: [
        { model: Book, as: 'book' },
        { model: BookCopy, as: 'copy' },
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'name', 'email', 'phone', 'role'],
          include: [{ model: StudentProfile, as: 'student_profile' }]
        }
      ],
      order: [['due_date', 'ASC']]
    });

    return res.json({ success: true, count: overdues.length, records: overdues });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to generate overdue report.' });
  }
};

exports.getFineReport = async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const fines = await Fine.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] },
        { 
          model: BookIssue, 
          as: 'issue',
          include: [{ model: Book, as: 'book', attributes: ['id', 'title'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const summary = {
      totalCollected: fines.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0),
      totalPending: fines.filter(f => f.status === 'pending').reduce((s, f) => s + f.amount, 0),
      totalWaived: fines.filter(f => f.status === 'waived').reduce((s, f) => s + f.amount, 0)
    };

    return res.json({ success: true, count: fines.length, summary, records: fines });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to generate fine report.' });
  }
};

exports.getInventoryReport = async (req, res) => {
  try {
    const copies = await BookCopy.findAll({
      include: [
        { 
          model: Book, 
          as: 'book',
          include: [{ model: Category, as: 'category' }]
        }
      ],
      order: [['status', 'ASC'], ['barcode', 'ASC']]
    });

    const breakdown = {
      available: copies.filter(c => c.status === 'available').length,
      issued: copies.filter(c => c.status === 'issued').length,
      reserved: copies.filter(c => c.status === 'reserved').length,
      lost: copies.filter(c => c.status === 'lost').length,
      damaged: copies.filter(c => c.status === 'damaged').length,
      under_repair: copies.filter(c => c.status === 'under_repair').length
    };

    return res.json({ success: true, totalCopies: copies.length, breakdown, records: copies });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to generate inventory report.' });
  }
};

// Phase 16: PDF Report Generator (Using PDFKit with Real Database Data)
exports.downloadPdfReport = async (req, res) => {
  try {
    const { type } = req.params; // 'inventory', 'circulation', 'overdue', 'fines'
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="library-report-${type}-${Date.now()}.pdf"`);
    doc.pipe(res);

    // School Header
    doc.rect(40, 40, doc.page.width - 80, 50).fill('#1e1b4b');
    doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text('ADARSH SENIOR SECONDARY SCHOOL', 50, 48);
    doc.fontSize(9).font('Helvetica').text('Garhi Bazidpur, Gurugram, Haryana • Central Library Management System', 50, 65);
    doc.fillColor('#334155').fontSize(8).text(`Generated: ${new Date().toLocaleString()} | Type: ${type.toUpperCase()}`, 50, 95);

    doc.moveDown(2);
    let y = 120;

    if (type === 'inventory') {
      doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Physical Book Inventory Report', 40, y);
      y += 20;

      const books = await Book.findAll({
        include: [
          { model: Category, as: 'category' },
          { model: Author, as: 'author' }
        ],
        limit: 40
      });

      // Table Header
      doc.rect(40, y, doc.page.width - 80, 18).fill('#e2e8f0');
      doc.fillColor('#1e293b').fontSize(8).font('Helvetica-Bold');
      doc.text('ISBN', 45, y + 5, { width: 90 });
      doc.text('TITLE', 140, y + 5, { width: 180 });
      doc.text('CATEGORY', 325, y + 5, { width: 90 });
      doc.text('TOTAL', 420, y + 5, { width: 40 });
      doc.text('AVAIL', 465, y + 5, { width: 40 });
      y += 20;

      books.forEach((b, i) => {
        if (y > 760) {
          doc.addPage();
          y = 50;
        }
        if (i % 2 === 1) doc.rect(40, y - 2, doc.page.width - 80, 15).fill('#f8fafc');
        doc.fillColor('#334155').fontSize(7.5).font('Helvetica');
        doc.text(b.isbn || '—', 45, y, { width: 90 });
        doc.text((b.title || '').slice(0, 36), 140, y, { width: 180 });
        doc.text(b.category?.name || 'General', 325, y, { width: 90 });
        doc.text(String(b.total_copies), 420, y, { width: 40 });
        doc.text(String(b.available_copies), 465, y, { width: 40 });
        y += 15;
      });

    } else if (type === 'overdue') {
      doc.fillColor('#b91c1c').fontSize(12).font('Helvetica-Bold').text('Overdue Books & Defaulters Audit', 40, y);
      y += 20;

      const overdues = await BookIssue.findAll({
        where: { status: ['issued', 'overdue'], due_date: { [Op.lt]: new Date() } },
        include: [
          { model: Book, as: 'book' },
          { model: BookCopy, as: 'copy' },
          { model: User, as: 'user', include: [{ model: StudentProfile, as: 'student_profile' }] }
        ],
        limit: 40
      });

      doc.rect(40, y, doc.page.width - 80, 18).fill('#fee2e2');
      doc.fillColor('#991b1b').fontSize(8).font('Helvetica-Bold');
      doc.text('BORROWER', 45, y + 5, { width: 110 });
      doc.text('CLASS', 160, y + 5, { width: 50 });
      doc.text('BOOK TITLE', 215, y + 5, { width: 170 });
      doc.text('DUE DATE', 390, y + 5, { width: 65 });
      doc.text('OVERDUE', 460, y + 5, { width: 50 });
      y += 20;

      overdues.forEach((o, i) => {
        if (y > 760) {
          doc.addPage();
          y = 50;
        }
        const overdueDays = Math.max(1, Math.ceil((new Date() - new Date(o.due_date)) / 86400000));
        if (i % 2 === 1) doc.rect(40, y - 2, doc.page.width - 80, 15).fill('#fff1f2');
        doc.fillColor('#334155').fontSize(7.5).font('Helvetica');
        doc.text(o.user?.name || 'Patron', 45, y, { width: 110 });
        doc.text(o.user?.student_profile?.class_name || '10th', 160, y, { width: 50 });
        doc.text((o.book?.title || '').slice(0, 32), 215, y, { width: 170 });
        doc.text(new Date(o.due_date).toLocaleDateString(), 390, y, { width: 65 });
        doc.fillColor('#b91c1c').text(`${overdueDays} days`, 460, y, { width: 50 });
        y += 15;
      });

    } else if (type === 'fines') {
      doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Overdue Fine Collections Report', 40, y);
      y += 20;

      const fines = await Fine.findAll({
        include: [
          { model: User, as: 'user' },
          { model: BookIssue, as: 'issue', include: [{ model: Book, as: 'book' }] }
        ],
        limit: 40
      });

      doc.rect(40, y, doc.page.width - 80, 18).fill('#e2e8f0');
      doc.fillColor('#1e293b').fontSize(8).font('Helvetica-Bold');
      doc.text('PATRON', 45, y + 5, { width: 120 });
      doc.text('BOOK TITLE', 170, y + 5, { width: 180 });
      doc.text('AMOUNT', 360, y + 5, { width: 60 });
      doc.text('STATUS', 430, y + 5, { width: 75 });
      y += 20;

      fines.forEach((f, i) => {
        if (y > 760) {
          doc.addPage();
          y = 50;
        }
        if (i % 2 === 1) doc.rect(40, y - 2, doc.page.width - 80, 15).fill('#f8fafc');
        doc.fillColor('#334155').fontSize(7.5).font('Helvetica');
        doc.text(f.user?.name || 'Patron', 45, y, { width: 120 });
        doc.text((f.issue?.book?.title || 'Book loan').slice(0, 34), 170, y, { width: 180 });
        doc.text(`Rs. ${f.amount}`, 360, y, { width: 60 });
        doc.text((f.status || 'pending').toUpperCase(), 430, y, { width: 75 });
        y += 15;
      });

    } else {
      // Default: Active Circulation Loans
      doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Active Circulation Records', 40, y);
      y += 20;

      const loans = await BookIssue.findAll({
        where: { status: 'issued' },
        include: [
          { model: Book, as: 'book' },
          { model: BookCopy, as: 'copy' },
          { model: User, as: 'user' }
        ],
        limit: 40
      });

      doc.rect(40, y, doc.page.width - 80, 18).fill('#e2e8f0');
      doc.fillColor('#1e293b').fontSize(8).font('Helvetica-Bold');
      doc.text('BARCODE', 45, y + 5, { width: 85 });
      doc.text('BOOK TITLE', 135, y + 5, { width: 180 });
      doc.text('BORROWER', 320, y + 5, { width: 100 });
      doc.text('DUE DATE', 425, y + 5, { width: 75 });
      y += 20;

      loans.forEach((l, i) => {
        if (y > 760) {
          doc.addPage();
          y = 50;
        }
        if (i % 2 === 1) doc.rect(40, y - 2, doc.page.width - 80, 15).fill('#f8fafc');
        doc.fillColor('#334155').fontSize(7.5).font('Helvetica');
        doc.text(l.copy?.barcode || '—', 45, y, { width: 85 });
        doc.text((l.book?.title || '').slice(0, 34), 135, y, { width: 180 });
        doc.text(l.user?.name || 'Patron', 320, y, { width: 100 });
        doc.text(new Date(l.due_date).toLocaleDateString(), 425, y, { width: 75 });
        y += 15;
      });
    }

    doc.end();
  } catch (error) {
    console.error('downloadPdfReport error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Failed to generate PDF report: ' + error.message });
    }
  }
};
