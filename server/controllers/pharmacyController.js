const PharmacyOrder = require('../models/PharmacyOrder');
const pharmacyManager = require('../services/pharmacyManager-enhanced');

const createPharmacyOrder = async (req, res, next) => {
  try {
    const { appointmentId, priorityOverride, emergencyPrePack = false } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID is required'
      });
    }

    const order = await pharmacyManager.createOrderFromPrescription(appointmentId, {
      priorityOverride,
      emergencyPrePack: Boolean(emergencyPrePack),
      requestedBy: req.user.id,
      requestedByRole: req.user.role
    });

    res.status(201).json({
      success: true,
      message: 'Pharmacy order created successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

const getPharmacyQueue = async (req, res, next) => {
  try {
    const { status } = req.query;
    const queue = await pharmacyManager.getPharmacyQueue(status);

    res.status(200).json({
      success: true,
      data: queue
    });
  } catch (error) {
    next(error);
  }
};

const updatePharmacyOrderStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;

    if (!['pending', 'confirmed', 'preparing', 'ready', 'completed', 'dispatched', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = await pharmacyManager.updateOrderStatus(
      req.params.id,
      status,
      req.user.id,
      reason
    );

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

const getPharmacyOrderById = async (req, res, next) => {
  try {
    const order = await pharmacyManager.getOrderWithDetails(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (req.user.role === 'patient' && order.patientId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

const getMyPharmacyOrders = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const orders = await pharmacyManager.getPatientOrderHistory(req.user.id, parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

const getPharmacyStats = async (req, res, next) => {
  try {
    const { dateRange = 'today' } = req.query;
    const stats = await pharmacyManager.getPharmacyStats(dateRange);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

const addOrderNote = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Note text is required'
      });
    }

    const order = await PharmacyOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.notes.push({
      text: text.trim(),
      addedBy: req.user.id,
      addedAt: new Date()
    });

    await order.save();

    const updatedOrder = await pharmacyManager.getOrderWithDetails(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

const qualityCheckOrder = async (req, res, next) => {
  try {
    const { verified, comments } = req.body;

    if (typeof verified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Verified status is required'
      });
    }

    const order = await PharmacyOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.qualityCheck = {
      checkedBy: req.user.id,
      checkedAt: new Date(),
      verified,
      comments: comments || ''
    };

    await order.save();

    const updatedOrder = await pharmacyManager.getOrderWithDetails(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Quality check completed',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPharmacyOrder,
  getPharmacyQueue,
  updatePharmacyOrderStatus,
  getPharmacyOrderById,
  getMyPharmacyOrders,
  getPharmacyStats,
  addOrderNote,
  qualityCheckOrder
};
