const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  createEmergencyTicket,
  getDoctorEmergencyFeed
} = require('../controllers/emergencyTicketsController');

const router = express.Router();

router.use(protect);

router.post('/', authorize('patient'), createEmergencyTicket);
router.get('/doctor-feed', authorize('doctor'), getDoctorEmergencyFeed);

module.exports = router;
