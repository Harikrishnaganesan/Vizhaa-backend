const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    trim: true
  },
  dob: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female', 'other']
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  aadharNumber: {
    type: String,
    required: true,
    unique: true
  },
  aadharFront: {
    type: String,
    required: true
  },
  aadharBack: {
    type: String,
    required: true
  },
  services: [{
    type: String
  }],
  profileImage: {
    type: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Supplier', supplierSchema);