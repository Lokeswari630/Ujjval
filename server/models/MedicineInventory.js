const mongoose = require('mongoose');

const medicineInventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  genericName: {
    type: String,
    trim: true,
    index: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'antibiotics', 'pain_relief', 'cardiovascular', 'respiratory',
      'gastrointestinal', 'dermatological', 'endocrine', 'neurological',
      'vitamins', 'emergency', 'chronic', 'pediatric'
    ],
    required: true
  },
  dosage: {
    type: String,
    required: true
  },
  form: {
    type: String,
    enum: ['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'inhaler', 'drops'],
    required: true
  },
  packageSize: {
    type: Number,
    required: true,
    min: 1
  },
  unit: {
    type: String,
    enum: ['tablets', 'capsules', 'ml', 'mg', 'g', 'pieces'],
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  costPrice: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  minStockLevel: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  maxStockLevel: {
    type: Number,
    required: true,
    min: 0,
    default: 100
  },
  location: {
    type: String,
    trim: true
  },
  batchNumber: {
    type: String,
    trim: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  manufacturer: {
    type: String,
    trim: true
  },
  requiresPrescription: {
    type: Boolean,
    default: true
  },
  controlledSubstance: {
    type: Boolean,
    default: false
  },
  storageConditions: {
    temperature: String,
    humidity: String,
    light: String
  },
  sideEffects: [{
    type: String,
    trim: true
  }],
  contraindications: [{
    type: String,
    trim: true
  }],
  alternatives: [{
    name: String,
    brand: String,
    price: Number,
    reason: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isFastMoving: {
    type: Boolean,
    default: false
  },
  priorityLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  lastRestocked: {
    type: Date,
    default: Date.now
  },
  supplier: {
    name: String,
    contact: String,
    email: String,
    phone: String,
    leadTime: Number // days
  }
}, {
  timestamps: true
});

// Indexes for better query performance
medicineInventorySchema.index({ name: 1, brand: 1 });
medicineInventorySchema.index({ category: 1 });
medicineInventorySchema.index({ stock: 1 });
medicineInventorySchema.index({ expiryDate: 1 });
medicineInventorySchema.index({ isActive: 1 });

// Virtual for stock status
medicineInventorySchema.virtual('stockStatus').get(function() {
  if (this.stock <= this.minStockLevel) return 'critical';
  if (this.stock <= this.minStockLevel * 2) return 'low';
  if (this.stock >= this.maxStockLevel) return 'overstock';
  return 'normal';
});

// Virtual for days to expiry
medicineInventorySchema.virtual('daysToExpiry').get(function() {
  const now = new Date();
  const diffTime = this.expiryDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for profit margin
medicineInventorySchema.virtual('profitMargin').get(function() {
  if (this.price > 0) {
    return ((this.price - this.costPrice) / this.price * 100).toFixed(2);
  }
  return 0;
});

// Pre-save middleware for expiry alerts
medicineInventorySchema.pre('save', function(next) {
  if (this.isModified('stock')) {
    // Check if stock is below minimum level
    if (this.stock <= this.minStockLevel) {
      console.log(`⚠️ Low stock alert: ${this.name} (${this.stock} remaining)`);
    }
  }
  
  // Check if medicine is expiring soon
  const daysToExpiry = this.daysToExpiry;
  if (daysToExpiry <= 30) {
    console.log(`⚠️ Expiry alert: ${this.name} expires in ${daysToExpiry} days`);
  }
  
  next();
});

// Static methods for inventory management
medicineInventorySchema.statics = {
  // Get low stock medicines
  async getLowStock() {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return this.find({
      isActive: true,
      $or: [
        // Stock at or below configured minimum level
        { $expr: { $lte: ['$stock', '$minStockLevel'] } },
        // Or expiring within the next 30 days
        { expiryDate: { $lte: thirtyDaysFromNow } }
      ]
    });
  },

  // Get fast moving medicines
  async getFastMoving() {
    return this.find({ isFastMoving: true, isActive: true });
  },

  // Get medicines by category
  async getByCategory(category) {
    return this.find({ category, isActive: true });
  },

  // Update stock levels
  async updateStock(medicineId, quantity, operation = 'subtract') {
    const medicine = await this.findById(medicineId);
    if (!medicine) throw new Error('Medicine not found');

    if (operation === 'subtract') {
      medicine.stock = Math.max(0, medicine.stock - quantity);
    } else if (operation === 'add') {
      medicine.stock += quantity;
    }

    return medicine.save();
  }
};

module.exports = mongoose.model('MedicineInventory', medicineInventorySchema);