import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  services: [{
    type: String,
    required: true
  }],
  proposedPrice: {
    type: Number
  },
  message: {
    type: String
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Rejected', 'Completed'],
    default: 'Pending'
  },
  organizerMessage: {
    type: String
  },
  statusUpdatedAt: {
    type: Date
  }
}, { timestamps: true });

export default mongoose.model('Booking', bookingSchema);