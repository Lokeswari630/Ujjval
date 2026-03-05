const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Patient ID is required']
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Doctor ID is required']
  },
  date: {
    type: Date,
    required: [true, 'Appointment date is required'],
    min: [Date.now(), 'Appointment date cannot be in the past']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time in HH:MM format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time in HH:MM format']
  },
  status: {
    type: String,
    enum: ['payment_submitted', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  type: {
    type: String,
    enum: ['consultation', 'follow_up', 'emergency', 'check_up'],
    default: 'consultation'
  },
  symptoms: [{
    type: String,
    trim: true,
    maxlength: [100, 'Symptom description cannot exceed 100 characters']
  }],
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  consultationFee: {
    type: Number,
    required: true,
    min: [0, 'Fee cannot be negative']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'submitted', 'verified', 'rejected', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentId: {
    type: String
  },
  paymentProof: {
    utrNumber: {
      type: String,
      trim: true,
      maxlength: [30, 'UTR cannot exceed 30 characters']
    },
    receiptImage: {
      type: String
    },
    receiptUrl: {
      type: String
    },
    receiptName: {
      type: String,
      trim: true,
      maxlength: [120, 'Receipt name cannot exceed 120 characters']
    },
    submittedAt: {
      type: Date
    },
    reviewedAt: {
      type: Date
    }
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  prescription: {
    medicines: [{
      name: {
        type: String,
        required: true
      },
      dosage: {
        type: String,
        required: true
      },
      frequency: {
        type: String,
        required: true
      },
      duration: {
        type: String,
        required: true
      },
      instructions: String
    }],
    instructions: {
      type: String,
      maxlength: [1000, 'Instructions cannot exceed 1000 characters']
    },
    followUpDate: Date,
    issuedAt: {
      type: Date,
      default: Date.now
    }
  },
  diagnosis: {
    type: String,
    maxlength: [500, 'Diagnosis cannot exceed 500 characters']
  },
  labReports: [{
    title: {
      type: String,
      trim: true,
      maxlength: [120, 'Lab report title cannot exceed 120 characters']
    },
    fileName: {
      type: String,
      trim: true,
      maxlength: [180, 'Lab report file name cannot exceed 180 characters']
    },
    fileData: {
      type: String
    },
    fileUrl: {
      type: String,
      trim: true
    },
    mimeType: {
      type: String,
      trim: true,
      maxlength: [120, 'Lab report mime type cannot exceed 120 characters']
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Lab report notes cannot exceed 500 characters']
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  prescriptionFiles: [{
    title: {
      type: String,
      trim: true,
      maxlength: [120, 'Prescription title cannot exceed 120 characters']
    },
    fileName: {
      type: String,
      trim: true,
      maxlength: [180, 'Prescription file name cannot exceed 180 characters']
    },
    fileData: {
      type: String
    },
    fileUrl: {
      type: String,
      trim: true
    },
    mimeType: {
      type: String,
      trim: true,
      maxlength: [120, 'Prescription mime type cannot exceed 120 characters']
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Prescription notes cannot exceed 500 characters']
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  videoCallLink: {
    type: String
  },
  videoCallStartTime: Date,
  videoCallEndTime: Date,
  reminderSent: {
    type: Boolean,
    default: false
  },
  cancellationReason: {
    type: String,
    maxlength: [300, 'Cancellation reason cannot exceed 300 characters']
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rating: {
    score: {
      type: Number,
      min: [1, 'Rating cannot be less than 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    review: {
      type: String,
      maxlength: [500, 'Review cannot exceed 500 characters']
    },
    ratedAt: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
appointmentSchema.index({ patientId: 1, date: -1 });
appointmentSchema.index({ doctorId: 1, date: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ priority: 1 });
appointmentSchema.index({ date: 1, startTime: 1 });

// Virtual for appointment duration in minutes
appointmentSchema.virtual('duration').get(function() {
  const start = this.startTime.split(':');
  const end = this.endTime.split(':');
  const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
  const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
  return endMinutes - startMinutes;
});

// Virtual for appointment status display
appointmentSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'payment_submitted': 'Payment Submitted',
    'scheduled': 'Scheduled',
    'confirmed': 'Confirmed',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'no_show': 'No Show'
  };
  return statusMap[this.status] || this.status;
});

// Method to check if appointment can be cancelled
appointmentSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const appointmentTime = new Date(this.date);
  const [hours, minutes] = this.startTime.split(':');
  appointmentTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  // Allow cancellation up to 2 hours before appointment
  const timeDiff = appointmentTime - now;
  return timeDiff > (2 * 60 * 60 * 1000) && ['payment_submitted', 'scheduled'].includes(this.status);
};

// Method to check if appointment is upcoming
appointmentSchema.methods.isUpcoming = function() {
  const now = new Date();
  const appointmentTime = new Date(this.date);
  const [hours, minutes] = this.startTime.split(':');
  appointmentTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  return appointmentTime > now && ['payment_submitted', 'scheduled', 'confirmed'].includes(this.status);
};

// Pre-save middleware to validate time logic
appointmentSchema.pre('save', function(next) {
  const start = this.startTime.split(':');
  const end = this.endTime.split(':');
  const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
  const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
  
  if (startMinutes >= endMinutes) {
    return next(new Error('End time must be after start time'));
  }
  
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
