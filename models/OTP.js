import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['registration', 'password_reset'],
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date
  },
  userData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  userType: {
    type: String,
    enum: ['organizer', 'supplier']
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 600 } // Auto delete after 10 minutes
  }
}, { timestamps: true });

// Index for faster queries
otpSchema.index({ phone: 1, purpose: 1, isVerified: 1 });

export default mongoose.model('OTP', otpSchema);