const express = require('express');
const router = express.Router();
const {
  getMoneyReceipts,
  getMoneyReceiptById,
  createMoneyReceipt,
  updateMoneyReceipt,
  deleteMoneyReceipt,
} = require('../controllers/moneyReceiptController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getMoneyReceipts)
  .post(protect, createMoneyReceipt);

router.route('/:id')
  .get(protect, getMoneyReceiptById)
  .put(protect, updateMoneyReceipt)
  .delete(protect, deleteMoneyReceipt);

module.exports = router;
