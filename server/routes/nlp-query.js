const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  processNlpQuery,
  getQueryHistory,
  getQuerySuggestions,
  getQueryStats
} = require('../controllers/nlpQueryController');

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Process natural language role-aware query
// @route   POST /api/nlp-query
// @access  Private
router.post('/', processNlpQuery);

// @desc    Get query processing statistics
// @route   GET /api/nlp-query/stats
// @access  Private (Admin only)
router.get('/stats', authorize('admin'), getQueryStats);

// @desc    Get query history for user
// @route   GET /api/nlp-query/history
// @access  Private
router.get('/history', getQueryHistory);
router.get('/suggestions', getQuerySuggestions);

module.exports = router;
