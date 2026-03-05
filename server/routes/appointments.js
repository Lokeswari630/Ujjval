const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { validateAppointmentBooking } = require('../middleware/validation');
const {
  getAppointments,
  getAppointmentById,
  bookAppointment,
  initiateAppointmentPayment,
  confirmAppointmentPayment,
  updateAppointmentStatus,
  startVideoConsultation,
  addPrescription,
  addDiagnosis,
  rateAppointment,
  getAppointmentStats
} = require('../controllers/appointmentsController');

const router = express.Router();

router.use(protect);

router.get('/', getAppointments);
router.get('/stats/overview', authorize('admin'), getAppointmentStats);
router.get('/:id', getAppointmentById);
router.post('/', authorize('patient'), validateAppointmentBooking, bookAppointment);
router.post('/:id/payment/initiate', authorize('patient'), initiateAppointmentPayment);
router.post('/:id/payment/confirm', authorize('patient'), confirmAppointmentPayment);
router.patch('/:id/status', updateAppointmentStatus);
router.post('/:id/video/start', authorize('doctor'), startVideoConsultation);
router.post('/:id/prescription', authorize('doctor'), addPrescription);
router.patch('/:id/diagnosis', authorize('doctor'), addDiagnosis);
router.post('/:id/rating', authorize('patient'), rateAppointment);

module.exports = router;
