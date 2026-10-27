const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  resetDatabase,
} = require('../controllers/settingController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.get('/', getSettings);
router.put('/', protect, authorize('admin'), updateSettings);
router.post('/reset-database', protect, authorize('admin'), resetDatabase);

module.exports = router;
