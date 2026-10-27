const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin)
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new user
// @route   POST /api/users
// @access  Private (Admin)
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'staff',
      phone: phone || '',
    });

    res.status(201).json({
      success: true,
      message: `User ${user.name} created successfully.`,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Protection: Active admin cannot demote themselves
    if (req.user.id.toString() === req.params.id && req.body.role && req.body.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'You cannot demote your own administrator role.',
      });
    }

    if (req.body.email) {
      const emailExists = await User.findOne({
        email: req.body.email.toLowerCase(),
        _id: { $ne: req.params.id },
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email is already used by another user.',
        });
      }
      req.body.email = req.body.email.toLowerCase();
    }

    const updated = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.json({
      success: true,
      message: 'User updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user active/inactive status
// @route   PUT /api/users/:id/toggle-status
// @access  Private (Admin)
exports.toggleUserStatus = async (req, res, next) => {
  try {
    // Protection: Active admin cannot deactivate themselves
    if (req.user.id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own active session account.',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    user.status = user.status === 'active' ? 'inactive' : 'active';
    await user.save();

    res.json({
      success: true,
      message: `User status changed to ${user.status}.`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res, next) => {
  try {
    // Protection: Active admin cannot delete themselves
    if (req.user.id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own active administrator account.',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `User ${user.name} deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
