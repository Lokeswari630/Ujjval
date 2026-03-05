const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 50 })
    .withMessage('Name cannot exceed 50 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please enter a valid 10-digit phone number'),
  
  body('role')
    .isIn(['patient', 'doctor', 'admin', 'pharmacist'])
    .withMessage('Invalid role specified'),
  
  body('age')
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage('Age must be between 0 and 150'),
  
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Invalid gender specified'),
  
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Doctor profile validation
const validateDoctorProfile = [
  body('specialization')
    .isIn([
      'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Dermatology',
      'Gynecology', 'Psychiatry', 'General Medicine', 'ENT', 'Ophthalmology',
      'Dentistry', 'Urology', 'Gastroenterology', 'Endocrinology', 'Pulmonology',
      'Nephrology', 'Rheumatology', 'Oncology', 'Anesthesiology', 'Radiology'
    ])
    .withMessage('Invalid specialization'),
  
  body('experience')
    .isInt({ min: 0 })
    .withMessage('Experience must be a non-negative integer'),
  
  body('licenseNumber')
    .notEmpty()
    .withMessage('License number is required'),
  
  body('consultationFee')
    .isFloat({ min: 0 })
    .withMessage('Consultation fee must be a positive number'),
  
  body('qualifications')
    .isArray({ min: 1 })
    .withMessage('At least one qualification is required'),
  
  body('qualifications.*.degree')
    .notEmpty()
    .withMessage('Degree is required for each qualification'),
  
  body('qualifications.*.institution')
    .notEmpty()
    .withMessage('Institution is required for each qualification'),
  
  body('qualifications.*.year')
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Invalid year for qualification'),
  
  handleValidationErrors
];

// Appointment booking validation
const validateAppointmentBooking = [
  body('doctorId')
    .isMongoId()
    .withMessage('Invalid doctor ID'),
  
  body('date')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) {
        throw new Error('Appointment date cannot be in the past');
      }
      return true;
    }),
  
  body('startTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid start time format (HH:MM)'),
  
  body('endTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid end time format (HH:MM)'),
  
  body('type')
    .isIn(['consultation', 'follow_up', 'emergency', 'check_up'])
    .withMessage('Invalid appointment type'),
  
  body('symptoms')
    .optional()
    .isArray()
    .withMessage('Symptoms must be an array'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  handleValidationErrors
];

// Password update validation
const validatePasswordUpdate = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateDoctorProfile,
  validateAppointmentBooking,
  validatePasswordUpdate,
  handleValidationErrors
};
