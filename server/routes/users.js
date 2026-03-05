const express = require('express');
const { protect, authorize, authorizeOwnerOrAdmin } = require('../middleware/auth');
const {
  getUsers,
  getUserProfile,
  getUserById,
  updateUser,
  deleteUser,
  updateUserStatus,
  getUserStats
} = require('../controllers/userController');

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
router.get('/', authorize('admin'), getUsers);

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin or Owner)
router.get('/profile', getUserProfile);

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin or Owner)
router.get('/:id', authorizeOwnerOrAdmin('id'), getUserById);

// @desc    Update user (Admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
router.put('/:id', authorize('admin'), updateUser);

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete('/:id', authorize('admin'), deleteUser);

// @desc    Activate/Deactivate user (Admin only)
// @route   PATCH /api/users/:id/status
// @access  Private/Admin
router.patch('/:id/status', authorize('admin'), updateUserStatus);

// @desc    Get user statistics (Admin only)
// @route   GET /api/users/stats
// @access  Private/Admin
router.get('/stats/overview', authorize('admin'), getUserStats);

module.exports = router;
