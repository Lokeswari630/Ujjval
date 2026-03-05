 const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { validateDoctorProfile } = require('../middleware/validation');
const {
  getDoctors,
  getDoctorBookingOptions,
  getMyDoctorProfile,
  getDoctorById,
  createDoctorProfile,
  updateDoctorProfile,
  updateDoctorAvailability,
  addDoctorTimeSlots,
  getDoctorTimeSlots,
  verifyDoctor,
  getDoctorStats
} = require('../controllers/doctorsController');

const router = express.Router();

router.use(protect);

router.get('/', getDoctors);
router.get('/booking/options', getDoctorBookingOptions);
router.get('/profile/me', authorize('doctor'), getMyDoctorProfile);
router.get('/:id', getDoctorById);
router.post('/', authorize('doctor'), validateDoctorProfile, createDoctorProfile);
router.put('/:id', authorize('doctor', 'admin'), updateDoctorProfile);
router.put('/:id/availability', authorize('doctor'), updateDoctorAvailability);
router.post('/:id/timeslots', authorize('doctor'), addDoctorTimeSlots);
router.get('/:id/timeslots', getDoctorTimeSlots);
router.patch('/:id/verify', authorize('admin'), verifyDoctor);
router.get('/stats/overview', authorize('admin'), getDoctorStats);

module.exports = router;
