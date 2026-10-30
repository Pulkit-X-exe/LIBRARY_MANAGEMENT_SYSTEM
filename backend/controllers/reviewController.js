const { Review, Book, User } = require('../models');
const { logActivity } = require('../middleware/logger');

exports.addReview = async (req, res) => {
  try {
    const { book_id, rating, review_text } = req.body;
    if (!book_id || !rating) {
      return res.status(400).json({ success: false, message: 'Book ID and rating (1-5) are required.' });
    }

    const [review, created] = await Review.findOrCreate({
      where: { book_id, user_id: req.user.id },
      defaults: { rating, review_text, is_moderated: false }
    });

    if (!created) {
      await review.update({ rating, review_text });
    }

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'REVIEW_SUBMITTED',
      entityType: 'Review',
      entityId: review.id,
      details: `Rated book #${book_id} with ${rating} stars`,
      ip: req.ip
    });

    return res.json({
      success: true,
      message: created ? 'Review posted successfully.' : 'Review updated.',
      review
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findByPk(id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    if (req.user.role === 'student' && review.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    await review.destroy();
    return res.json({ success: true, message: 'Review removed.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete review.' });
  }
};
