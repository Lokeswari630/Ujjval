const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  createEmergencyTicket,
  getDoctorEmergencyFeed,
  updateEmergencyTicketStatus
} = require('../controllers/emergencyTicketsController');

const router = express.Router();

router.use(protect);

router.post('/', authorize('patient'), createEmergencyTicket);
router.get('/doctor-feed', authorize('doctor'), getDoctorEmergencyFeed);
router.patch('/:id/status', authorize('doctor'), updateEmergencyTicketStatus);

module.exports = router;
