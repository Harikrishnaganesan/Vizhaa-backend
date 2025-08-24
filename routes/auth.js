import express from 'express';
import authController from '../controllers/authController.js';
import { 
  registerValidation, 
  loginValidation, 
  otpValidation 
} from '../middleware/validation.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// OTP-first registration flow
router.post('/send-otp', authController.sendRegistrationOTP);
router.post('/verify-otp', authController.verifyRegistrationOTP);
router.post('/organizer/signup', upload.single('aadharCard'), authController.organizerSignup);
router.post('/supplier/signup', upload.single('aadharCard'), authController.supplierSignup);

// Login
router.post('/login', authController.login);

// Password reset with OTP
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export default router;