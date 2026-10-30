const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, StudentProfile, TeacherProfile, LibrarianProfile, BookIssue, Fine } = require('../models');
const { logActivity } = require('../middleware/logger');

exports.getAllUsers = async (req, res) => {
  try {
    const { role, search, status, page = 1, limit = 20 } = req.query;
    const where = {};

    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        { model: StudentProfile, as: 'student_profile' },
        { model: TeacherProfile, as: 'teacher_profile' },
        { model: LibrarianProfile, as: 'librarian_profile' }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // Attach active loans and pending fines count
    const userList = await Promise.all(users.map(async u => {
      const uJson = u.toJSON();
      const activeLoans = await BookIssue.count({
        where: { user_id: u.id, status: ['issued', 'overdue'] }
      });
      const pendingFines = await Fine.sum('amount', {
        where: { user_id: u.id, status: 'pending' }
      });
      return {
        ...uJson,
        profile_picture: uJson.profile_picture || uJson.avatar || '',
        avatar: uJson.profile_picture || uJson.avatar || '',
        active_loans_count: activeLoans,
        total_pending_fine: pendingFines || 0
      };
    }));

    return res.json({
      success: true,
      users: userList,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('getAllUsers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const {
      name, email, password, role, phone,
      roll_number, class_name, section, admission_number,
      department, employee_id
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const pic = req.body.profile_picture || req.body.avatar || '';
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role,
      phone: phone || '',
      profile_picture: pic,
      avatar: pic,
      status: 'active'
    });

    if (role === 'student') {
      const barcode = `STU-${Date.now().toString().slice(-6)}`;
      await StudentProfile.create({
        user_id: user.id,
        roll_number: roll_number || '',
        class_name: class_name || 'Grade 10',
        section: section || 'A',
        admission_number: admission_number || `ADM-${Date.now().toString().slice(-4)}`,
        barcode_id: barcode
      });
    } else if (role === 'teacher') {
      await TeacherProfile.create({
        user_id: user.id,
        employee_id: employee_id || `TCH-${Date.now().toString().slice(-4)}`,
        department: department || 'General Studies'
      });
    } else if (role === 'librarian') {
      await LibrarianProfile.create({
        user_id: user.id,
        employee_id: employee_id || `LIB-${Date.now().toString().slice(-4)}`
      });
    }

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      details: `Created new ${role} account for ${name} (${email})`,
      ip: req.ip
    });

    const fullUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: StudentProfile, as: 'student_profile' },
        { model: TeacherProfile, as: 'teacher_profile' },
        { model: LibrarianProfile, as: 'librarian_profile' }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user: fullUser
    });
  } catch (error) {
    console.error('createUser error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create user: ' + error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, status, roll_number, class_name, section, department } = req.body;

    const user = await User.findByPk(id, {
      include: [
        { model: StudentProfile, as: 'student_profile' },
        { model: TeacherProfile, as: 'teacher_profile' }
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updates = {
      name: name || user.name,
      phone: phone !== undefined ? phone : user.phone,
      status: status || user.status
    };
    if (req.body.profile_picture) {
      updates.profile_picture = req.body.profile_picture;
      updates.avatar = req.body.profile_picture;
    } else if (req.body.avatar) {
      updates.avatar = req.body.avatar;
      updates.profile_picture = req.body.avatar;
    }
    await user.update(updates);

    if (user.role === 'student' && user.student_profile) {
      await user.student_profile.update({
        roll_number: roll_number || user.student_profile.roll_number,
        class_name: class_name || user.student_profile.class_name,
        section: section || user.student_profile.section
      });
    } else if (user.role === 'teacher' && user.teacher_profile) {
      await user.teacher_profile.update({
        department: department || user.teacher_profile.department
      });
    }

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: user.id,
      details: `Updated details for user ${user.name}`,
      ip: req.ip
    });

    return res.json({
      success: true,
      message: 'User updated successfully.',
      user
    });
  } catch (error) {
    console.error('updateUser error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const activeLoans = await BookIssue.count({
      where: { user_id: id, status: ['issued', 'overdue'] }
    });

    if (activeLoans > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete user. User has ${activeLoans} active checked out book(s).`
      });
    }

    await user.destroy();

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'USER_DELETED',
      entityType: 'User',
      entityId: parseInt(id),
      details: `Deleted ${user.role} account ${user.name} (${user.email})`,
      ip: req.ip
    });

    return res.json({
      success: true,
      message: 'User deleted successfully.'
    });
  } catch (error) {
    console.error('deleteUser error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
};
