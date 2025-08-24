const mongoose = require('mongoose');

const organizerSchema = new mongoose.Schema({
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
  profileImage: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Organizer', organizerSchema);