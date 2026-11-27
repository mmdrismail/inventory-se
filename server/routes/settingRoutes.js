const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  resetDatabase,
  getStorageAnalyticsReport,
} = require('../controllers/settingController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.get('/', getSettings);
router.put('/', protect, authorize('admin'), updateSettings);
router.get('/storage-analytics', protect, getStorageAnalyticsReport);
router.post('/reset-database', protect, authorize('admin'), resetDatabase);

module.exports = router;
