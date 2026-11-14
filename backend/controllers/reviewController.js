const { Review, Book, User, BookIssue } = require('../models');
const { logActivity } = require('../middleware/logger');

// Phase 10: Book Ratings & Reviews
exports.addReview = async (req, res) => {
  try {
    const { book_id, rating, review_text } = req.body;
    if (!book_id || !rating) {
      return res.status(400).json({ success: false, message: 'Book ID and rating (1-5) are required.' });
    }

    const numRating = parseInt(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
    }

    // Phase 10 Rule: Allow students who have actually borrowed/returned a book to rate it
    if (req.user.role === 'student') {
      const hasBorrowed = await BookIssue.findOne({
        where: {
          user_id: req.user.id,
          book_id: parseInt(book_id)
        }
      });

      if (!hasBorrowed) {
        return res.status(403).json({
          success: false,
          message: 'Only patrons who have actually borrowed this book from the library can submit a review and rating.'
        });
      }
    }

    const [review, created] = await Review.findOrCreate({
      where: { book_id, user_id: req.user.id },
      defaults: { rating: numRating, review_text: review_text || '', is_moderated: false }
    });

    if (!created) {
      await review.update({ rating: numRating, review_text: review_text || '' });
    }

    // Calculate updated book ratings
    const allReviews = await Review.findAll({
      where: { book_id, is_moderated: false }
    });
    const avgRating = allReviews.length > 0
      ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
      : numRating;

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'REVIEW_SUBMITTED',
      entityType: 'Review',
      entityId: review.id,
      details: `Rated book #${book_id} with ${numRating} stars`,
      ip: req.ip
    });

    return res.json({
      success: true,
      message: created ? 'Review posted successfully.' : 'Review updated successfully.',
      review,
      avg_rating: parseFloat(avgRating),
      reviews_count: allReviews.length
    });
  } catch (error) {
    console.error('addReview error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit review: ' + error.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findByPk(id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

    // Students can only delete their own; librarian & admin can delete any
    if (req.user.role === 'student' && review.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    await review.destroy();
    return res.json({ success: true, message: 'Review deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete review.' });
  }
};

// Phase 10: Librarian / Admin Review Moderation
exports.moderateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_moderated } = req.body;

    const review = await Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    await review.update({ is_moderated: is_moderated === true || is_moderated === 'true' });

    return res.json({
      success: true,
      message: `Review ${review.is_moderated ? 'hidden (flagged as inappropriate)' : 'approved and visible'}.`,
      review
    });
  } catch (error) {
    console.error('moderateReview error:', error);
    return res.status(500).json({ success: false, message: 'Failed to moderate review.' });
  }
};

// Get reviews for a specific book
exports.getBookReviews = async (req, res) => {
  try {
    const { bookId } = req.params;
    const where = { book_id: bookId };

    // Unless librarian/admin, only show non-moderated reviews
    if (req.user?.role !== 'admin' && req.user?.role !== 'librarian') {
      where.is_moderated = false;
    }

    const reviews = await Review.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar', 'profile_picture', 'role'] }],
      order: [['createdAt', 'DESC']]
    });

    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    return res.json({
      success: true,
      reviews,
      avg_rating: parseFloat(avgRating),
      reviews_count: reviews.length
    });
  } catch (error) {
    console.error('getBookReviews error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load book reviews.' });
  }
};
