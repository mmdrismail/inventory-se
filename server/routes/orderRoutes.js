const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.route('/')
  .get(getOrders)
  .post(createOrder);

router.route('/:id')
  .get(getOrderById);

router.put('/:id/status', protect, authorize('admin', 'manager'), updateOrderStatus);

module.exports = router;
