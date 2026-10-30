const { Op } = require('sequelize');
const { Reservation, Book, BookCopy, BookIssue, User, StudentProfile, Notification, Category, Author } = require('../models');
const { logActivity } = require('../middleware/logger');

/**
 * Helper: Recalculate Book stock accurately from actual database records
 * Guaranteed: Total = Available + Issued + Reserved
 */
const recalculateBookStock = async (bookId) => {
  const book = await Book.findByPk(bookId);
  if (!book) return null;

  const activeIssued = await BookIssue.count({
    where: { book_id: bookId, status: 'issued' }
  });

  const activeReserved = await Reservation.count({
    where: {
      book_id: bookId,
      status: ['Approved', 'Ready for Pickup']
    }
  });

  const available = Math.max(0, book.total_copies - activeIssued - activeReserved);

  await book.update({
    available_copies: available,
    issued_copies: activeIssued,
    reserved_copies: activeReserved
  });

  return { book, available, activeIssued, activeReserved };
};

/**
 * Auto-expire overdue 2-day reservations and return held copy to stock
 */
const autoExpireReservations = async () => {
  try {
    const now = new Date();
    const expiredReservations = await Reservation.findAll({
      where: {
        status: ['Approved', 'Ready for Pickup'],
        reservation_expiry: { [Op.lt]: now }
      },
      include: [{ model: Book, as: 'book' }]
    });

    for (const res of expiredReservations) {
      await res.update({ status: 'Expired' });
      await recalculateBookStock(res.book_id);

      await Notification.create({
        user_id: res.user_id,
        title: 'Reservation Expired',
        message: `Your 2-day reservation for "${res.book ? res.book.title : 'requested book'}" expired and the copy has been returned to the library shelf.`,
        type: 'reservation_expired'
      });
    }
  } catch (err) {
    console.error('Error during autoExpireReservations:', err);
  }
};

/**
 * 1. Student Submits a Book Reservation Request
 * Strictly creates a 'Pending' request. DOES NOT directly issue the book.
 */
exports.reserveBook = async (req, res) => {
  try {
    await autoExpireReservations();

    const { book_id, notes } = req.body;
    const userId = req.user.id;

    if (!book_id) {
      return res.status(400).json({ success: false, message: 'Book ID is required.' });
    }

    const book = await Book.findByPk(book_id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found in library catalogue.' });
    }

    // Check if user already has an active reservation for this book
    const existing = await Reservation.findOne({
      where: {
        book_id,
        user_id: userId,
        status: ['Pending', 'Approved', 'Ready for Pickup']
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `You already have an active request for "${book.title}" (Status: ${existing.status}).`
      });
    }

    // Check active reservation limit per student (Max 3 active)
    const activeCount = await Reservation.count({
      where: {
        user_id: userId,
        status: ['Pending', 'Approved', 'Ready for Pickup']
      }
    });

    if (activeCount >= 3) {
      return res.status(400).json({
        success: false,
        message: 'You have reached the maximum limit of 3 active book requests. Please wait for an existing reservation to be fulfilled or cancel one.'
      });
    }

    // Check availability
    if (book.available_copies <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This book currently has 0 available physical copies. Please add it to your wishlist to receive updates.'
      });
    }

    const reservation = await Reservation.create({
      book_id,
      user_id: userId,
      status: 'Pending',
      requested_at: new Date(),
      notes: notes || 'Student reservation requested online'
    });

    await Notification.create({
      user_id: userId,
      title: 'Book Request Submitted',
      message: `Your reservation request for "${book.title}" was submitted to the Adarsh Senior Secondary School Library. Awaiting librarian approval.`,
      type: 'reservation_placed'
    });

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'BOOK_RESERVATION_REQUESTED',
      entityType: 'Reservation',
      entityId: reservation.id,
      details: `Submitted request for "${book.title}" by ${req.user.name}`,
      ip: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Reservation request submitted successfully. The librarian will review your request.',
      reservation
    });
  } catch (error) {
    console.error('reserveBook error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit reservation request.' });
  }
};

