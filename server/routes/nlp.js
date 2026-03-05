const express = require('express');
const { protect } = require('../middleware/auth');
const nlpHealthService = require('../services/nlpHealthService');

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Process natural language health query
// @route   POST /api/nlp/query
// @access  Private
router.post('/query', async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }

    const result = await nlpHealthService.processQuery(query, req.user.id);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get supported intents
// @route   GET /api/nlp/intents
// @access  Private
router.get('/intents', async (req, res, next) => {
  try {
    const intents = nlpHealthService.getSupportedIntents();

    res.status(200).json({
      success: true,
      data: intents
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get query suggestions
// @route   GET /api/nlp/suggestions
// @access  Private
router.get('/suggestions', async (req, res, next) => {
  try {
    const suggestions = nlpHealthService.getQuerySuggestions();

    res.status(200).json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
