const { DigitalResource } = require('../models');
const path = require('path');
const fs = require('fs');

exports.getResources = async (req, res) => {
  try {
    const { resource_type, search } = req.query;
    const where = {};
    if (resource_type) where.resource_type = resource_type;
    
    // Check role access
    const userRole = req.user ? req.user.role : 'student';
    // 'all', 'students_only', 'teachers_only'
    if (userRole === 'student') {
      where.access_role = ['all', 'students_only'];
    } else if (userRole === 'teacher') {
      where.access_role = ['all', 'teachers_only'];
    }

    const resources = await DigitalResource.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    return res.json({ success: true, resources });
  } catch (error) {
    console.error('getResources error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve digital library resources.' });
  }
};

exports.downloadResource = async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await DigitalResource.findByPk(id);
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found.' });

    await resource.increment('downloads_count');

    // Resolve file path
    const filePath = path.join(__dirname, '..', resource.file_url);
    if (fs.existsSync(filePath)) {
      return res.download(filePath, `${resource.title}.pdf`);
    } else {
      // Fallback: send the default sample exam paper
      const fallbackPath = path.join(__dirname, '..', 'uploads', 'sample_cs_exam_papers.pdf');
      if (fs.existsSync(fallbackPath)) {
        return res.download(fallbackPath, `${resource.title}.pdf`);
      }
      return res.status(404).json({ success: false, message: 'Physical PDF file not on disk.' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Download error.' });
  }
};
