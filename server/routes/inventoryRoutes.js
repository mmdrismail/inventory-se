const express = require('express');
const router = express.Router();
const { getMovements, adjustStock } = require('../controllers/inventoryController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/movements', authorize('admin', 'manager'), getMovements);
router.post('/adjust', authorize('admin', 'manager'), adjustStock);

module.exports = router;
