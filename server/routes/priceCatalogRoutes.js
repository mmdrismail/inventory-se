const express = require('express');
const router = express.Router();
const {
  getPriceCatalog,
  upsertPriceCatalogEntry,
  updatePriceCatalogEntry,
  deletePriceCatalogEntry,
  syncHistoryToPriceCatalog,
  promoteToProduct,
} = require('../controllers/priceCatalogController');
const { protect } = require('../middleware/auth');

router.post('/sync-history', protect, syncHistoryToPriceCatalog);
router.post('/:id/promote-to-product', protect, promoteToProduct);

router.route('/')
  .get(protect, getPriceCatalog)
  .post(protect, upsertPriceCatalogEntry);

router.route('/:id')
  .put(protect, updatePriceCatalogEntry)
  .delete(protect, deletePriceCatalogEntry);

module.exports = router;
