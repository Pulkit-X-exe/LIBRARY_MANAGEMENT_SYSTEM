const { Notification } = require('../models');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 30
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({
      where: { id, user_id: req.user.id }
    });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });

    await notification.update({ is_read: true });
    return res.json({ success: true, message: 'Marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to mark notification.' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.user.id, is_read: false } }
    );
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to mark all as read.' });
  }
};
