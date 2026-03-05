const mongoose = require('mongoose');

const emergencyTicketSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Patient is required']
  },
  hospital: {
    type: String,
    required: [true, 'Hospital is required'],
    trim: true,
    maxlength: [120, 'Hospital name cannot exceed 120 characters']
  },
  incidentType: {
    type: String,
    enum: ['accident', 'cardiac', 'breathing', 'stroke', 'trauma', 'other'],
    required: [true, 'Incident type is required']
  },
  description: {
    type: String,
    required: [true, 'Incident description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  symptoms: [{
    type: String,
    trim: true,
    maxlength: [100, 'Symptom cannot exceed 100 characters']
  }],
  status: {
    type: String,
    enum: ['open', 'acknowledged', 'resolved'],
    default: 'open'
  },
  notifiedDoctors: [{
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

emergencyTicketSchema.index({ hospital: 1, status: 1, createdAt: -1 });
emergencyTicketSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model('EmergencyTicket', emergencyTicketSchema);
