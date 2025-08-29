import jwt from 'jsonwebtoken';
import userService from '../services/userService.js';
import otpService from '../services/otpService.js';
import OTPSession from '../models/OTP.js';
import { JWT } from '../config/constant.js';
import { USER_TYPES } from '../config/constant.js';

class AuthController {
  // Send OTP for registration
  async sendRegistrationOTP(req, res) {
    try {
      const { phone, userType } = req.body;
      
      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      if (userType && !['organizer', 'supplier'].includes(userType)) {
        return res.status(400).json({
          success: false,
          message: 'User type must be either organizer or supplier'
        });
      }

      // Check if phone is already registered
      const existingUser = await userService.findUserByPhone(phone);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already registered'
        });
      }

      // Send OTP via 2factor.in
      const otpResult = await otpService.sendOTP(phone, 'registration');
      
      if (!otpResult.success) {
        return res.status(500).json({
          success: false,
          message: otpResult.message || 'Failed to send OTP'
        });
      }

      // Delete any existing OTP sessions for this phone
      await OTPSession.deleteMany({ phone, purpose: 'registration' });

      // Save OTP session with userType if provided
      const otpSessionData = {
        phone,
        sessionId: otpResult.sessionId,
        purpose: 'registration',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      };

      if (userType) {
        otpSessionData.userType = userType;
      }

      const otpSession = new OTPSession(otpSessionData);
      await otpSession.save();

      res.json({
        success: true,
        message: 'OTP sent to your mobile number',
        sessionId: otpResult.sessionId,
        // For development only
        ...(process.env.NODE_ENV === 'development' && { otp: otpResult.otp })
      });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while sending OTP'
      });
    }
  }

  // Verify OTP for registration
  async verifyRegistrationOTP(req, res) {
    try {
      const { sessionId, otp, phone } = req.body;
      
      if (!sessionId || !otp || !phone) {
        return res.status(400).json({
          success: false,
          message: 'Session ID, OTP, and phone number are required'
        });
      }

      // Verify OTP with 2factor.in
      const verificationResult = await otpService.verifyOTP(sessionId, otp);
      
      if (!verificationResult.success) {
        return res.status(400).json({
          success: false,
          message: verificationResult.message || 'Invalid OTP'
        });
      }

      // Find OTP session
      const otpSession = await OTPSession.findOne({ 
        sessionId, 
        phone,
        purpose: 'registration' 
      });
      
      if (!otpSession) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP session'
        });
      }

      // Check if OTP is expired
      if (otpSession.expiresAt < new Date()) {
        await OTPSession.deleteOne({ _id: otpSession._id });
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new one.'
        });
      }

      // Mark OTP as verified
      otpSession.isVerified = true;
      otpSession.verifiedAt = new Date();
      await otpSession.save();

      res.json({
        success: true,
        message: 'Phone number verified successfully',
        phoneVerified: true,
        sessionId: sessionId,
        userType: otpSession.userType || null
      });
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error during OTP verification'
      });
    }
  }

  // Complete registration after OTP verification
  async completeRegistration(req, res) {
    try {
      const { 
        sessionId, 
        phone, 
        fullName, 
        email, 
        password, 
        userType, 
        gender, 
        dob, 
        aadharNumber,
        companyName,
        services 
      } = req.body;
      
      // Validate required fields
      if (!sessionId || !phone || !fullName || !email || !password || !userType) {
        return res.status(400).json({
          success: false,
          message: 'Session ID, phone, full name, email, password, and user type are required'
        });
      }

      // Validate userType
      if (!['organizer', 'supplier'].includes(userType)) {
        return res.status(400).json({
          success: false,
          message: 'User type must be either organizer or supplier'
        });
      }

      // Check if OTP session is verified
      const otpSession = await OTPSession.findOne({ 
        sessionId, 
        phone,
        purpose: 'registration',
        isVerified: true 
      });
      
      if (!otpSession) {
        return res.status(400).json({
          success: false,
          message: 'Please verify your phone number with OTP first'
        });
      }

      // Check if OTP is expired
      if (otpSession.expiresAt < new Date()) {
        await OTPSession.deleteOne({ _id: otpSession._id });
        return res.status(400).json({
          success: false,
          message: 'OTP session has expired. Please start registration again.'
        });
      }

      // Check if phone is already registered
      const existingUser = await userService.findUserByPhone(phone);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already registered'
        });
      }

      // Check if email is already registered
      const existingEmail = await userService.findUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }

      // Create user data
      const userData = {
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        password,
        userType,
        phone,
        isVerified: true,
        gender: gender || null,
        dob: dob ? new Date(dob) : null
      };

      // Add user type specific fields
      if (userType === 'organizer') {
        userData.companyName = companyName || null;
      } else if (userType === 'supplier') {
        userData.aadharNumber = aadharNumber || null;
        userData.services = services ? (Array.isArray(services) ? services : services.split(',')) : [];
        userData.isApproved = true; // Allow suppliers to login immediately
      }

      // Handle file upload if present
      if (req.file) {
        userData.aadharCard = req.file.path;
      }

      const user = await userService.createUser(userData);
      
      // Delete OTP session
      await OTPSession.deleteOne({ _id: otpSession._id });

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user._id, 
          userType: user.userType 
        },
        JWT.SECRET,
        { expiresIn: JWT.EXPIRES_IN }
      );

      // Prepare user response data
      const userResponse = {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        isVerified: user.isVerified
      };

      // Add additional fields based on user type
      if (userType === 'organizer') {
        userResponse.companyName = user.companyName;
      } else if (userType === 'supplier') {
        userResponse.services = user.services;
        userResponse.isApproved = user.isApproved;
      }

      res.status(201).json({
        success: true,
        message: userType === 'organizer' 
          ? 'Registration completed successfully!' 
          : 'Supplier registered successfully. Waiting for admin approval.',
        token: userType === 'organizer' ? token : undefined,
        user: userResponse
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return res.status(400).json({
          success: false,
          message: `${field} already exists`
        });
      }
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error during registration'
      });
    }
  }

  // Resend OTP
  async resendOTP(req, res) {
    try {
      const { phone, userType } = req.body;
      
      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      // Check if phone is already registered
      const existingUser = await userService.findUserByPhone(phone);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already registered'
        });
      }

      // Delete any existing OTP sessions for this phone
      await OTPSession.deleteMany({ phone, purpose: 'registration' });

      // Send new OTP
      const otpResult = await otpService.sendOTP(phone, 'registration');
      
      if (!otpResult.success) {
        return res.status(500).json({
          success: false,
          message: otpResult.message || 'Failed to send OTP'
        });
      }

      // Save new OTP session with userType if provided
      const otpSessionData = {
        phone,
        sessionId: otpResult.sessionId,
        purpose: 'registration',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      };

      if (userType) {
        otpSessionData.userType = userType;
      }

      const otpSession = new OTPSession(otpSessionData);
      await otpSession.save();

      res.json({
        success: true,
        message: 'OTP sent successfully',
        sessionId: otpResult.sessionId,
        // For development only
        ...(process.env.NODE_ENV === 'development' && { otp: otpResult.otp })
      });
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during OTP resend'
      });
    }
  }

  // Check OTP status
  async checkOTPStatus(req, res) {
    try {
      const { sessionId, phone } = req.body;
      
      if (!sessionId || !phone) {
        return res.status(400).json({
          success: false,
          message: 'Session ID and phone number are required'
        });
      }

      const otpSession = await OTPSession.findOne({ 
        sessionId, 
        phone,
        purpose: 'registration' 
      });
      
      if (!otpSession) {
        return res.status(404).json({
          success: false,
          message: 'OTP session not found'
        });
      }

      // Check if OTP is expired
      const isExpired = otpSession.expiresAt < new Date();

      res.json({
        success: true,
        isVerified: otpSession.isVerified,
        isExpired,
        expiresAt: otpSession.expiresAt,
        createdAt: otpSession.createdAt,
        userType: otpSession.userType || null
      });
    } catch (error) {
      console.error('Check OTP status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while checking OTP status'
      });
    }
  }

  // Login
  async login(req, res) {
    try {
      const { phone, password, email } = req.body;
      
      // Allow login with either phone or email
      if ((!phone && !email) || !password) {
        return res.status(400).json({
          success: false,
          message: 'Phone/Email and password are required'
        });
      }
      
      // Find user by phone number or email
      let user;
      if (phone) {
        user = await userService.findUserByPhone(phone);
      } else if (email) {
        user = await userService.findUserByEmail(email);
      }
      
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Account is deactivated. Please contact support.'
        });
      }

      // Allow suppliers to login even if pending approval
      // Frontend will handle approval status display

      // Check password
      const isPasswordValid = await userService.validatePassword(user, password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user._id, 
          userType: user.userType 
        },
        JWT.SECRET,
        { expiresIn: JWT.EXPIRES_IN }
      );

      // Prepare user response data
      const userResponse = {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        userType: user.userType,
        phone: user.phone,
        isVerified: user.isVerified
      };

      // Add additional fields based on user type
      if (user.userType === 'organizer') {
        userResponse.companyName = user.companyName;
      } else if (user.userType === 'supplier') {
        userResponse.services = user.services;
        userResponse.isApproved = user.isApproved;
      }

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: userResponse
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login'
      });
    }
  }

  // Forgot password
  async forgotPassword(req, res) {
    try {
      const { phone, email } = req.body;
      
      if (!phone && !email) {
        return res.status(400).json({
          success: false,
          message: 'Phone number or email is required'
        });
      }

      // Find user by phone number or email
      let user;
      if (phone) {
        user = await userService.findUserByPhone(phone);
      } else if (email) {
        user = await userService.findUserByEmail(email);
      }
      
      if (!user) {
        // Don't reveal that the user doesn't exist for security reasons
        return res.json({
          success: true,
          message: 'If the account exists, a reset OTP has been sent'
        });
      }

      // Use phone for OTP if available, otherwise use email
      const contact = user.phone || user.email;
      const contactType = user.phone ? 'phone' : 'email';

      // Send OTP for password reset
      const otpResult = await otpService.sendOTP(contact, 'password_reset');
      
      if (!otpResult.success) {
        return res.status(500).json({
          success: false,
          message: otpResult.message || 'Failed to send OTP'
        });
      }

      // Delete any existing OTP sessions for this contact
      await OTPSession.deleteMany({ 
        [contactType]: contact, 
        purpose: 'password_reset' 
      });

      // Save OTP session
      const otpSession = new OTPSession({
        [contactType]: contact,
        sessionId: otpResult.sessionId,
        purpose: 'password_reset',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      });
      await otpSession.save();

      res.json({
        success: true,
        message: `OTP sent to your ${contactType} for password reset`,
        sessionId: otpResult.sessionId,
        // For development only
        ...(process.env.NODE_ENV === 'development' && { otp: otpResult.otp })
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during password reset'
      });
    }
  }

  // Verify password reset OTP
  async verifyPasswordResetOTP(req, res) {
    try {
      const { sessionId, otp, phone, email } = req.body;
      
      if (!sessionId || !otp || (!phone && !email)) {
        return res.status(400).json({
          success: false,
          message: 'Session ID, OTP, and phone/email are required'
        });
      }

      // Verify OTP with 2factor.in
      const verificationResult = await otpService.verifyOTP(sessionId, otp);
      
      if (!verificationResult.success) {
        return res.status(400).json({
          success: false,
          message: verificationResult.message || 'Invalid OTP'
        });
      }

      // Find OTP session
      const contact = phone || email;
      const contactType = phone ? 'phone' : 'email';
      
      const otpSession = await OTPSession.findOne({ 
        sessionId, 
        [contactType]: contact,
        purpose: 'password_reset' 
      });
      
      if (!otpSession) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP session'
        });
      }

      // Check if OTP is expired
      if (otpSession.expiresAt < new Date()) {
        await OTPSession.deleteOne({ _id: otpSession._id });
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new one.'
        });
      }

      // Mark OTP as verified
      otpSession.isVerified = true;
      otpSession.verifiedAt = new Date();
      await otpSession.save();

      res.json({
        success: true,
        message: 'OTP verified successfully',
        sessionId: sessionId
      });
    } catch (error) {
      console.error('Verify password reset OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during OTP verification'
      });
    }
  }

  // Reset password after OTP verification
  async resetPassword(req, res) {
    try {
      const { sessionId, phone, email, newPassword } = req.body;
      
      if (!sessionId || !newPassword || (!phone && !email)) {
        return res.status(400).json({
          success: false,
          message: 'Session ID, new password, and phone/email are required'
        });
      }

      const contact = phone || email;
      const contactType = phone ? 'phone' : 'email';

      // Find OTP session
      const otpSession = await OTPSession.findOne({ 
        sessionId, 
        [contactType]: contact,
        purpose: 'password_reset',
        isVerified: true 
      });
      
      if (!otpSession) {
        return res.status(400).json({
          success: false,
          message: 'Please verify your OTP first'
        });
      }

      // Check if OTP is expired
      if (otpSession.expiresAt < new Date()) {
        await OTPSession.deleteOne({ _id: otpSession._id });
        return res.status(400).json({
          success: false,
          message: 'OTP session has expired. Please request a new one.'
        });
      }

      // Find user by phone or email
      let user;
      if (phone) {
        user = await userService.findUserByPhone(phone);
      } else if (email) {
        user = await userService.findUserByEmail(email);
      }
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Reset password
      await userService.resetPassword(user._id, newPassword);

      // Delete OTP session
      await OTPSession.deleteOne({ _id: otpSession._id });

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during password reset'
      });
    }
  }

  // Get user profile
  async getProfile(req, res) {
    try {
      const user = await userService.findUserById(req.user._id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Prepare user response data
      const userResponse = {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        userType: user.userType,
        phone: user.phone,
        gender: user.gender,
        dob: user.dob,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      };

      // Add additional fields based on user type
      if (user.userType === 'organizer') {
        userResponse.companyName = user.companyName;
      } else if (user.userType === 'supplier') {
        userResponse.services = user.services;
        userResponse.aadharNumber = user.aadharNumber;
        userResponse.aadharCard = user.aadharCard;
        userResponse.isApproved = user.isApproved;
      }

      res.json({
        success: true,
        data: userResponse
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching profile'
      });
    }
  }

  // Organizer Signup after OTP verification
  async organizerSignup(req, res) {
    try {
      const { phone, sessionId, fullName, email, password, companyName } = req.body;
      
      if (!phone || !sessionId || !fullName || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      const otpSession = await OTPSession.findOne({ 
        sessionId, 
        phone,
        purpose: 'registration',
        isVerified: true 
      });
      
      if (!otpSession) {
        return res.status(400).json({
          success: false,
          message: 'Please verify your phone number first'
        });
      }

      const userData = {
        fullName,
        email: email.toLowerCase(),
        password,
        userType: 'organizer',
        phone,
        companyName,
        isVerified: true
      };

      const user = await userService.createUser(userData);
      await OTPSession.deleteOne({ _id: otpSession._id });

      const token = jwt.sign(
        { userId: user._id, userType: user.userType },
        JWT.SECRET,
        { expiresIn: JWT.EXPIRES_IN }
      );

      res.status(201).json({
        success: true,
        message: 'Organizer registered successfully!',
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          userType: user.userType
        }
      });
    } catch (error) {
      console.error('Organizer signup error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Registration failed'
      });
    }
  }

  // Supplier Signup after OTP verification
  async supplierSignup(req, res) {
    try {
      const { phone, sessionId, fullName, email, password, services } = req.body;
      
      if (!phone || !sessionId || !fullName || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      const otpSession = await OTPSession.findOne({ 
        sessionId, 
        phone,
        purpose: 'registration',
        isVerified: true 
      });
      
      if (!otpSession) {
        return res.status(400).json({
          success: false,
          message: 'Please verify your phone number first'
        });
      }

      const userData = {
        fullName,
        email: email.toLowerCase(),
        password,
        userType: 'supplier',
        phone,
        services: Array.isArray(services) ? services : [],
        isVerified: true,
        isApproved: true
      };

      if (req.file) userData.aadharCard = req.file.path;

      const user = await userService.createUser(userData);
      await OTPSession.deleteOne({ _id: otpSession._id });

      const token = jwt.sign(
        { userId: user._id, userType: user.userType },
        JWT.SECRET,
        { expiresIn: JWT.EXPIRES_IN }
      );

      res.status(201).json({
        success: true,
        message: 'Supplier registered successfully!',
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          userType: user.userType
        }
      });
    } catch (error) {
      console.error('Supplier signup error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Registration failed'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const updates = req.body;
      const userId = req.user._id;

      // Remove fields that shouldn't be updated
      delete updates.password;
      delete updates.userType;
      delete updates.isVerified;
      delete updates.isApproved;

      // Handle date conversion
      if (updates.dob) {
        updates.dob = new Date(updates.dob);
      }

      const updatedUser = await userService.updateUser(userId, updates);
      
      // Prepare user response data
      const userResponse = {
        id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        userType: updatedUser.userType,
        phone: updatedUser.phone,
        gender: updatedUser.gender,
        dob: updatedUser.dob,
        isVerified: updatedUser.isVerified
      };

      // Add additional fields based on user type
      if (updatedUser.userType === 'organizer') {
        userResponse.companyName = updatedUser.companyName;
      } else if (updatedUser.userType === 'supplier') {
        userResponse.services = updatedUser.services;
        userResponse.aadharNumber = updatedUser.aadharNumber;
        userResponse.isApproved = updatedUser.isApproved;
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: userResponse
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating profile'
      });
    }
  }
}

export default new AuthController();