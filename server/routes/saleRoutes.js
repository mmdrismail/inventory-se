const express = require('express');
const router = express.Router();
const {
  getSales,
  getSaleById,
  createSale,
  cancelSale,
} = require('../controllers/saleController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.route('/')
  .get(getSales)
  .post(authorize('admin', 'manager', 'staff'), createSale);

router.route('/:id')
  .get(getSaleById);

router.put('/:id/cancel', authorize('admin', 'manager'), cancelSale);

module.exports = router;
