const mongoose = require('mongoose');

const nlpQueryHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'admin', 'pharmacist'],
    required: true
  },
  query: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  intent: {
    type: String,
    required: true,
    index: true
  },
  entities: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  success: {
    type: Boolean,
    default: true
  },
  message: {
    type: String,
    default: ''
  },
  latencyMs: {
    type: Number,
    min: 0,
    default: 0
  }
}, {
  timestamps: true
});

nlpQueryHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('NLPQueryHistory', nlpQueryHistorySchema);