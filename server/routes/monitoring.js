const express = require('express');
const VitalReading = require('../models/VitalReading');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

function buildAlerts(reading) {
  const alerts = [];

  if (reading.bloodPressure?.systolic >= 140 || reading.bloodPressure?.diastolic >= 90) {
    alerts.push({ type: 'bloodPressure', severity: 'high', message: 'Blood pressure is above normal range.' });
  }

  if (reading.bloodSugar >= 180 || reading.bloodSugar <= 70) {
    alerts.push({ type: 'bloodSugar', severity: 'high', message: 'Blood sugar is outside safe range.' });
  }

  if (reading.heartRate >= 110 || reading.heartRate <= 50) {
    alerts.push({ type: 'heartRate', severity: 'high', message: 'Heart rate is outside normal resting range.' });
  }

  return alerts;
}

// @desc    Add remote monitoring reading
// @route   POST /api/monitoring/readings
// @access  Private (Patient)
router.post('/readings', authorize('patient'), async (req, res, next) => {
  try {
    const reading = await VitalReading.create({
      patientId: req.user.id,
      bloodPressure: req.body.bloodPressure,
      bloodSugar: req.body.bloodSugar,
      heartRate: req.body.heartRate,
      notes: req.body.notes
    });

    const alerts = buildAlerts(reading);

    res.status(201).json({
      success: true,
      message: 'Reading saved successfully',
      data: reading,
      alerts
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get trend data
// @route   GET /api/monitoring/trends
// @access  Private
router.get('/trends', async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 7;
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const targetPatientId = req.user.role === 'patient' ? req.user.id : req.query.patientId;

    if (!targetPatientId) {
      return res.status(400).json({
        success: false,
        message: 'patientId is required for non-patient roles'
      });
    }

    const readings = await VitalReading.find({
      patientId: targetPatientId,
      recordedAt: { $gte: fromDate }
    }).sort({ recordedAt: 1 });

    const chart = readings.map((item) => ({
      name: new Date(item.recordedAt).toLocaleDateString(),
      bloodSugar: item.bloodSugar,
      heartRate: item.heartRate,
      systolic: item.bloodPressure?.systolic,
      diastolic: item.bloodPressure?.diastolic
    }));

    res.status(200).json({
      success: true,
      data: {
        readings,
        chart
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get abnormal alerts
// @route   GET /api/monitoring/alerts
// @access  Private
router.get('/alerts', async (req, res, next) => {
  try {
    const targetPatientId = req.user.role === 'patient' ? req.user.id : req.query.patientId;

    if (!targetPatientId) {
      return res.status(400).json({
        success: false,
        message: 'patientId is required for non-patient roles'
      });
    }

    const readings = await VitalReading.find({ patientId: targetPatientId })
      .sort({ recordedAt: -1 })
      .limit(20);

    const alerts = readings
      .map((reading) => ({
        readingId: reading._id,
        recordedAt: reading.recordedAt,
        alerts: buildAlerts(reading)
      }))
      .filter((item) => item.alerts.length > 0);

    res.status(200).json({
      success: true,
      data: alerts
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
