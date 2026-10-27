const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .put(updateUser)
  .delete(deleteUser);

router.put('/:id/toggle-status', toggleUserStatus);

module.exports = router;
