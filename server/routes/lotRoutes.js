const express = require('express');
const router = express.Router();
const {
  getLots,
  getLotById,
  createLot,
  updateLot,
  distributeLotToInventory,
} = require('../controllers/lotController');
const { protect } = require('../middleware/auth');

router.route('/').get(getLots).post(protect, createLot);
router.route('/:id').get(getLotById).put(protect, updateLot);
router.route('/:id/distribute').post(protect, distributeLotToInventory);

module.exports = router;
