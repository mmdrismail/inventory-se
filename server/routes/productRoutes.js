const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  importCSV,
} = require('../controllers/productController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.route('/')
  .get(getProducts)
  .post(protect, authorize('admin', 'manager'), createProduct);

router.post('/import-csv', protect, authorize('admin', 'manager'), importCSV);

router.route('/:id')
  .get(getProductById)
  .put(protect, authorize('admin', 'manager'), updateProduct)
  .delete(protect, authorize('admin'), deleteProduct);

module.exports = router;
