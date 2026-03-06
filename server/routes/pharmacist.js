const express = require('express');
const PharmacyOrder = require('../models/PharmacyOrder');
const MedicineInventory = require('../models/MedicineInventory');
const { protect, authorize } = require('../middleware/auth');
const pharmacyPrioritizer = require('../services/pharmacyPrioritizer');

const router = express.Router();

const resolveUserId = (user) => String(user?._id || user?.id || '');

// All routes are protected
router.use(protect);

// @desc    Get enhanced pharmacist dashboard
// @route   GET /api/pharmacist/dashboard
// @access  Private (Pharmacist only)
router.get('/dashboard', authorize('pharmacist'), async (req, res, next) => {
  try {
    const pharmacistId = resolveUserId(req.user);

    // Get today's priority queue
    let priorityQueue = { queue: [], summary: {}, alerts: [] };
    try {
      priorityQueue = await pharmacyPrioritizer.getEnhancedPriorityQueue();
    } catch (priorityError) {
      // Keep dashboard available even if prioritization fails for some legacy records.
      console.error('Priority queue generation failed:', priorityError?.message || priorityError);
    }

    // Get pharmacist's assigned orders
    const assignedOrders = await PharmacyOrder.find({
      $or: [
        { assignedPharmacist: pharmacistId },
        { 'notes.addedBy': pharmacistId }
      ],
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'dispatched', 'delivered'] }
    }).populate('patientId', 'name phone')
      .populate('prescriptionId', 'prescriptionFiles prescription.medicines')
      .populate('doctorId', 'userId specialization')
      .sort({ updatedAt: -1, createdAt: -1 });

    // Get low stock alerts with current units
    const lowStockMedicines = await MedicineInventory.getLowStock();

    // Get today's statistics
    const todayStats = await getPharmacistStats(pharmacistId);

    res.status(200).json({
      success: true,
      data: {
        priorityQueue,
        assignedOrders,
        lowStockAlerts: lowStockMedicines.map(med => ({
          name: med.name,
          stock: med.stock,
          currentUnits: med.stock,
          minLevel: med.minStockLevel,
          status: med.stockStatus
        })),
        stats: todayStats,
        alerts: priorityQueue.alerts
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get enhanced pharmacy queue with prioritization
// @route   GET /api/pharmacist/queue
// @access  Private (Pharmacist only)
router.get('/queue', authorize('pharmacist'), async (req, res, next) => {
  try {
    const { status, priority } = req.query;

    // Get prioritized queue
    const queue = await pharmacyPrioritizer.getEnhancedPriorityQueue();

    // Filter by status if specified
    let filteredQueue = queue.queue;
    if (status && status !== 'all') {
      filteredQueue = queue.queue.filter(order => 
        order.status === status || (order.status === 'pending' && status === 'confirmed')
      );
    }

    // Filter by priority if specified
    if (priority && priority !== 'all') {
      filteredQueue = filteredQueue.filter(order => order.priority === priority);
    }

    res.status(200).json({
      success: true,
      data: {
        queue: filteredQueue,
        summary: queue.summary,
        alerts: queue.alerts,
        filters: { status, priority }
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Assign order to pharmacist
// @route   PATCH /api/pharmacist/orders/:id/assign
// @access  Private (Pharmacist only)
router.patch('/orders/:id/assign', authorize('pharmacist'), async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const pharmacistId = resolveUserId(req.user);

    const order = await PharmacyOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.assignedPharmacist) {
      return res.status(400).json({
        success: false,
        message: 'Order already assigned to pharmacist'
      });
    }

    // Assign order to pharmacist
    order.assignedPharmacist = pharmacistId;
    order.status = 'confirmed';
    await order.save();

    // Recalculate priority after assignment
    const priorityData = await pharmacyPrioritizer.calculatePharmacyPriority(orderId);

    const updatedOrder = await PharmacyOrder.findById(orderId)
      .populate('patientId', 'name phone age')
      .populate('doctorId', 'userId specialization')
      .populate('assignedPharmacist', 'name');

    res.status(200).json({
      success: true,
      message: 'Order assigned successfully',
      data: {
        ...updatedOrder.toObject(),
        priority: priorityData
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Start order preparation
// @route   PATCH /api/pharmacist/orders/:id/start-preparation
// @access  Private (Pharmacist only)
router.patch('/orders/:id/start-preparation', authorize('pharmacist'), async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const pharmacistId = resolveUserId(req.user);

    const order = await PharmacyOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify pharmacist is assigned to this order
    if (order.assignedPharmacist?.toString() !== pharmacistId) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this order'
      });
    }

    // Check medicine availability
    const availabilityCheck = await checkMedicineAvailability(order.medicines);
    if (!availabilityCheck.allAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Some medicines are not available',
        unavailableMedicines: availabilityCheck.unavailableMedicines
      });
    }

    // Start preparation
    order.status = 'preparing';
    order.estimatedReadyTime = new Date(Date.now() + order.preparationTime * 60 * 1000);
    await order.save();

    // Update inventory (reserve medicines)
    await updateMedicineInventory(order.medicines, 'reserve');

    const updatedOrder = await PharmacyOrder.findById(orderId)
      .populate('patientId', 'name phone')
      .populate('assignedPharmacist', 'name');

    res.status(200).json({
      success: true,
      message: 'Order preparation started',
      data: updatedOrder
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Complete order preparation
// @route   PATCH /api/pharmacist/orders/:id/complete-preparation
// @access  Private (Pharmacist only)
router.patch('/orders/:id/complete-preparation', authorize('pharmacist'), async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const pharmacistId = resolveUserId(req.user);
    const { notes, qualityCheckPassed } = req.body;

    const order = await PharmacyOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify pharmacist is assigned to this order
    if (order.assignedPharmacist?.toString() !== pharmacistId) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this order'
      });
    }

    // Add preparation notes
    if (notes) {
      order.notes.push({
        text: notes,
        addedBy: pharmacistId,
        addedAt: new Date()
      });
    }

    // Complete preparation and mark as completed for store pickup.
    order.status = 'completed';
    order.actualReadyTime = new Date();

    // Quality check
    if (typeof qualityCheckPassed === 'boolean') {
      order.qualityCheck = {
        checkedBy: pharmacistId,
        checkedAt: new Date(),
        verified: qualityCheckPassed,
        comments: qualityCheckPassed ? 'Quality check passed' : 'Quality check failed'
      };
    }

    await order.save();

    // Send notification to patient
    await sendPatientNotification(order, 'completed');

    const updatedOrder = await PharmacyOrder.findById(orderId)
      .populate('patientId', 'name phone')
      .populate('assignedPharmacist', 'name');

    res.status(200).json({
      success: true,
      message: 'Order preparation completed',
      data: updatedOrder
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Handle order pickup/delivery
// @route   PATCH /api/pharmacist/orders/:id/dispatch
// @access  Private (Pharmacist only)
router.patch('/orders/:id/dispatch', authorize('pharmacist'), async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const pharmacistId = resolveUserId(req.user);
    const { dispatchType, recipientName, recipientPhone, deliveryPartner } = req.body;

    const order = await PharmacyOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!['ready', 'completed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order must be completed before dispatch'
      });
    }

    if (order.assignedPharmacist?.toString() !== pharmacistId) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this order'
      });
    }

    const resolvedDispatchType = dispatchType === 'delivery' ? 'delivery' : 'pickup';
    const resolvedRecipientName = String(recipientName || order?.patientDetails?.name || 'Patient').trim();
    const resolvedRecipientPhone = String(recipientPhone || order?.patientDetails?.phone || 'Not provided').trim();

    // Update inventory (deduct medicines)
    await updateMedicineInventory(order.medicines, 'deduct');

    // Handle dispatch
    order.status = resolvedDispatchType === 'delivery' ? 'dispatched' : 'delivered';
    
    if (resolvedDispatchType === 'delivery') {
      order.deliveryDetails = {
        partner: deliveryPartner || 'Internal Delivery',
        trackingId: 'DEL' + Date.now(),
        estimatedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
        deliveryFee: 50
      };
    }

    // Add dispatch notes
    order.notes.push({
      text: `Order ${resolvedDispatchType === 'delivery' ? 'dispatched to' : 'picked up by'} ${resolvedRecipientName} (${resolvedRecipientPhone})`,
      addedBy: pharmacistId,
      addedAt: new Date()
    });

    await order.save();

    // Send final notification
    await sendPatientNotification(order, resolvedDispatchType);

    const updatedOrder = await PharmacyOrder.findById(orderId)
      .populate('patientId', 'name phone')
      .populate('assignedPharmacist', 'name');

    res.status(200).json({
      success: true,
      message: `Order ${resolvedDispatchType === 'delivery' ? 'dispatched' : 'delivered'} successfully`,
      data: updatedOrder
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get medicine inventory
// @route   GET /api/pharmacist/inventory
// @access  Private (Pharmacist only)
router.get('/inventory', authorize('pharmacist'), async (req, res, next) => {
  try {
    const { category, lowStock, expiring } = req.query;

    let query = { isActive: true };

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by low stock
    if (lowStock === 'true') {
      query.$expr = {
        $lte: ['$stock', '$minStockLevel']
      };
    }

    // Filter by expiring medicines
    if (expiring === 'true') {
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      query.expiryDate = { $lte: thirtyDaysFromNow };
    }

    const medicines = await MedicineInventory.find(query)
      .sort({ stock: 1, expiryDate: 1 });

    // Get inventory summary
    const summary = await getInventorySummary();

    res.status(200).json({
      success: true,
      data: {
        medicines,
        summary,
        filters: { category, lowStock, expiring }
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Add new medicine to inventory
// @route   POST /api/pharmacist/inventory
// @access  Private (Pharmacist only)
router.post('/inventory', authorize('pharmacist'), async (req, res, next) => {
  try {
    const {
      name,
      stock,
      minStockLevel,
      brand = 'Generic',
      category = 'general',
      dosage = 'Standard',
      form = 'tablet',
      packageSize = 1,
      unit = 'tablets',
      price = 0
    } = req.body;

    if (!name || !stock || !minStockLevel) {
      return res.status(400).json({
        success: false,
        message: 'Name, stock, and minimum stock level are required'
      });
    }

    // Check if medicine already exists
    const existingMedicine = await MedicineInventory.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isActive: true 
    });

    if (existingMedicine) {
      return res.status(400).json({
        success: false,
        message: 'Medicine with this name already exists in inventory'
      });
    }

    // Map category to valid enum value
    const categoryMap = {
      'general': 'pain_relief',
      'antibiotics': 'antibiotics',
      'pain': 'pain_relief',
      'cardio': 'cardiovascular',
      'respiratory': 'respiratory',
      'gi': 'gastrointestinal',
      'skin': 'dermatological',
      'diabetes': 'endocrine',
      'neuro': 'neurological',
      'vitamins': 'vitamins',
      'emergency': 'emergency',
      'chronic': 'chronic',
      'pediatric': 'pediatric'
    };

    const validCategory = categoryMap[category.toLowerCase()] || 'pain_relief';

    // Calculate expiry date (2 years from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 2);

    const medicine = await MedicineInventory.create({
      name,
      stock: Number(stock),
      minStockLevel: Number(minStockLevel),
      maxStockLevel: Number(minStockLevel) * 10, // Default max stock = 10x min stock
      brand: brand || 'Generic',
      category: validCategory,
      dosage: dosage || 'Standard',
      form: form || 'tablet',
      packageSize: Number(packageSize) || 1,
      unit: unit || 'tablets',
      price: Number(price) || 0,
      costPrice: Number(price) * 0.7 || 0, // Default cost price = 70% of selling price
      expiryDate: expiryDate,
      isActive: true,
      lastRestocked: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Medicine added to inventory successfully',
      data: medicine
    });
  } catch (error) {
    console.error('Error adding medicine:', error);
    next(error);
  }
});

// @desc    Update medicine stock
// @route   PATCH /api/pharmacist/inventory/:id/stock
// @access  Private (Pharmacist only)
router.patch('/inventory/:id/stock', authorize('pharmacist'), async (req, res, next) => {
  try {
    const medicineId = req.params.id;
    const { quantity, operation, reason } = req.body;

    if (!quantity || !operation) {
      return res.status(400).json({
        success: false,
        message: 'Quantity and operation are required'
      });
    }

    const medicine = await MedicineInventory.findByIdAndUpdate(
      medicineId,
      {
        $inc: { stock: operation === 'add' ? quantity : -quantity },
        lastRestocked: operation === 'add' ? new Date() : undefined
      },
      { new: true, runValidators: true }
    );

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }

    // Add stock adjustment record
    await addStockAdjustmentRecord(medicineId, quantity, operation, reason, resolveUserId(req.user));

    res.status(200).json({
      success: true,
      message: `Stock ${operation === 'add' ? 'added' : 'deducted'} successfully`,
      data: medicine
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get pharmacist performance metrics
// @route   GET /api/pharmacist/performance
// @access  Private (Pharmacist only)
router.get('/performance', authorize('pharmacist'), async (req, res, next) => {
  try {
    const pharmacistId = resolveUserId(req.user);
    const { period = 'today' } = req.query;

    const performance = await getPharmacistPerformance(pharmacistId, period);

    res.status(200).json({
      success: true,
      data: performance
    });

  } catch (error) {
    next(error);
  }
});

// Helper functions
async function checkMedicineAvailability(medicines) {
  const unavailableMedicines = [];
  let allAvailable = true;

  const IMAGE_REVIEW_PLACEHOLDER = 'Prescription Image Review Required';

  for (const medicine of medicines) {
    // Image-only prescription flow uses this placeholder and requires manual pharmacist verification.
    if (String(medicine?.name || '').trim().toLowerCase() === IMAGE_REVIEW_PLACEHOLDER.toLowerCase()) {
      continue;
    }

    const inventory = await MedicineInventory.findOne({
      name: { $regex: medicine.name, $options: 'i' },
      isActive: true
    });

    if (!inventory || inventory.stock < medicine.quantity) {
      unavailableMedicines.push({
        name: medicine.name,
        requested: medicine.quantity,
        available: inventory ? inventory.stock : 0
      });
      allAvailable = false;
    }
  }

  return { allAvailable, unavailableMedicines };
}

async function updateMedicineInventory(medicines, operation) {
  for (const medicine of medicines) {
    const inventory = await MedicineInventory.findOne({
      name: { $regex: medicine.name, $options: 'i' },
      isActive: true
    });

    if (inventory) {
      const quantityChange = operation === 'reserve' ? medicine.quantity : -medicine.quantity;
      await MedicineInventory.findByIdAndUpdate(
        inventory._id,
        { $inc: { stock: quantityChange } }
      );
    }
  }
}

async function sendPatientNotification(order, type) {
  // Mock notification - would integrate with SMS/email service
  console.log(`📱 Notification sent to patient: Order ${order.orderId} is ${type}`);
  
  order.notifications.push({
    type: 'sms',
    message: `Your medicine order ${order.orderId} is ${
      type === 'completed'
        ? 'completed. The medicines are packed..came and take the order.'
        : type === 'ready'
          ? 'ready for pickup'
          : type === 'delivery'
            ? 'out for delivery'
            : 'delivered'
    }`,
    sentAt: new Date(),
    status: 'sent'
  });

  await order.save();
}

async function getPharmacistStats(pharmacistId, period) {
  const dateFilter = getDateFilter(period);
  
  const orders = await PharmacyOrder.find({
    $or: [
      { assignedPharmacist: pharmacistId },
      { 'notes.addedBy': pharmacistId }
    ],
    createdAt: dateFilter
  });

  return {
    totalOrders: orders.length,
    completedOrders: orders.filter(o => ['completed', 'delivered'].includes(o.status)).length,
    revenue: orders
      .filter(o => ['completed', 'delivered'].includes(o.status))
      .reduce((sum, o) => sum + (Number(o.finalAmount) || 0), 0),
    averagePrepTime: orders.length > 0 ? 
      Math.round(orders.reduce((sum, o) => sum + o.preparationTime, 0) / orders.length) : 0,
    priorityDistribution: {
      urgent: orders.filter(o => o.priority === 'urgent').length,
      high: orders.filter(o => o.priority === 'high').length,
      medium: orders.filter(o => o.priority === 'medium').length,
      low: orders.filter(o => o.priority === 'low').length
    }
  };
}

async function getInventorySummary() {
  const total = await MedicineInventory.countDocuments({ isActive: true });
  const lowStock = await MedicineInventory.countDocuments({
    isActive: true,
    $expr: { $lte: ['$stock', '$minStockLevel'] }
  });
  const expiring = await MedicineInventory.countDocuments({
    isActive: true,
    expiryDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
  });

  return {
    totalMedicines: total,
    lowStockItems: lowStock,
    expiringItems: expiring,
    totalValue: await MedicineInventory.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalValue: { $sum: { $multiply: ['$stock', '$price'] } } } }
    ])
  };
}

function getDateFilter(period) {
  const now = new Date();
  switch (period) {
    case 'today':
      return {
        $gte: new Date(now.setHours(0, 0, 0, 0)),
        $lte: new Date(now.setHours(23, 59, 59, 999))
      };
    case 'week':
      return {
        $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      };
    case 'month':
      return {
        $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      };
    default:
      return {};
  }
}

async function addStockAdjustmentRecord(medicineId, quantity, operation, reason, pharmacistId) {
  // This would create a stock adjustment log
  console.log(`Stock adjustment: ${medicineId} ${operation} ${quantity} - ${reason}`);
}

async function getPharmacistPerformance(pharmacistId, period) {
  const dateFilter = getDateFilter(period);
  
  const orders = await PharmacyOrder.find({
    $or: [
      { assignedPharmacist: pharmacistId },
      { 'notes.addedBy': pharmacistId }
    ],
    createdAt: dateFilter
  });

  const completedOrders = orders.filter(o => ['completed', 'delivered'].includes(o.status));
  
  return {
    period,
    totalOrders: orders.length,
    completedOrders: completedOrders.length,
    completionRate: orders.length > 0 ? (completedOrders.length / orders.length * 100).toFixed(1) : 0,
    averagePrepTime: completedOrders.length > 0 ? 
      Math.round(completedOrders.reduce((sum, o) => sum + o.preparationTime, 0) / completedOrders.length) : 0,
    totalRevenue: completedOrders.reduce((sum, o) => sum + o.finalAmount, 0),
    qualityCheckPassRate: completedOrders.filter(o => 
      o.qualityCheck && o.qualityCheck.verified
    ).length / (completedOrders.length || 1) * 100
  };
}

module.exports = router;