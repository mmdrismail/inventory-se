const express = require('express');
const router = express.Router();
const {
  getMachines,
  getUnifiedHierarchy,
  getMachineParts,
  upsertMachineModel,
  updateMachineModel,
  deleteMachineModel,
} = require('../controllers/machineController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.get('/hierarchy', protect, getUnifiedHierarchy);
router.get('/:idOrKey/parts', protect, getMachineParts);

router.route('/')
  .get(protect, getMachines)
  .post(protect, upsertMachineModel);

router.route('/:id')
  .put(protect, updateMachineModel)
  .delete(protect, authorize('admin', 'manager'), deleteMachineModel);

module.exports = router;
