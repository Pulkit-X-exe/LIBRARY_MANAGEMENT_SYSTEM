const { Op } = require('sequelize');
const { 
  BookIssue, BookReturn, Book, BookCopy, User, StudentProfile, 
  TeacherProfile, Fine, Category 
} = require('../models');

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
