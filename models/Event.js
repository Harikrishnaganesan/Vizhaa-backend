import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  eventName: {
    type: String,
    required: true,
    trim: true
  },
  eventType: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  numberOfSuppliers: {
    type: Number,
    required: true,
    min: 1
  },
  eventDate: {
    type: Date,
    required: true
  },
  eventTime: {
    type: String,
    required: true
  },
  servicesNeeded: [{
    type: String,
    enum: ['Breakfast', 'Dinner', 'Snacks', 'Cocktails', 'Lunch', 'Mini Tifin', 'High Tea', 'Desserts']
  }],
  dressCodeOptions: {
    premium: {
      type: Boolean,
      default: false
    },
    gold: {
      type: Boolean,
      default: false
    },
    silver: {
      type: Boolean,
      default: false
    }
  },
  organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Draft', 'Planning', 'Confirmed', 'Completed', 'Cancelled'],
    default: 'Draft'
  },
  budget: {
    type: Number,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  },
  // New fields for supplier management
  bookedSuppliers: [{
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    bookedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Rejected', 'Completed', 'Cancelled'],
      default: 'Pending'
    }
  }],
  // Payment information
  payment: {
    totalAmount: {
      type: Number,
      default: 0
    },
    advancePaid: {
      type: Number,
      default: 0
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Partial', 'Completed'],
      default: 'Pending'
    },
    transactions: [{
      amount: Number,
      paymentDate: {
        type: Date,
        default: Date.now
      },
      paymentMethod: String,
      transactionId: String
    }]
  }
}, {
  timestamps: true
});

// Index for better query performance
eventSchema.index({ organizerId: 1, eventDate: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ location: 'text', eventName: 'text' });

export default mongoose.model('Event', eventSchema);