const express = require('express');
const router = express.Router();
const {
  getMediaAssets,
  lookupMediaByHash,
  registerMediaAsset,
  deleteMediaAsset,
} = require('../controllers/mediaController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.get('/lookup-hash/:sha256', protect, lookupMediaByHash);

router.route('/')
  .get(protect, getMediaAssets)
  .post(protect, registerMediaAsset);

router.delete('/:id', protect, authorize('admin', 'manager'), deleteMediaAsset);

module.exports = router;
