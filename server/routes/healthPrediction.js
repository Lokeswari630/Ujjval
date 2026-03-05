const express = require('express');
const HealthPrediction = require('../models/HealthPrediction');
const { protect, authorize } = require('../middleware/auth');
const aiHealthPredictor = require('../services/aiHealthPredictor');
const medicalReportExplainer = require('../services/medicalReportExplainer');

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Create health prediction
// @route   POST /api/health-prediction/predict
// @access  Private (Patient only)
router.post('/predict', authorize('patient'), async (req, res, next) => {
  try {
    const {
      symptoms,
      age,
      gender,
      lifestyleFactors,
      vitalSigns
    } = req.body;

    // Validate required fields
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Symptoms are required and must be an array'
      });
    }

    if (!age || !gender) {
      return res.status(400).json({
        success: false,
        message: 'Age and gender are required'
      });
    }

    // Get AI analysis
    const patientData = {
      symptoms,
      age,
      gender,
      lifestyleFactors: lifestyleFactors || {
        smoking: 'never',
        alcohol: 'occasional',
        exercise: 'moderate',
        diet: 'average',
        stress: 'moderate'
      },
      vitalSigns: vitalSigns || {}
    };

    const aiAnalysis = await aiHealthPredictor.predictHealthRisk(patientData);

    // Create health prediction record
    const healthPrediction = await HealthPrediction.create({
      patientId: req.user.id,
      symptoms,
      age,
      gender,
      lifestyleFactors: patientData.lifestyleFactors,
      vitalSigns: patientData.vitalSigns,
      aiAnalysis
    });

    const populatedPrediction = await HealthPrediction.findById(healthPrediction._id)
      .populate('patientId', 'name email phone age gender');

    res.status(201).json({
      success: true,
      message: 'Health prediction completed successfully',
      data: populatedPrediction
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get patient's health predictions
// @route   GET /api/health-prediction/my-predictions
// @access  Private (Patient only)
router.get('/my-predictions', authorize('patient'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const predictions = await HealthPrediction.find({ patientId: req.user.id })
      .sort({ predictionDate: -1 })
      .skip(startIndex)
      .limit(limit);

    const total = await HealthPrediction.countDocuments({ patientId: req.user.id });

    res.status(200).json({
      success: true,
      data: predictions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Explain medical report in simple language
// @route   POST /api/health-prediction/explain-report
// @access  Private
router.post('/explain-report', async (req, res, next) => {
  try {
    const { reportText } = req.body;

    if (!reportText || typeof reportText !== 'string' || reportText.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'reportText is required and must be a meaningful string'
      });
    }

    const explanation = medicalReportExplainer.explain(reportText);

    res.status(200).json({
      success: true,
      data: explanation
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single health prediction
// @route   GET /api/health-prediction/:id
// @access  Private
router.get('/:id', async (req, res, next) => {
  try {
    const prediction = await HealthPrediction.findById(req.params.id)
      .populate('patientId', 'name email phone age gender')
      .populate('reviewedByDoctor', 'userId specialization')
      .populate({
        path: 'reviewedByDoctor',
        populate: {
          path: 'userId',
          select: 'name email phone'
        }
      });

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Health prediction not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'patient' && prediction.patientId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.user.role === 'doctor') {
      // Doctors can view predictions if they have appointments with the patient
      const Appointment = require('../models/Appointment');
      const hasAppointment = await Appointment.findOne({
        doctorId: req.user.id,
        patientId: prediction.patientId._id
      });

      if (!hasAppointment) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - No appointment found with this patient'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: prediction
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Update health prediction (Doctor review)
// @route   PATCH /api/health-prediction/:id/review
// @access  Private (Doctor only)
router.patch('/:id/review', authorize('doctor'), async (req, res, next) => {
  try {
    const { doctorNotes, isConfirmed } = req.body;

    const prediction = await HealthPrediction.findById(req.params.id);

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Health prediction not found'
      });
    }

    // Get doctor profile
    const Doctor = require('../models/Doctor');
    const doctor = await Doctor.findOne({ userId: req.user.id });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Update prediction with doctor review
    prediction.reviewedByDoctor = doctor._id;
    prediction.doctorNotes = doctorNotes;
    prediction.isConfirmed = isConfirmed;

    if (isConfirmed) {
      prediction.followUpRequired = true;
      prediction.followUpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    }

    await prediction.save();

    const updatedPrediction = await HealthPrediction.findById(prediction._id)
      .populate('patientId', 'name email phone')
      .populate('reviewedByDoctor', 'userId specialization')
      .populate({
        path: 'reviewedByDoctor',
        populate: {
          path: 'userId',
          select: 'name email phone'
        }
      });

    res.status(200).json({
      success: true,
      message: 'Health prediction reviewed successfully',
      data: updatedPrediction
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get health predictions for doctor's patients
// @route   GET /api/health-prediction/doctor/patients
// @access  Private (Doctor only)
router.get('/doctor/patients', authorize('doctor'), async (req, res, next) => {
  try {
    // Get doctor profile
    const Doctor = require('../models/Doctor');
    const doctor = await Doctor.findOne({ userId: req.user.id });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Get doctor's appointments to find patient IDs
    const Appointment = require('../models/Appointment');
    const appointments = await Appointment.find({ doctorId: doctor._id })
      .distinct('patientId');

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Build query
    const query = { patientId: { $in: appointments } };
    
    // Filter by risk level if specified
    if (req.query.riskLevel) {
      query['aiAnalysis.riskLevel'] = req.query.riskLevel;
    }
    
    // Filter by confirmation status if specified
    if (req.query.isConfirmed !== undefined) {
      query.isConfirmed = req.query.isConfirmed === 'true';
    }

    const predictions = await HealthPrediction.find(query)
      .populate('patientId', 'name email phone age gender')
      .populate('reviewedByDoctor', 'userId specialization')
      .sort({ predictionDate: -1 })
      .skip(startIndex)
      .limit(limit);

    const total = await HealthPrediction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: predictions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get high-risk patients (Admin/Doctor)
// @route   GET /api/health-prediction/high-risk
// @access  Private (Admin/Doctor)
router.get('/high-risk', authorize('admin', 'doctor'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Build query for high-risk predictions
    const query = {
      'aiAnalysis.riskLevel': { $in: ['high', 'urgent'] }
    };

    // If doctor, only show their patients
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
      const appointments = await Appointment.find({ doctorId: doctor._id })
        .distinct('patientId');
      
      query.patientId = { $in: appointments };
    }

    const predictions = await HealthPrediction.find(query)
      .populate('patientId', 'name email phone age gender')
      .populate('reviewedByDoctor', 'userId specialization')
      .sort({ 'aiAnalysis.riskScore': -1, predictionDate: -1 })
      .skip(startIndex)
      .limit(limit);

    const total = await HealthPrediction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: predictions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get health prediction statistics (Admin only)
// @route   GET /api/health-prediction/stats
// @access  Private/Admin
router.get('/stats/overview', authorize('admin'), async (req, res, next) => {
  try {
    const totalPredictions = await HealthPrediction.countDocuments();
    
    const byRiskLevel = await HealthPrediction.aggregate([
      {
        $group: {
          _id: '$aiAnalysis.riskLevel',
          count: { $sum: 1 },
          avgScore: { $avg: '$aiAnalysis.riskScore' }
        }
      }
    ]);

    const byUrgency = await HealthPrediction.aggregate([
      {
        $group: {
          _id: '$aiAnalysis.urgencyLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    const bySpecialization = await HealthPrediction.aggregate([
      {
        $group: {
          _id: '$aiAnalysis.suggestedSpecialization',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const recentPredictions = await HealthPrediction.countDocuments({
      predictionDate: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    });

    const confirmedPredictions = await HealthPrediction.countDocuments({
      isConfirmed: true
    });

    res.status(200).json({
      success: true,
      data: {
        total: totalPredictions,
        recent: recentPredictions,
        confirmed: confirmedPredictions,
        confirmationRate: totalPredictions > 0 ? (confirmedPredictions / totalPredictions * 100).toFixed(2) : 0,
        byRiskLevel,
        byUrgency,
        bySpecialization
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get symptom trends (Admin/Doctor)
// @route   GET /api/health-prediction/symptom-trends
// @access  Private (Admin/Doctor)
router.get('/symptom-trends', authorize('admin', 'doctor'), async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const symptomTrends = await HealthPrediction.aggregate([
      {
        $match: {
          predictionDate: { $gte: startDate }
        }
      },
      {
        $unwind: '$symptoms'
      },
      {
        $group: {
          _id: '$symptoms',
          count: { $sum: 1 },
          riskLevels: {
            $push: '$aiAnalysis.riskLevel'
          }
        }
      },
      {
        $addFields: {
          highRiskCount: {
            $size: {
              $filter: {
                input: '$riskLevels',
                cond: { $in: ['$$this', ['high', 'urgent']] }
              }
            }
          }
        }
      },
      {
        $project: {
          symptom: '$_id',
          count: 1,
          highRiskCount: 1,
          riskPercentage: {
            $multiply: [
              { $divide: ['$highRiskCount', '$count'] },
              100
            ]
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: `${days} days`,
        trends: symptomTrends
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