/**
 * 2. Get Reservations (Student sees their own; Librarian sees all)
 */
exports.getReservations = async (req, res) => {
  try {
    await autoExpireReservations();

    const where = {};
    if (req.user.role === 'student') {
      where.user_id = req.user.id;
    }

    if (req.query.status) {
      where.status = req.query.status;
    }

    const reservations = await Reservation.findAll({
      where,
      include: [
        {
          model: Book,
          as: 'book',
          include: [
            { model: Category, as: 'category' },
            { model: Author, as: 'author' }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role', 'phone'],
          include: [{ model: StudentProfile, as: 'student_profile' }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.json({ success: true, reservations });
  } catch (error) {
    console.error('getReservations error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve book requests.' });
  }
};

/**
 * 3. Librarian Approves Reservation
 * Allocates reserved stock and starts 2-day collection window
 */
exports.approveReservation = async (req, res) => {
  try {
    await autoExpireReservations();

    const { id } = req.params;
    const reservation = await Reservation.findByPk(id, {
      include: [{ model: Book, as: 'book' }, { model: User, as: 'user' }]
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation request not found.' });
    }

    if (reservation.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve request with status "${reservation.status}".`
      });
    }

    const book = reservation.book;
    if (!book || book.available_copies <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No available copies left in library stock to approve this reservation.'
      });
    }

    const start = new Date();
    const expiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days

    await reservation.update({
      status: 'Approved',
      reservation_start: start,
      reservation_expiry: expiry
    });

    // Recalculate book stock
    await recalculateBookStock(book.id);

    await Notification.create({
      user_id: reservation.user_id,
      title: 'Reservation Approved',
      message: `Your reservation for "${book.title}" is approved! Please collect it from the school library within 2 days (by ${expiry.toLocaleDateString()}).`,
      type: 'reservation_approved'
    });

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'RESERVATION_APPROVED',
      entityType: 'Reservation',
      entityId: reservation.id,
      details: `Approved reservation for "${book.title}" for student ${reservation.user?.name}`,
      ip: req.ip
    });

    return res.json({
      success: true,
      message: `Reservation approved! Held for 2 days until ${expiry.toLocaleDateString()}.`,
      reservation
    });
  } catch (error) {
    console.error('approveReservation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve reservation.' });
  }
};

/**
 * 4. Librarian Marks Book Ready For Pickup
 */
exports.markReady = async (req, res) => {
  try {
    const { id } = req.params;
    const reservation = await Reservation.findByPk(id, {
      include: [{ model: Book, as: 'book' }, { model: User, as: 'user' }]
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found.' });
    }

    if (reservation.status !== 'Approved') {
      return res.status(400).json({
        success: false,
        message: `Only Approved requests can be marked ready. Current status: ${reservation.status}`
      });
    }

    await reservation.update({ status: 'Ready for Pickup' });

    await Notification.create({
      user_id: reservation.user_id,
      title: 'Book Ready for Pickup',
      message: `Your reserved book "${reservation.book?.title}" is ready at the library counter (${reservation.book?.shelf_number || 'Shelf 1'}, ${reservation.book?.rack_number || 'Rack A'}). Please collect it before expiry.`,
      type: 'reservation_ready'
    });

    return res.json({
      success: true,
      message: 'Book marked as Ready for Pickup. Student notified.',
      reservation
    });
  } catch (error) {
    console.error('markReady error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark ready.' });
  }
};

/**
 * 5. Librarian Marks Collected and Officially Issues the Book
 * Physical issue is strictly done by Librarian / Admin
 */
exports.markCollected = async (req, res) => {
  try {
    const { id } = req.params;
    const reservation = await Reservation.findByPk(id, {
      include: [{ model: Book, as: 'book' }, { model: User, as: 'user' }]
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation record not found.' });
    }

    if (!['Approved', 'Ready for Pickup'].includes(reservation.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot issue reservation in "${reservation.status}" status.`
      });
    }

    const book = reservation.book;

    // Find an available physical copy of this book
    let copy = await BookCopy.findOne({
      where: { book_id: book.id, status: 'available' }
    });

    if (!copy) {
      // Find any copy not currently issued
      copy = await BookCopy.findOne({
        where: { book_id: book.id, status: { [Op.ne]: 'issued' } }
      });
    }

    // Default 14-day borrowing duration for school students
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    if (copy) {
      await copy.update({ status: 'issued' });
    }

    // Create official BookIssue loan record
    const issue = await BookIssue.create({
      book_id: book.id,
      copy_id: copy ? copy.id : null,
      user_id: reservation.user_id,
      issued_by_id: req.user.id,
      issue_date: new Date(),
      due_date: dueDate,
      status: 'issued',
      renewal_count: 0
    });

    // Mark reservation fulfilled/collected
    await reservation.update({ status: 'Collected' });

    // Recalculate book stock and increment borrow count
    await recalculateBookStock(book.id);
    await book.update({ borrow_count: (book.borrow_count || 0) + 1 });

    await Notification.create({
      user_id: reservation.user_id,
      title: 'Book Collected & Issued',
      message: `You have successfully collected "${book.title}". Please return it by ${dueDate.toLocaleDateString()} (14 days loan).`,
      type: 'book_issued'
    });

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'BOOK_ISSUED_FROM_RESERVATION',
      entityType: 'BookIssue',
      entityId: issue.id,
      details: `Issued "${book.title}" to student ${reservation.user?.name}`,
      ip: req.ip
    });

    return res.json({
      success: true,
      message: `Book "${book.title}" successfully issued to ${reservation.user?.name}. Due date: ${dueDate.toLocaleDateString()}.`,
      issue,
      reservation
    });
  } catch (error) {
    console.error('markCollected error:', error);
    return res.status(500).json({ success: false, message: 'Failed to issue reserved book.' });
  }
};

/**
 * 6. Librarian Rejects Request
 */
exports.rejectReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const reservation = await Reservation.findByPk(id, {
      include: [{ model: Book, as: 'book' }, { model: User, as: 'user' }]
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found.' });
    }

    const wasReserved = ['Approved', 'Ready for Pickup'].includes(reservation.status);

    await reservation.update({
      status: 'Rejected',
      notes: reason ? `Rejected: ${reason}` : 'Rejected by librarian'
    });

    // Release held copy if it was approved
    if (wasReserved && reservation.book_id) {
      await recalculateBookStock(reservation.book_id);
    }

    await Notification.create({
      user_id: reservation.user_id,
      title: 'Reservation Request Declined',
      message: `Your reservation request for "${reservation.book?.title}" was declined by the librarian.${reason ? ` Reason: ${reason}` : ''}`,
      type: 'reservation_rejected'
    });

    return res.json({
      success: true,
      message: 'Reservation rejected.',
      reservation
    });
  } catch (error) {
    console.error('rejectReservation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject reservation.' });
  }
};

/**
 * 7. Student or Librarian Cancels Request
 */
exports.cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const reservation = await Reservation.findByPk(id, {
      include: [{ model: Book, as: 'book' }]
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation record not found.' });
    }

    if (req.user.role === 'student' && reservation.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    if (['Collected', 'Expired', 'Cancelled', 'Rejected'].includes(reservation.status)) {
      return res.status(400).json({
        success: false,
        message: `Reservation is already ${reservation.status} and cannot be cancelled.`
      });
    }

    const wasReserved = ['Approved', 'Ready for Pickup'].includes(reservation.status);

    await reservation.update({ status: 'Cancelled' });

    if (wasReserved && reservation.book_id) {
      await recalculateBookStock(reservation.book_id);
    }

    return res.json({
      success: true,
      message: 'Reservation cancelled successfully.'
    });
  } catch (error) {
    console.error('cancelReservation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel reservation.' });
  }
};
