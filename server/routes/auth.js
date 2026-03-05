const express = require('express');
const { protect } = require('../middleware/auth');
const {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
  logout
} = require('../controllers/authController');
const {
  validateUserRegistration,
  validateUserLogin,
  validatePasswordUpdate
} = require('../middleware/validation');

const router = express.Router();

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', validateUserRegistration, register);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', validateUserLogin, login);

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, getMe);

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, updateProfile);

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
router.put('/password', protect, validatePasswordUpdate, updatePassword);

// @desc    Logout user
// @route   GET /api/auth/logout
// @access  Private
router.get('/logout', protect, logout);

module.exports = router;
