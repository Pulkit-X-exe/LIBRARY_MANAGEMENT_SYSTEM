const { Fine, FinePayment, BookIssue, Book, User, Notification } = require('../models');
const { logActivity } = require('../middleware/logger');

exports.getFines = async (req, res) => {
  try {
    const { status, user_id } = req.query;
    const where = {};

    if (req.user.role === 'student' || req.user.role === 'teacher') {
      where.user_id = req.user.id;
    } else if (user_id) {
      where.user_id = user_id;
    }

    if (status) {
      where.status = status;
    }

    const fines = await Fine.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] },
        { 
          model: BookIssue, 
          as: 'issue',
          include: [{ model: Book, as: 'book', attributes: ['id', 'title', 'isbn'] }]
        },
        { model: FinePayment, as: 'payments' },
        { model: User, as: 'waiver_officer', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const totalPending = fines
      .filter(f => f.status === 'pending')
      .reduce((sum, f) => sum + f.amount, 0);

    return res.json({
      success: true,
      fines,
      totalPending
    });
  } catch (error) {
    console.error('getFines error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve fines.' });
  }
};

exports.payFine = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method = 'online', transaction_ref } = req.body;

    const fine = await Fine.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!fine) {
      return res.status(404).json({ success: false, message: 'Fine record not found.' });
    }

    if (fine.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Fine has already been paid.' });
    }

    const txRef = transaction_ref || `PAY-${Date.now().toString().slice(-8)}`;

    await fine.update({
      status: 'paid',
      paid_at: new Date()
    });

    const payment = await FinePayment.create({
      fine_id: fine.id,
      amount_paid: fine.amount,
      payment_method,
      transaction_reference: txRef,
      paid_at: new Date()
    });

    await Notification.create({
      user_id: fine.user_id,
      title: 'Fine Payment Receipt',
      message: `Payment of ₹${fine.amount} for fine #${fine.id} confirmed. Reference: ${txRef}`,
      type: 'fine'
    });

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'FINE_PAID',
      entityType: 'Fine',
      entityId: fine.id,
      details: `Paid ₹${fine.amount} via ${payment_method} (Ref: ${txRef}) for user ${fine.user.name}`,
      ip: req.ip
    });

    return res.json({
      success: true,
      message: `Fine of ₹${fine.amount} paid successfully.`,
      payment
    });
  } catch (error) {
    console.error('payFine error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process payment.' });
  }
};

exports.waiveFine = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Waiver justification reason is required.' });
    }

    const fine = await Fine.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!fine) {
      return res.status(404).json({ success: false, message: 'Fine record not found.' });
    }

    if (fine.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot waive fine with status "${fine.status}".` });
    }

    await fine.update({
      status: 'waived',
      waived_by_id: req.user.id,
      waiver_reason: reason
    });

    await Notification.create({
      user_id: fine.user_id,
      title: 'Library Fine Waived',
      message: `Your fine of ₹${fine.amount} was waived by library administration. Reason: ${reason}`,
      type: 'fine'
    });

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'FINE_WAIVED',
      entityType: 'Fine',
      entityId: fine.id,
      details: `Waived ₹${fine.amount} for ${fine.user.name}. Reason: ${reason}`,
      ip: req.ip
    });

    return res.json({
      success: true,
      message: 'Fine successfully waived.',
      fine
    });
  } catch (error) {
    console.error('waiveFine error:', error);
    return res.status(500).json({ success: false, message: 'Failed to waive fine.' });
  }
};
