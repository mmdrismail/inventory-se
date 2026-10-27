const express = require('express');
const router = express.Router();
const {
  getPurchases,
  getPurchaseById,
  createPurchase,
  receivePurchase,
  cancelPurchase,
} = require('../controllers/purchaseController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.route('/')
  .get(authorize('admin', 'manager'), getPurchases)
  .post(authorize('admin', 'manager'), createPurchase);

router.route('/:id')
  .get(authorize('admin', 'manager'), getPurchaseById);

router.put('/:id/receive', authorize('admin', 'manager'), receivePurchase);
router.put('/:id/cancel', authorize('admin', 'manager'), cancelPurchase);

module.exports = router;
