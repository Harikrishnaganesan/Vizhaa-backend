import otpService from '../services/otpService.js';

class OTPController {
  async sendOTP(req, res) {
    try {
      const { email, phone, purpose } = req.body;
      
      if (!email && !phone) {
        return res.status(400).json({
          success: false,
          message: 'Email or phone number is required'
        });
      }
      
      const contact = phone || email;
      const otp = await otpService.createOTPRecord(email || phone, purpose);
      const sent = await otpService.sendOTP(contact, otp, purpose);
      
      if (!sent) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP. Please try again later.'
        });
      }
      
      res.json({
        success: true,
        message: 'OTP sent successfully'
      });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while sending OTP'
      });
    }
  }

  async verifyOTP(req, res) {
    try {
      const { email, otp, purpose } = req.body;
      
      const verification = await otpService.verifyOTP(email, otp, purpose);
      
      if (!verification.isValid) {
        return res.status(400).json({
          success: false,
          message: verification.message
        });
      }
      
      res.json({
        success: true,
        message: 'OTP verified successfully'
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while verifying OTP'
      });
    }
  }
}

export default new OTPController();