const { ActivityLog } = require('../models');

exports.getActivityLogs = async (req, res) => {
  try {
    const { action, role, page = 1, limit = 50 } = req.query;
    const where = {};
    if (action) where.action = action;
    if (role) where.user_role = role;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows: logs } = await ActivityLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    return res.json({
      success: true,
      logs,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve activity logs.' });
  }
};
