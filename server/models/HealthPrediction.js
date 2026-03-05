const mongoose = require('mongoose');

const healthPredictionSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Patient ID is required']
  },
  symptoms: [{
    type: String,
    required: true,
    trim: true
  }],
  age: {
    type: Number,
    required: true,
    min: [0, 'Age cannot be negative'],
    max: [150, 'Age cannot exceed 150']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  lifestyleFactors: {
    smoking: {
      type: String,
      enum: ['never', 'occasional', 'regular', 'heavy'],
      default: 'never'
    },
    alcohol: {
      type: String,
      enum: ['never', 'occasional', 'regular', 'heavy'],
      default: 'never'
    },
    exercise: {
      type: String,
      enum: ['none', 'rare', 'moderate', 'frequent'],
      default: 'moderate'
    },
    diet: {
      type: String,
      enum: ['poor', 'average', 'good', 'excellent'],
      default: 'average'
    },
    stress: {
      type: String,
      enum: ['low', 'moderate', 'high', 'severe'],
      default: 'moderate'
    }
  },
  vitalSigns: {
    bloodPressure: {
      systolic: { type: Number, min: 0, max: 300 },
      diastolic: { type: Number, min: 0, max: 200 }
    },
    heartRate: {
      type: Number,
      min: 30,
      max: 200
    },
    temperature: {
      type: Number,
      min: 35,
      max: 42
    },
    bloodSugar: {
      type: Number,
      min: 50,
      max: 500
    },
    weight: {
      type: Number,
      min: 1,
      max: 500
    },
    height: {
      type: Number,
      min: 50,
      max: 300
    }
  },
  aiAnalysis: {
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      required: true
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },
    possibleConditions: [{
      condition: {
        type: String,
        required: true
      },
      probability: {
        type: Number,
        min: 0,
        max: 100,
        required: true
      },
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'critical'],
        required: true
      },
      description: String
    }],
    recommendations: [{
      type: {
        type: String,
        required: true,
        trim: true
      },
      priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      }
    }],
    urgencyLevel: {
      type: String,
      enum: ['routine', 'urgent', 'emergency'],
      default: 'routine'
    },
    suggestedSpecialization: {
      type: String,
      enum: [
        'General Medicine', 'Cardiology', 'Neurology', 'Orthopedics',
        'Pediatrics', 'Dermatology', 'Gynecology', 'Psychiatry',
        'ENT', 'Ophthalmology', 'Emergency'
      ]
    }
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: Date,
  consultationRecommended: {
    type: Boolean,
    default: true
  },
  predictionDate: {
    type: Date,
    default: Date.now
  },
  reviewedByDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  doctorNotes: String,
  isConfirmed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
healthPredictionSchema.index({ patientId: 1, predictionDate: -1 });
healthPredictionSchema.index({ 'aiAnalysis.riskLevel': 1 });
healthPredictionSchema.index({ 'aiAnalysis.urgencyLevel': 1 });

// Virtual for BMI calculation
healthPredictionSchema.virtual('bmi').get(function() {
  if (this.vitalSigns.weight && this.vitalSigns.height) {
    const heightInMeters = this.vitalSigns.height / 100;
    return (this.vitalSigns.weight / (heightInMeters * heightInMeters)).toFixed(2);
  }
  return null;
});

// Virtual for age group
healthPredictionSchema.virtual('ageGroup').get(function() {
  if (this.age < 18) return 'child';
  if (this.age < 30) return 'young_adult';
  if (this.age < 50) return 'adult';
  if (this.age < 65) return 'middle_aged';
  return 'senior';
});

module.exports = mongoose.model('HealthPrediction', healthPredictionSchema);
