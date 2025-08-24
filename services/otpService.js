import axios from 'axios';

class OTPService {
  constructor() {
    this.apiKey = process.env.OTP_API_KEY || '5d0b33bc-7614-11f0-a562-0200cd936042';
    this.baseURL = 'https://2factor.in/API/V1';
  }

  // Send OTP via 2factor.in for verification
  async sendOTP(phone, purpose) {
    try {
      // Remove any non-digit characters from phone
      const cleanPhone = phone.replace(/\D/g, '');
      
      // For Indian numbers, ensure they start with 91
      let formattedPhone = cleanPhone;
      if (cleanPhone.length === 10) {
        formattedPhone = '91' + cleanPhone;
      }

      const template = purpose === 'registration' 
        ? 'Your OTP for registration is {otp}. Valid for 10 minutes.'
        : 'Your OTP for password reset is {otp}. Valid for 10 minutes.';

      const response = await axios.get(
        `${this.baseURL}/${this.apiKey}/SMS/${formattedPhone}/AUTOGEN/${encodeURIComponent(template)}`
      );
      
      console.log('2Factor API Response:', response.data);
      
      if (response.data.Status === 'Success') {
        return {
          success: true,
          message: 'OTP sent successfully',
          sessionId: response.data.Details
        };
      } else {
        throw new Error(response.data.Details || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('2Factor OTP sending failed:', error.message);
      
      // For development/testing, simulate success
      if (process.env.NODE_ENV === 'development') {
        const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`Simulating OTP send: ${testOTP} to ${phone}`);
        return {
          success: true,
          message: 'OTP sent successfully (simulated)',
          sessionId: 'TEST_SESSION_ID',
          otp: testOTP // Only for development
        };
      }
      
      return {
        success: false,
        message: 'Failed to send OTP. Please try again later.'
      };
    }
  }

  // Verify OTP with 2factor.in
  async verifyOTP(sessionId, otp) {
    try {
      const response = await axios.get(
        `${this.baseURL}/${this.apiKey}/SMS/VERIFY/${sessionId}/${otp}`
      );
      
      console.log('2Factor OTP Verification Response:', response.data);
      
      if (response.data.Status === 'Success') {
        return {
          success: true,
          message: 'OTP verified successfully',
          details: response.data.Details
        };
      } else {
        return {
          success: false,
          message: response.data.Details || 'Invalid OTP'
        };
      }
    } catch (error) {
      console.error('2Factor OTP verification failed:', error.message);
      
      // For development/testing, simulate verification
      if (process.env.NODE_ENV === 'development') {
        console.log(`Simulating OTP verification for session: ${sessionId}`);
        return {
          success: true,
          message: 'OTP verified successfully (simulated)'
        };
      }
      
      return {
        success: false,
        message: 'OTP verification failed. Please try again.'
      };
    }
  }
}

// Export as default
export default new OTPService();