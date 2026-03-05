/**
 * Test NLP Query Endpoint
 */

const express = require('express');
const cors = require('cors');

// Create test app
const app = express();

app.use(cors());
app.use(express.json());

// Import NLP route
app.use('/api/nlp-query', require('./routes/nlp-query'));

// Test endpoint
app.post('/test-nlp', async (req, res) => {
  const { query } = req.body;
  
  console.log(`🧪 Testing NLP Query: "${query}"`);
  
  try {
    // Mock user for testing
    const mockUser = {
      id: 'test-user-123',
      role: 'patient'
    };

    // Import and use NLP service directly
    const nlpHealthService = require('./services/nlpHealthService');
    const result = await nlpHealthService.processQuery(query, mockUser.id);

    console.log('✅ NLP Result:', {
      intent: result.intent?.name,
      success: result.success,
      confidence: result.confidence,
      entities: result.entities
    });

    res.json({
      success: true,
      test_result: result
    });

  } catch (error) {
    console.error('❌ Test Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🧪 NLP Test Server running on port ${PORT}`);
  console.log(`📖 Test with: POST http://localhost:${PORT}/test-nlp`);
  console.log(`🔍 NLP Endpoint: http://localhost:${PORT}/api/nlp-query`);
});
