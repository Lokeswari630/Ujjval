const mongoose = require('mongoose');

const pharmacyOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    default: () => 'PH' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase()
  },
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: [true, 'Prescription ID is required']
  },
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
  medicines: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    brand: {
      type: String,
      trim: true
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
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    instructions: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    available: {
      type: Boolean,
      default: true
    },
    alternatives: [{
      name: String,
      brand: String,
      price: Number,
      reason: String
    }]
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  finalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  urgencyReason: {
    type: String,
    trim: true
  },
  preparationTime: {
    type: Number, // in minutes
    default: 30
  },
  estimatedReadyTime: Date,
  actualReadyTime: Date,
  assignedPharmacist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  patientDetails: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      landmark: String
    },
    allergies: [String],
    chronicConditions: [String]
  },
  deliveryOption: {
    type: String,
    enum: ['pickup', 'delivery'],
    default: 'pickup'
  },
  deliveryDetails: {
    partner: String,
    trackingId: String,
    estimatedDelivery: Date,
    actualDelivery: Date,
    deliveryFee: {
      type: Number,
      default: 0
    }
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online', 'insurance'],
    default: 'cash'
  },
  paymentId: String,
  insuranceDetails: {
    provider: String,
    policyNumber: String,
    approvedAmount: Number,
    claimStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  },
  notifications: [{
    type: {
      type: String,
      enum: ['sms', 'email', 'push', 'whatsapp'],
      required: true
    },
    message: String,
    sentAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'sent'
    }
  }],
  notes: [{
    text: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  qualityCheck: {
    checkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    checkedAt: Date,
    verified: Boolean,
    comments: String
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: Date
}, {
  timestamps: true
});

// Indexes for better query performance
pharmacyOrderSchema.index({ patientId: 1, status: 1 });
pharmacyOrderSchema.index({ doctorId: 1 });
pharmacyOrderSchema.index({ status: 1, priority: 1 });
pharmacyOrderSchema.index({ createdAt: -1 });

// Virtual for order status display
pharmacyOrderSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'pending': 'Pending Confirmation',
    'confirmed': 'Order Confirmed',
    'preparing': 'Preparing Medicines',
    'ready': 'Ready for Pickup',
    'dispatched': 'Out for Delivery',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled'
  };
  return statusMap[this.status] || this.status;
});

// Virtual for time remaining
pharmacyOrderSchema.virtual('timeRemaining').get(function() {
  if (this.status === 'delivered' || this.status === 'cancelled') {
    return null;
  }
  
  const now = new Date();
  const targetTime = this.estimatedReadyTime || this.createdAt;
  const remaining = targetTime - now;
  
  if (remaining <= 0) return 'Ready';
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
});

// Pre-save middleware to calculate final amount
pharmacyOrderSchema.pre('save', function(next) {
  if (this.isModified('medicines') || this.isModified('discount')) {
    this.totalAmount = this.medicines.reduce((sum, medicine) => sum + (medicine.price * medicine.quantity), 0);
    this.finalAmount = this.totalAmount - this.discount;
  }
  next();
});

// Method to update status and timestamps
pharmacyOrderSchema.methods.updateStatus = function(newStatus, updatedBy, reason = '') {
  this.status = newStatus;
  
  switch (newStatus) {
    case 'confirmed':
      this.estimatedReadyTime = new Date(Date.now() + this.preparationTime * 60 * 1000);
      break;
    case 'ready':
      this.actualReadyTime = new Date();
      break;
    case 'delivered':
      if (this.deliveryOption === 'delivery') {
        this.deliveryDetails.actualDelivery = new Date();
      }
      break;
    case 'cancelled':
      this.cancellationReason = reason;
      this.cancelledBy = updatedBy;
      this.cancelledAt = new Date();
      break;
  }
  
  return this.save();
};

// Method to add notification
pharmacyOrderSchema.methods.addNotification = function(type, message) {
  this.notifications.push({
    type,
    message,
    sentAt: new Date()
  });
  return this.save();
};

// Method to check if order can be cancelled
pharmacyOrderSchema.methods.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.status);
};

// Method to check if order is ready
pharmacyOrderSchema.methods.isReady = function() {
  return ['ready', 'dispatched', 'delivered'].includes(this.status);
};

module.exports = mongoose.model('PharmacyOrder', pharmacyOrderSchema);
