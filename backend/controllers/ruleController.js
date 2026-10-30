const { LibraryRule, LibrarySetting } = require('../models');
const { logActivity } = require('../middleware/logger');

exports.getRules = async (req, res) => {
  try {
    const rules = await LibraryRule.findAll();
    return res.json({ success: true, rules });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve rules.' });
  }
};

exports.updateRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { rule_value, description } = req.body;

    const rule = await LibraryRule.findByPk(id);
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found.' });

    await rule.update({
      rule_value: rule_value !== undefined ? rule_value : rule.rule_value,
      description: description !== undefined ? description : rule.description
    });

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'RULE_UPDATED',
      entityType: 'LibraryRule',
      entityId: rule.id,
      details: `Updated rule "${rule.rule_key}" to "${rule.rule_value}"`,
      ip: req.ip
    });

    return res.json({ success: true, message: 'Rule updated successfully.', rule });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update rule.' });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const settings = await LibrarySetting.findAll();
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    return res.json({ success: true, settings: settingsObj, rawSettings: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve settings.' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settingsObj = req.body; // e.g. { school_name: '...', library_name: '...' }
    for (const [key, value] of Object.entries(settingsObj)) {
      const [setting] = await LibrarySetting.findOrCreate({
        where: { key },
        defaults: { value: String(value), group: 'general' }
      });
      await setting.update({ value: String(value) });
    }

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SETTINGS_UPDATED',
      entityType: 'LibrarySetting',
      details: 'Updated library system settings',
      ip: req.ip
    });

    return res.json({ success: true, message: 'System settings updated successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update settings.' });
  }
};
