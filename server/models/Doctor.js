const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    enum: [
      'Cardiology',
      'Neurology',
      'Orthopedics',
      'Pediatrics',
      'Dermatology',
      'Gynecology',
      'Psychiatry',
      'General Medicine',
      'ENT',
      'Ophthalmology',
      'Dentistry',
      'Urology',
      'Gastroenterology',
      'Endocrinology',
      'Pulmonology',
      'Nephrology',
      'Rheumatology',
      'Oncology',
      'Anesthesiology',
      'Radiology'
    ]
  },
  qualifications: [{
    degree: {
      type: String,
      required: true
    },
    institution: {
      type: String,
      required: true
    },
    year: {
      type: Number,
      required: true,
      min: [1900, 'Year cannot be before 1900'],
      max: [new Date().getFullYear(), 'Year cannot be in the future']
    }
  }],
  experience: {
    type: Number,
    required: [true, 'Experience is required'],
    min: [0, 'Experience cannot be negative']
  },
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    unique: true
  },
  consultationFee: {
    type: Number,
    required: [true, 'Consultation fee is required'],
    min: [0, 'Fee cannot be negative']
  },
  hospital: {
    type: String,
    trim: true,
    maxlength: [120, 'Hospital name cannot exceed 120 characters']
  },
  availability: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true
    },
    startTime: {
      type: String,
      required: true,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time in HH:MM format']
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time in HH:MM format']
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],
  timeSlots: [{
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    isBooked: {
      type: Boolean,
      default: false
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5']
    },
    count: {
      type: Number,
      default: 0
    }
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: [{
    documentType: {
      type: String,
      enum: ['medical_license', 'degree_certificate', 'identity_proof']
    },
    documentUrl: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalAppointments: {
    type: Number,
    default: 0
  },
  completedAppointments: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for better query performance
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ hospital: 1 });
doctorSchema.index({ 'availability.day': 1 });

// Virtual for full availability schedule
doctorSchema.virtual('fullSchedule').get(function() {
  return this.availability.filter(slot => slot.isAvailable);
});

// Method to check if doctor is available on a specific date and time
doctorSchema.methods.isAvailable = function(date, time) {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dayAvailability = this.availability.find(slot => 
    slot.day === dayOfWeek && slot.isAvailable
  );
  
  if (!dayAvailability) return false;
  
  return time >= dayAvailability.startTime && time <= dayAvailability.endTime;
};

// Method to get available time slots for a specific date
doctorSchema.methods.getAvailableSlots = function(date) {
  return this.timeSlots.filter(slot => 
    slot.date.toDateString() === date.toDateString() && 
    !slot.isBooked
  );
};

module.exports = mongoose.model('Doctor', doctorSchema);
