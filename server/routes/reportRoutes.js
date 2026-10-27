const express = require('express');
const router = express.Router();
const { getDashboardMetrics, getLowStockReport } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/dashboard', authorize('admin', 'manager'), getDashboardMetrics);
router.get('/low-stock', authorize('admin', 'manager'), getLowStockReport);

module.exports = router;
