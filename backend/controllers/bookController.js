const { Op } = require('sequelize');
const { Book, BookCopy, Category, Subject, Author, Publisher, Review, User, BookIssue } = require('../models');
const { logActivity } = require('../middleware/logger');

exports.getAllBooks = async (req, res) => {
  try {
    const { 
      search, category, subject, author, publisher, language, condition,
      publication_year, available, sort = 'newest', page = 1, limit = 16 
    } = req.query;

    const where = {};

    // Availability filter
    if (available === 'true' || available === 'available_now') {
      where.available_copies = { [Op.gt]: 0 };
    } else if (available === 'limited') {
      where.available_copies = 1;
    } else if (available === 'unavailable') {
      where.available_copies = 0;
    } else if (available === 'issued') {
      where.issued_copies = { [Op.gt]: 0 };
    }

    if (language && language !== 'All' && language !== 'all') {
      where.language = language;
    }

    if (condition && condition !== 'All' && condition !== 'all') {
      where.condition = condition;
    }

    if (publication_year && publication_year !== 'All' && publication_year !== 'all') {
      where.publication_year = parseInt(publication_year);
    }

    const include = [
      { model: Category, as: 'category', attributes: ['id', 'name', 'code'] },
      { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
      { model: Author, as: 'author', attributes: ['id', 'name'] },
      { model: Publisher, as: 'publisher', attributes: ['id', 'name'] },
      { 
        model: Review, 
        as: 'reviews', 
        attributes: ['rating'] 
      }
    ];

    // Category filter by ID or by Name
    if (category && category !== 'All' && category !== 'all') {
      if (/^\d+$/.test(category)) {
        where.category_id = parseInt(category);
      } else {
        include[0].where = { name: category };
      }
    }

    // Subject filter by ID or by Name
    if (subject && subject !== 'All' && subject !== 'all') {
      if (/^\d+$/.test(subject)) {
        where.subject_id = parseInt(subject);
      } else {
        include[1].where = { name: subject };
      }
    }

    if (author && author !== 'All') {
      if (/^\d+$/.test(author)) {
        where.author_id = parseInt(author);
      } else {
        include[2].where = { name: { [Op.like]: `%${author}%` } };
      }
    }

    // Comprehensive search across title, isbn, description, short_summary, author, subject, category
    if (search && search.trim()) {
      const q = search.trim();

      const matchingAuthors = await Author.findAll({
        where: { name: { [Op.like]: `%${q}%` } },
        attributes: ['id']
      });
      const authorIds = matchingAuthors.map(a => a.id);

      const matchingSubjects = await Subject.findAll({
        where: { name: { [Op.like]: `%${q}%` } },
        attributes: ['id']
      });
      const subjectIds = matchingSubjects.map(s => s.id);

      const matchingCategories = await Category.findAll({
        where: { name: { [Op.like]: `%${q}%` } },
        attributes: ['id']
      });
      const categoryIds = matchingCategories.map(c => c.id);

      const orConditions = [
        { title: { [Op.like]: `%${q}%` } },
        { isbn: { [Op.like]: `%${q}%` } },
        { description: { [Op.like]: `%${q}%` } },
        { short_summary: { [Op.like]: `%${q}%` } }
      ];

      if (authorIds.length > 0) orConditions.push({ author_id: { [Op.in]: authorIds } });
      if (subjectIds.length > 0) orConditions.push({ subject_id: { [Op.in]: subjectIds } });
      if (categoryIds.length > 0) orConditions.push({ category_id: { [Op.in]: categoryIds } });

      where[Op.or] = orConditions;
    }

    let order = [['createdAt', 'DESC']];
    if (sort === 'az' || sort === 'title_az') order = [['title', 'ASC']];
    else if (sort === 'za' || sort === 'title_za') order = [['title', 'DESC']];
    else if (sort === 'oldest') order = [['createdAt', 'ASC']];
    else if (sort === 'popular') order = [['borrow_count', 'DESC']];
    else if (sort === 'available') order = [['available_copies', 'DESC']];
    else if (sort === 'author_az') order = [[{ model: Author, as: 'author' }, 'name', 'ASC']];

    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 16));
    const offset = (parseInt(page) - 1) * parsedLimit;

    const { count, rows: books } = await Book.findAndCountAll({
      where,
      include,
      order,
      distinct: true,
      limit: parsedLimit,
      offset
    });

    // Compute average ratings
    let booksWithRating = books.map(b => {
      const bObj = b.toJSON();
      const ratings = bObj.reviews || [];
      const avgRating = ratings.length > 0
        ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
        : 0;
      return {
        ...bObj,
        avg_rating: parseFloat(avgRating),
        reviews_count: ratings.length
      };
    });

    if (sort === 'rating' || sort === 'highest_rated') {
      booksWithRating.sort((a, b) => b.avg_rating - a.avg_rating);
    }

    return res.json({
      success: true,
      books: booksWithRating,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parsedLimit,
        totalPages: Math.ceil(count / parsedLimit)
      }
    });
  } catch (error) {
    console.error('getAllBooks error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve books.' });
  }
};

