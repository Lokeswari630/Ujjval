const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const appointmentPrioritizer = require('../services/appointmentPrioritizer');

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Get prioritized doctor queue
// @route   GET /api/priority/doctor/:doctorId/queue
// @access  Private (Doctor/Admin)
router.get('/doctor/:doctorId/queue', authorize('doctor', 'admin'), async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    // Check if user is the doctor or admin
    if (req.user.role === 'doctor') {
      const Doctor = require('../models/Doctor');
      const doctor = await Doctor.findOne({ userId: req.user.id });
      
      if (!doctor || doctor._id.toString() !== doctorId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const queueDate = date ? new Date(date) : new Date();
    const queue = await appointmentPrioritizer.getDoctorQueue(doctorId, queueDate);

    res.status(200).json({
      success: true,
      data: queue
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Calculate priority score for appointment
// @route   POST /api/priority/calculate/:appointmentId
// @access  Private (Admin/Doctor)
router.post('/calculate/:appointmentId', authorize('admin', 'doctor'), async (req, res, next) => {
  try {
    const { appointmentId } = req.params;

    // Check if doctor owns this appointment
    if (req.user.role === 'doctor') {
      const Doctor = require('../models/Doctor');
      const doctor = await Doctor.findOne({ userId: req.user.id });
      
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor profile not found'
        });
      }

      const Appointment = require('../models/Appointment');
      const appointment = await Appointment.findById(appointmentId);
      
      if (!appointment || appointment.doctorId.toString() !== doctor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const priorityData = await appointmentPrioritizer.calculatePriorityScore(appointmentId);

    res.status(200).json({
      success: true,
      data: priorityData
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Auto-prioritize all appointments for today
// @route   POST /api/priority/auto-prioritize
// @access  Private (Admin)
router.post('/auto-prioritize', authorize('admin'), async (req, res, next) => {
  try {
    const results = await appointmentPrioritizer.autoPrioritizeTodayAppointments();

    res.status(200).json({
      success: true,
      message: 'Auto-prioritization completed',
      data: results
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get priority statistics
// @route   GET /api/priority/stats
// @access  Private (Admin)
router.get('/stats', authorize('admin'), async (req, res, next) => {
  try {
    const Appointment = require('../models/Appointment');
    
    const stats = await Appointment.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalAppointments = await Appointment.countDocuments();
    
    const priorityDistribution = {
      total: totalAppointments,
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0
      }
    };

    stats.forEach(stat => {
      priorityDistribution.byPriority[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      data: priorityDistribution
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
