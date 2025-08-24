import express from 'express';
import otpController from '../controllers/otpController.js';
import { otpValidation } from '../middleware/validation.js';

const router = express.Router();

router.post('/send', otpController.sendOTP);
router.post('/verify', otpValidation, otpController.verifyOTP);

export default router;