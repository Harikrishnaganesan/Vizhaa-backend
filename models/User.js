import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  userType: { 
    type: String, 
    enum: ['organizer', 'supplier'], 
    required: true 
  },
  phone: { 
    type: String,
    required: true,
    unique: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  gender: { 
    type: String, 
    enum: ['Male', 'Female', 'Other'] 
  },
  dob: { 
    type: Date 
  },
  aadharCard: { 
    type: String 
  },
  aadharNumber: {
    type: String
  },
  companyName: {
    type: String,
    trim: true
  },
  services: [{
    type: String
  }],
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  profileImage: {
    type: String
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  isActive: {
    type: Boolean,
    default: true
  },
  companyName: {
    type: String
  },
  services: [{
    type: String
  }],
  aadharNumber: {
    type: String
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  isApproved: { // For suppliers needing admin approval
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true 
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

export default mongoose.model('User', userSchema);