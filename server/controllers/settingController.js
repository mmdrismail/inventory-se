const Setting = require('../models/Setting');
const { seedAllData } = require('../seeder');

// @desc    Get system settings
// @route   GET /api/settings
// @access  Public / Private
exports.getSettings = async (req, res, next) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({});
    }
    res.json({ success: true, data: setting });
  } catch (error) {
    next(error);
  }
};

// @desc    Update system settings
// @route   PUT /api/settings
// @access  Private (Admin)
exports.updateSettings = async (req, res, next) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create(req.body);
    } else {
      setting = await Setting.findByIdAndUpdate(setting._id, req.body, {
        new: true,
        runValidators: true,
      });
    }

    res.json({
      success: true,
      message: 'System settings updated successfully.',
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset entire database to initial seed data
// @route   POST /api/settings/reset-database
// @access  Private (Admin)
exports.resetDatabase = async (req, res, next) => {
  try {
    await seedAllData();
    res.json({
      success: true,
      message: 'Database has been cleanly reset and re-populated with demo data.',
    });
  } catch (error) {
    next(error);
  }
};
