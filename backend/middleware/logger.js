const { ActivityLog } = require('../models');

const logActivity = async ({ userId, userName, userRole, action, entityType, entityId, details, ip }) => {
  try {
    await ActivityLog.create({
      user_id: userId || null,
      user_name: userName || 'System',
      user_role: userRole || 'system',
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      ip_address: ip || '127.0.0.1'
    });
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
};

module.exports = { logActivity };
