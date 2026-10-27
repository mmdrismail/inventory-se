const express = require('express');
const router = express.Router();
const {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require('../controllers/supplierController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.route('/')
  .get(authorize('admin', 'manager'), getSuppliers)
  .post(authorize('admin', 'manager'), createSupplier);

router.route('/:id')
  .get(authorize('admin', 'manager'), getSupplierById)
  .put(authorize('admin', 'manager'), updateSupplier)
  .delete(authorize('admin'), deleteSupplier);

module.exports = router;