exports.getDiscoveryStats = async (req, res) => {
  try {
    const totalTitles = await Book.count();
    const totalCopies = (await Book.sum('total_copies')) || 0;
    const availableCopies = (await Book.sum('available_copies')) || 0;
    const issuedCopies = (await Book.sum('issued_copies')) || 0;
    const reservedCopies = (await Book.sum('reserved_copies')) || 0;

    const popularBooks = await Book.findAll({
      order: [['borrow_count', 'DESC']],
      limit: 6,
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        { model: Author, as: 'author', attributes: ['id', 'name'] }
      ]
    });

    const recentlyAdded = await Book.findAll({
      order: [['createdAt', 'DESC']],
      limit: 6,
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        { model: Author, as: 'author', attributes: ['id', 'name'] }
      ]
    });

    const categories = await Category.findAll({
      attributes: ['id', 'name', 'code'],
      include: [{ model: Book, as: 'books', attributes: ['id'] }]
    });

    const categoriesWithCount = categories.map(c => ({
      id: c.id,
      name: c.name,
      code: c.code,
      book_count: c.books?.length || 0
    }));

    return res.json({
      success: true,
      stats: {
        total_titles: totalTitles,
        total_copies: totalCopies,
        available_copies: availableCopies,
        issued_copies: issuedCopies,
        reserved_copies: reservedCopies
      },
      popular_books: popularBooks,
      recently_added: recentlyAdded,
      categories: categoriesWithCount
    });
  } catch (error) {
    console.error('getDiscoveryStats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch library discovery stats.' });
  }
};

exports.getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findByPk(id, {
      include: [
        { model: Category, as: 'category' },
        { model: Subject, as: 'subject' },
        { model: Author, as: 'author' },
        { model: Publisher, as: 'publisher' },
        { 
          model: BookCopy, 
          as: 'copies',
          attributes: ['id', 'barcode', 'condition', 'status'] 
        },
        {
          model: Review,
          as: 'reviews',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar', 'role'] }],
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }

    const bObj = book.toJSON();
    const ratings = bObj.reviews || [];
    const avgRating = ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
      : 0;

    return res.json({
      success: true,
      book: {
        ...bObj,
        avg_rating: parseFloat(avgRating),
        reviews_count: ratings.length
      }
    });
  } catch (error) {
    console.error('getBookById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve book details.' });
  }
};

exports.createBook = async (req, res) => {
  try {
    const {
      isbn, title, author_id, publisher_id, category_id, subject_id,
      edition, publication_year, language, description, cover_image,
      total_copies = 1, shelf_number, rack_number, row_number, price
    } = req.body;

    if (!isbn || !title) {
      return res.status(400).json({ success: false, message: 'ISBN and Title are required.' });
    }

    const existing = await Book.findOne({ where: { isbn } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A book with this ISBN already exists.' });
    }

    const copiesCount = Math.max(1, parseInt(total_copies) || 1);

    const book = await Book.create({
      isbn,
      title,
      author_id: author_id || null,
      publisher_id: publisher_id || null,
      category_id: category_id || null,
      subject_id: subject_id || null,
      edition: edition || '1st Edition',
      publication_year: publication_year || new Date().getFullYear(),
      language: language || 'English',
      description: description || '',
      cover_image: cover_image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=500&q=80',
      total_copies: copiesCount,
      available_copies: copiesCount,
      shelf_number: shelf_number || 'Shelf 1',
      rack_number: rack_number || 'Rack A',
      row_number: row_number || 'Row 1',
      price: price || 0.0,
      status: 'available'
    });

    // Auto generate copies with barcodes
    const copies = [];
    const timestamp = Date.now().toString().slice(-5);
    for (let i = 1; i <= copiesCount; i++) {
      const barcode = `LIB-BOOK-${timestamp}${i}`;
      copies.push({
        book_id: book.id,
        barcode,
        condition: 'new',
        status: 'available'
      });
    }
    await BookCopy.bulkCreate(copies);

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'BOOK_CREATED',
      entityType: 'Book',
      entityId: book.id,
      details: `Created new title: "${title}" with ${copiesCount} copies`,
      ip: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Book created successfully with physical inventory copies.',
      book
    });
  } catch (error) {
    console.error('createBook error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create book: ' + error.message });
  }
};

exports.updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findByPk(id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }

    await book.update(req.body);

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'BOOK_UPDATED',
      entityType: 'Book',
      entityId: book.id,
      details: `Updated book record: "${book.title}"`,
      ip: req.ip
    });

    return res.json({
      success: true,
      message: 'Book updated successfully',
      book
    });
  } catch (error) {
    console.error('updateBook error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update book.' });
  }
};

exports.deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findByPk(id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }

    // Check if any copies are currently issued
    const activeLoans = await BookIssue.count({
      where: {
        book_id: id,
        status: ['issued', 'overdue']
      }
    });

    if (activeLoans > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete book. ${activeLoans} physical cop(ies) are currently checked out.`
      });
    }

    await book.destroy();

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'BOOK_DELETED',
      entityType: 'Book',
      entityId: parseInt(id),
      details: `Deleted book: "${book.title}" (ISBN: ${book.isbn})`,
      ip: req.ip
    });

    return res.json({
      success: true,
      message: 'Book and copies deleted successfully.'
    });
  } catch (error) {
    console.error('deleteBook error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete book.' });
  }
};

exports.updateCopyStatus = async (req, res) => {
  try {
    const { copyId } = req.params;
    const { status, condition } = req.body;

    const copy = await BookCopy.findByPk(copyId, { include: [{ model: Book, as: 'book' }] });
    if (!copy) {
      return res.status(404).json({ success: false, message: 'Copy not found.' });
    }

    const prevStatus = copy.status;
    await copy.update({
      status: status || copy.status,
      condition: condition || copy.condition
    });

    // Update book available copies counter if status changed
    const book = copy.book;
    if (book) {
      const availCount = await BookCopy.count({
        where: { book_id: book.id, status: 'available' }
      });
      await book.update({ available_copies: availCount });
    }

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'COPY_STATUS_UPDATED',
      entityType: 'BookCopy',
      entityId: copy.id,
      details: `Barcode ${copy.barcode} status changed from ${prevStatus} to ${copy.status}`,
      ip: req.ip
    });

    return res.json({
      success: true,
      message: 'Copy status updated successfully.',
      copy
    });
  } catch (error) {
    console.error('updateCopyStatus error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update copy.' });
  }
};
