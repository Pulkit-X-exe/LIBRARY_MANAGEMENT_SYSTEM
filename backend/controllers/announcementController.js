const { Op } = require('sequelize');
const { Announcement, User } = require('../models');
const { logActivity } = require('../middleware/logger');

exports.getAnnouncements = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const announcements = await Announcement.findAll({
      where: {
        [Op.or]: [
          { expiry_date: null },
          { expiry_date: { [Op.gte]: today } }
        ]
      },
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'role'] }],
      order: [['priority', 'DESC'], ['createdAt', 'DESC']]
    });

    return res.json({ success: true, announcements });
  } catch (error) {
    console.error('getAnnouncements error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve announcements.' });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, priority = 'medium', category = 'general', expiry_date } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    const announcement = await Announcement.create({
      title,
      content,
      priority,
      category,
      expiry_date: expiry_date || null,
      created_by_id: req.user.id
    });

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ANNOUNCEMENT_CREATED',
      entityType: 'Announcement',
      entityId: announcement.id,
      details: `Published announcement: "${title}"`,
      ip: req.ip
    });

    return res.status(201).json({ success: true, message: 'Announcement created successfully.', announcement });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create announcement.' });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Announcement.findByPk(id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found.' });
    await item.destroy();
    return res.json({ success: true, message: 'Announcement deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete announcement.' });
  }
};
