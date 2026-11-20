const express = require('express');
const router = express.Router();
const {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  convertQuotationToSale,
} = require('../controllers/quotationController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getQuotations)
  .post(protect, createQuotation);

router.route('/:id')
  .get(protect, getQuotationById)
  .put(protect, updateQuotation)
  .delete(protect, deleteQuotation);

router.route('/:id/convert-to-sale')
  .post(protect, convertQuotationToSale);

module.exports = router;
