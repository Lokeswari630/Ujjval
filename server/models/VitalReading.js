const mongoose = require('mongoose');

const vitalReadingSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  bloodPressure: {
    systolic: { type: Number, min: 40, max: 260 },
    diastolic: { type: Number, min: 30, max: 160 }
  },
  bloodSugar: { type: Number, min: 40, max: 600 },
  heartRate: { type: Number, min: 20, max: 240 },
  notes: { type: String, trim: true },
  recordedAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

module.exports = mongoose.model('VitalReading', vitalReadingSchema);
