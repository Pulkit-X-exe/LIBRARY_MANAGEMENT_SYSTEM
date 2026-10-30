const { Wishlist, Book, Category, Author } = require('../models');

exports.getWishlist = async (req, res) => {
  try {
    const items = await Wishlist.findAll({
      where: { user_id: req.user.id },
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
      order: [['createdAt', 'DESC']]
    });

    return res.json({ success: true, wishlist: items });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve wishlist.' });
  }
};

exports.toggleWishlist = async (req, res) => {
  try {
    const { book_id } = req.body;
    if (!book_id) return res.status(400).json({ success: false, message: 'Book ID is required.' });

    const existing = await Wishlist.findOne({
      where: { user_id: req.user.id, book_id }
    });

    if (existing) {
      await existing.destroy();
      return res.json({ success: true, isWishlisted: false, message: 'Removed from wishlist.' });
    } else {
      await Wishlist.create({ user_id: req.user.id, book_id });
      return res.json({ success: true, isWishlisted: true, message: 'Added to wishlist.' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to toggle wishlist.' });
  }
};
