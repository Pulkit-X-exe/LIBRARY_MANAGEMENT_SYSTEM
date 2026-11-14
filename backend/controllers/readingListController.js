const { ReadingList, ReadingListItem, Book, Category, Author } = require('../models');

// Phase 9: Personal Reading Lists
exports.getReadingLists = async (req, res) => {
  try {
    const lists = await ReadingList.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: ReadingListItem,
          as: 'items',
          include: [
            {
              model: Book,
              as: 'book',
              include: [
                { model: Category, as: 'category', attributes: ['id', 'name'] },
                { model: Author, as: 'author', attributes: ['id', 'name'] }
              ]
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.json({ success: true, lists });
  } catch (error) {
    console.error('getReadingLists error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load reading lists.' });
  }
};

exports.createReadingList = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'List name is required.' });
    }

    const list = await ReadingList.create({
      user_id: req.user.id,
      name: name.trim(),
      description: description ? description.trim() : ''
    });

    return res.status(201).json({
      success: true,
      message: `Reading list "${list.name}" created.`,
      list: { ...list.toJSON(), items: [] }
    });
  } catch (error) {
    console.error('createReadingList error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create reading list.' });
  }
};

exports.updateReadingList = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const list = await ReadingList.findOne({
      where: { id, user_id: req.user.id }
    });

    if (!list) {
      return res.status(404).json({ success: false, message: 'Reading list not found.' });
    }

    if (name && name.trim()) list.name = name.trim();
    if (description !== undefined) list.description = description.trim();

    await list.save();

    return res.json({
      success: true,
      message: 'Reading list updated.',
      list
    });
  } catch (error) {
    console.error('updateReadingList error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update reading list.' });
  }
};

exports.deleteReadingList = async (req, res) => {
  try {
    const { id } = req.params;
    const list = await ReadingList.findOne({
      where: { id, user_id: req.user.id }
    });

    if (!list) {
      return res.status(404).json({ success: false, message: 'Reading list not found.' });
    }

    await list.destroy();

    return res.json({ success: true, message: 'Reading list deleted.' });
  } catch (error) {
    console.error('deleteReadingList error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete reading list.' });
  }
};

exports.addBookToList = async (req, res) => {
  try {
    const { id } = req.params; // list id
    const { book_id, notes } = req.body;

    if (!book_id) {
      return res.status(400).json({ success: false, message: 'Book ID is required.' });
    }

    const list = await ReadingList.findOne({
      where: { id, user_id: req.user.id }
    });

    if (!list) {
      return res.status(404).json({ success: false, message: 'Reading list not found.' });
    }

    const book = await Book.findByPk(book_id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }

    // Prevent duplicates in same list
    const [item, created] = await ReadingListItem.findOrCreate({
      where: { reading_list_id: list.id, book_id: book.id },
      defaults: {
        reading_list_id: list.id,
        book_id: book.id,
        notes: notes || ''
      }
    });

    return res.json({
      success: true,
      message: created ? `Added "${book.title}" to ${list.name}.` : `"${book.title}" is already in this list.`,
      item
    });
  } catch (error) {
    console.error('addBookToList error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add book to reading list.' });
  }
};

exports.removeBookFromList = async (req, res) => {
  try {
    const { id, bookId } = req.params;

    const list = await ReadingList.findOne({
      where: { id, user_id: req.user.id }
    });

    if (!list) {
      return res.status(404).json({ success: false, message: 'Reading list not found.' });
    }

    const item = await ReadingListItem.findOne({
      where: { reading_list_id: list.id, book_id: bookId }
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Book not found in this list.' });
    }

    await item.destroy();

    return res.json({ success: true, message: 'Book removed from list.' });
  } catch (error) {
    console.error('removeBookFromList error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove book.' });
  }
};

