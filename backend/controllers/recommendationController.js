const { Op } = require('sequelize');
const { Book, BookIssue, Wishlist, ReadingList, ReadingListItem, Category, Author, Review } = require('../models');

// Phase 11: AI-Style Algorithmic Book Recommendation Engine
exports.getRecommendationsForYou = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Gather student's reading signals:
    // a) Borrowed books
    const issues = await BookIssue.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Book,
          as: 'book',
          include: [
            { model: Category, as: 'category' },
            { model: Author, as: 'author' }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    // b) Wishlist books
    const wishItems = await Wishlist.findAll({
      where: { user_id: userId },
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

    // c) Custom reading list items
    const readingLists = await ReadingList.findAll({
      where: { user_id: userId },
      include: [
        {
          model: ReadingListItem,
          as: 'items',
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
        }
      ]
    });

    // Map known books, preferred categories, and preferred authors
    const readBookIds = new Set();
    const categoryWeights = {};
    const authorWeights = {};
    let anchorBook = null;

    issues.forEach((issue, idx) => {
      if (issue.book) {
        readBookIds.add(issue.book.id);
        if (!anchorBook) anchorBook = issue.book;
        const cat = issue.book.category_id;
        const auth = issue.book.author_id;
        const weight = Math.max(1, 5 - idx);
        if (cat) categoryWeights[cat] = (categoryWeights[cat] || 0) + weight;
        if (auth) authorWeights[auth] = (authorWeights[auth] || 0) + weight;
      }
    });

    wishItems.forEach(w => {
      if (w.book) {
        const cat = w.book.category_id;
        const auth = w.book.author_id;
        if (cat) categoryWeights[cat] = (categoryWeights[cat] || 0) + 3;
        if (auth) authorWeights[auth] = (authorWeights[auth] || 0) + 3;
      }
    });

    readingLists.forEach(l => {
      (l.items || []).forEach(item => {
        if (item.book) {
          const cat = item.book.category_id;
          const auth = item.book.author_id;
          if (cat) categoryWeights[cat] = (categoryWeights[cat] || 0) + 2;
          if (auth) authorWeights[auth] = (authorWeights[auth] || 0) + 2;
        }
      });
    });

    // Find candidate books from the catalog
    const topCategoryIds = Object.keys(categoryWeights).map(id => parseInt(id)).slice(0, 3);
    const topAuthorIds = Object.keys(authorWeights).map(id => parseInt(id)).slice(0, 3);

    const where = {};
    if (readBookIds.size > 0) {
      where.id = { [Op.notIn]: Array.from(readBookIds) };
    }

    const orClauses = [];
    if (topCategoryIds.length > 0) orClauses.push({ category_id: { [Op.in]: topCategoryIds } });
    if (topAuthorIds.length > 0) orClauses.push({ author_id: { [Op.in]: topAuthorIds } });

    if (orClauses.length > 0) {
      where[Op.or] = orClauses;
    }

    let candidateBooks = await Book.findAll({
      where,
      include: [
        { model: Category, as: 'category' },
        { model: Author, as: 'author' },
        { model: Review, as: 'reviews', attributes: ['rating'] }
      ],
      order: [
        ['borrow_count', 'DESC'],
        ['available_copies', 'DESC']
      ],
      limit: 12
    });

    // Fallback: If student is new or few signals exist, fetch top popular books
    if (candidateBooks.length < 4) {
      const popular = await Book.findAll({
        where: readBookIds.size > 0 ? { id: { [Op.notIn]: Array.from(readBookIds) } } : {},
        include: [
          { model: Category, as: 'category' },
          { model: Author, as: 'author' },
          { model: Review, as: 'reviews', attributes: ['rating'] }
        ],
        order: [['borrow_count', 'DESC']],
        limit: 8
      });
      candidateBooks = [...candidateBooks, ...popular].slice(0, 8);
    }

    // Rank candidates and generate human-readable algorithmic explanation
    const recommendations = candidateBooks.map(book => {
      const bObj = book.toJSON();
      const ratings = bObj.reviews || [];
      const avgRating = ratings.length > 0
        ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
        : 0;

      let reason = 'Trending academic recommendation for your grade';
      if (anchorBook && book.category_id === anchorBook.category_id) {
        reason = `Because you read: "${anchorBook.title}"`;
      } else if (topAuthorIds.includes(book.author_id)) {
        reason = `Popular work by ${book.author?.name || 'your favorite author'}`;
      } else if (topCategoryIds.includes(book.category_id)) {
        reason = `Recommended based on your interest in ${book.category?.name || 'this category'}`;
      }

      return {
        ...bObj,
        avg_rating: parseFloat(avgRating),
        reviews_count: ratings.length,
        recommendation_reason: reason,
        system_generated: true
      };
    });

    return res.json({
      success: true,
      label: 'System Generated Recommendations',
      recommendations
    });
  } catch (error) {
    console.error('getRecommendationsForYou error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate recommendations.' });
  }
};

