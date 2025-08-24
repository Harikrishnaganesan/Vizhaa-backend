import { body, validationResult } from 'express-validator';

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

const registerValidation = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('userType')
    .isIn(['organizer', 'supplier'])
    .withMessage('User type must be either organizer or supplier'),
  body('phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  body('gender')
    .optional()
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),
  handleValidationErrors
];

const loginValidation = [
  body('phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const otpValidation = [
  body('phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be 6 digits'),
  handleValidationErrors
];

const resetPasswordValidation = [
  body('phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be 6 digits'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  handleValidationErrors
];

export {
  registerValidation,
  loginValidation,
  otpValidation,
  resetPasswordValidation,
  handleValidationErrors
};