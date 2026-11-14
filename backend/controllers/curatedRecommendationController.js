const { CuratedRecommendation, Book, Category, Author, User, StudentProfile } = require('../models');

// Phase 12: Teacher / School Recommendations
exports.getCuratedRecommendations = async (req, res) => {
  try {
    let targetClass = req.query.class_name;

    // If student, default to their student profile class if not specified
    if (!targetClass && req.user?.role === 'student') {
      const profile = await StudentProfile.findOne({ where: { user_id: req.user.id } });
      if (profile && profile.class_name) {
        targetClass = profile.class_name;
      }
    }

    const where = {};
    if (targetClass && targetClass !== 'All') {
      // Match exact class name or 'All'
      where.class_name = [targetClass, 'All', 'all'];
    }

    const recommendations = await CuratedRecommendation.findAll({
      where,
      include: [
        {
          model: Book,
          as: 'book',
          include: [
            { model: Category, as: 'category', attributes: ['id', 'name'] },
            { model: Author, as: 'author', attributes: ['id', 'name'] }
          ]
        },
        {
          model: User,
          as: 'curator',
          attributes: ['id', 'name', 'role']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.json({
      success: true,
      label: 'Recommended by School',
      recommendations
    });
  } catch (error) {
    console.error('getCuratedRecommendations error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load school recommendations.' });
  }
};

exports.createCuratedRecommendation = async (req, res) => {
  try {
    const { class_name, subject, topic, book_id, notes } = req.body;

    if (!class_name || !book_id) {
      return res.status(400).json({ success: false, message: 'Class name and Book ID are required.' });
    }

    const book = await Book.findByPk(book_id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }

    const recommendation = await CuratedRecommendation.create({
      class_name: class_name.trim(),
      subject: subject ? subject.trim() : '',
      topic: topic ? topic.trim() : '',
      book_id: book.id,
      notes: notes ? notes.trim() : '',
      recommended_by_id: req.user.id
    });

    return res.status(201).json({
      success: true,
      message: `"${book.title}" added to School Recommendations for ${class_name}.`,
      recommendation
    });
  } catch (error) {
    console.error('createCuratedRecommendation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create recommendation.' });
  }
};

exports.deleteCuratedRecommendation = async (req, res) => {
  try {
    const { id } = req.params;
    const recommendation = await CuratedRecommendation.findByPk(id);

    if (!recommendation) {
      return res.status(404).json({ success: false, message: 'Recommendation not found.' });
    }

    await recommendation.destroy();

    return res.json({ success: true, message: 'Recommendation removed.' });
  } catch (error) {
    console.error('deleteCuratedRecommendation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete recommendation.' });
  }
};

