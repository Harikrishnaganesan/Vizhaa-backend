import Event from '../models/Event.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';

class EventController {
  // Create a new event
  async createEvent(req, res) {
    try {
      const {
        eventName,
        eventType,
        location,
        numberOfSuppliers,
        eventDate,
        eventTime,
        servicesNeeded,
        dressCodeOptions,
        budget,
        notes
      } = req.body;

      // Validate required fields
      if (!eventName || !eventType || !location || !numberOfSuppliers || !eventDate || !eventTime) {
        return res.status(400).json({
          success: false,
          message: 'Event name, type, location, number of suppliers, date, and time are required'
        });
      }

      // Create new event
      const event = new Event({
        eventName,
        eventType,
        location,
        numberOfSuppliers: parseInt(numberOfSuppliers),
        eventDate: new Date(eventDate),
        eventTime,
        servicesNeeded: servicesNeeded || [],
        dressCodeOptions: dressCodeOptions || {},
        budget: budget || 0,
        notes: notes || '',
        organizerId: req.user._id,
        status: 'Draft'
      });

      await event.save();

      // Populate organizer details
      await event.populate('organizerId', 'fullName email phone companyName');

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: event
      });
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while creating event'
      });
    }
  }

  // Get all events for the logged-in organizer
  async getEvents(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const filter = { organizerId: req.user._id };
      
      if (status && status !== 'All') {
        filter.status = status;
      }

      const events = await Event.find(filter)
        .populate('organizerId', 'fullName email phone companyName')
        .populate('bookedSuppliers.supplierId', 'fullName companyName services phone email')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Event.countDocuments(filter);

      res.json({
        success: true,
        data: events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching events'
      });
    }
  }

  // Get a single event by ID
  async getEvent(req, res) {
    try {
      const { id } = req.params;
      
      const event = await Event.findOne({ 
        _id: id, 
        organizerId: req.user._id 
      })
      .populate('organizerId', 'fullName email phone companyName')
      .populate('bookedSuppliers.supplierId', 'fullName companyName services phone email profileImage');

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      res.json({
        success: true,
        data: event
      });
    } catch (error) {
      console.error('Get event error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching event'
      });
    }
  }

  // Update an event
  async updateEvent(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Remove fields that shouldn't be updated
      delete updates.organizerId;
      delete updates.createdAt;
      delete updates.bookedSuppliers;

      // Convert date if provided
      if (updates.eventDate) {
        updates.eventDate = new Date(updates.eventDate);
      }

      const event = await Event.findOneAndUpdate(
        { _id: id, organizerId: req.user._id },
        updates,
        { new: true, runValidators: true }
      )
      .populate('organizerId', 'fullName email phone companyName')
      .populate('bookedSuppliers.supplierId', 'fullName companyName services phone email');

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      res.json({
        success: true,
        message: 'Event updated successfully',
        data: event
      });
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating event'
      });
    }
  }

  // Delete an event
  async deleteEvent(req, res) {
    try {
      const { id } = req.params;

      const event = await Event.findOneAndDelete({ 
        _id: id, 
        organizerId: req.user._id 
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      // Also delete all bookings associated with this event
      await Booking.deleteMany({ eventId: id });

      res.json({
        success: true,
        message: 'Event deleted successfully'
      });
    } catch (error) {
      console.error('Delete event error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while deleting event'
      });
    }
  }

  // Get event statistics for dashboard
  async getEventStats(req, res) {
    try {
      const stats = await Event.aggregate([
        { $match: { organizerId: req.user._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalBudget: { $sum: '$budget' }
          }
        }
      ]);

      const totalEvents = await Event.countDocuments({ organizerId: req.user._id });
      
      const upcomingEvents = await Event.countDocuments({ 
        organizerId: req.user._id,
        eventDate: { $gte: new Date() },
        status: { $in: ['Draft', 'Planning', 'Confirmed'] }
      });

      // Get pending applications count
      const pendingApplications = await Booking.countDocuments({
        organizerId: req.user._id,
        status: 'Pending'
      });

      res.json({
        success: true,
        data: {
          stats,
          totalEvents,
          upcomingEvents,
          pendingApplications
        }
      });
    } catch (error) {
      console.error('Get event stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching event statistics'
      });
    }
  }

  // Get all available events for suppliers (not booked by them)
  async getAvailableEvents(req, res) {
    try {
      const { page = 1, limit = 10, services, location, eventType } = req.query;
      const filter = { 
        status: { $in: ['Planning', 'Confirmed'] },
        eventDate: { $gte: new Date() }
      };
      
      // Filter by services if provided
      if (services) {
        filter.servicesNeeded = { $in: services.split(',') };
      }
      
      // Filter by location if provided
      if (location) {
        filter.location = { $regex: location, $options: 'i' };
      }

      // Filter by event type if provided
      if (eventType) {
        filter.eventType = { $regex: eventType, $options: 'i' };
      }
      
      const events = await Event.find(filter)
        .populate('organizerId', 'fullName companyName phone email')
        .sort({ eventDate: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      // Remove events that the supplier has already applied to
      const supplierId = req.user._id;
      const appliedEvents = await Booking.find({ supplierId }).distinct('eventId');
      
      const availableEvents = events.filter(event => 
        !appliedEvents.includes(event._id.toString()) && 
        event.bookedSuppliers.length < event.numberOfSuppliers
      );
      
      const total = await Event.countDocuments(filter);
      
      res.json({
        success: true,
        data: availableEvents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get available events error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching available events'
      });
    }
  }
  
  // Book an event (supplier applies to event)
  async bookEvent(req, res) {
    try {
      const { eventId, proposedBudget, notes } = req.body;
      const supplierId = req.user._id;
      
      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'Event ID is required'
        });
      }
      
      // Check if event exists
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
      
      // Check if supplier has already applied
      const existingBooking = await Booking.findOne({ eventId, supplierId });
      if (existingBooking) {
        return res.status(400).json({
          success: false,
          message: 'You have already applied to this event'
        });
      }
      
      // Check if event has available slots
      if (event.bookedSuppliers.length >= event.numberOfSuppliers) {
        return res.status(400).json({
          success: false,
          message: 'No available slots for this event'
        });
      }
      
      // Check if supplier services match event requirements
      const supplier = await User.findById(supplierId);
      const hasMatchingService = event.servicesNeeded.some(service => 
        supplier.services.includes(service)
      );
      
      if (!hasMatchingService && supplier.services && supplier.services.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Your services do not match the event requirements'
        });
      }
      
      // Create booking
      const booking = new Booking({
        eventId,
        supplierId,
        organizerId: event.organizerId,
        proposedBudget: proposedBudget || 0,
        notes,
        services: supplier.services || []
      });
      
      await booking.save();
      
      // Add to event's booked suppliers
      event.bookedSuppliers.push({
        supplierId,
        status: 'Pending'
      });
      
      await event.save();
      
      // Populate data for response
      await booking.populate('eventId', 'eventName eventType location eventDate eventTime servicesNeeded');
      await booking.populate('organizerId', 'fullName companyName phone email');
      await booking.populate('supplierId', 'fullName companyName services phone email');
      
      res.status(201).json({
        success: true,
        message: 'Successfully applied to the event',
        data: booking
      });
    } catch (error) {
      console.error('Book event error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while booking event'
      });
    }
  }
  
  // Get event applications for organizer
  async getEventApplications(req, res) {
    try {
      const { eventId } = req.params;
      const { status } = req.query;
      
      const filter = { eventId, organizerId: req.user._id };
      if (status) {
        filter.status = status;
      }
      
      const applications = await Booking.find(filter)
        .populate('supplierId', 'fullName companyName services phone email profileImage rating')
        .populate('eventId', 'eventName eventType location eventDate servicesNeeded')
        .sort({ appliedAt: -1 });
      
      res.json({
        success: true,
        data: applications
      });
    } catch (error) {
      console.error('Get event applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching event applications'
      });
    }
  }
  
  // Update application status (organizer accepts/rejects)
  async updateApplicationStatus(req, res) {
    try {
      const { bookingId } = req.params;
      const { status } = req.body;
      
      if (!['Confirmed', 'Rejected', 'Completed', 'Cancelled'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status value'
        });
      }
      
      const booking = await Booking.findOne({ 
        _id: bookingId, 
        organizerId: req.user._id 
      });
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }
      
      // Update booking status
      booking.status = status;
      if (status === 'Confirmed') {
        booking.confirmedAt = new Date();
      } else if (status === 'Completed') {
        booking.completedAt = new Date();
      }
      await booking.save();
      
      // Update event's booked suppliers status
      const event = await Event.findById(booking.eventId);
      if (event) {
        const supplierIndex = event.bookedSuppliers.findIndex(
          s => s.supplierId.toString() === booking.supplierId.toString()
        );
        
        if (supplierIndex !== -1) {
          event.bookedSuppliers[supplierIndex].status = status;
          await event.save();
        }
      }
      
      // Populate data for response
      await booking.populate('supplierId', 'fullName companyName services phone email');
      await booking.populate('eventId', 'eventName eventType location eventDate');
      
      res.json({
        success: true,
        message: `Application ${status.toLowerCase()} successfully`,
        data: booking
      });
    } catch (error) {
      console.error('Update application status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating application status'
      });
    }
  }
  
  // Get supplier's bookings
  async getSupplierBookings(req, res) {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const filter = { supplierId: req.user._id };
      
      if (status) {
        filter.status = status;
      }
      
      const bookings = await Booking.find(filter)
        .populate('eventId', 'eventName eventType location eventDate eventTime servicesNeeded dressCodeOptions')
        .populate('organizerId', 'fullName companyName phone email profileImage')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await Booking.countDocuments(filter);
      
      res.json({
        success: true,
        data: bookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get supplier bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching supplier bookings'
      });
    }
  }

  // Update event payment information
  async updateEventPayment(req, res) {
    try {
      const { eventId } = req.params;
      const { totalAmount, advancePaid, paymentStatus, transaction } = req.body;
      
      const event = await Event.findOne({ 
        _id: eventId, 
        organizerId: req.user._id 
      });
      
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
      
      // Update payment information
      if (totalAmount !== undefined) event.payment.totalAmount = totalAmount;
      if (advancePaid !== undefined) event.payment.advancePaid = advancePaid;
      if (paymentStatus !== undefined) event.payment.paymentStatus = paymentStatus;
      
      // Add transaction if provided
      if (transaction) {
        event.payment.transactions.push(transaction);
      }
      
      await event.save();
      
      // Populate data for response
      await event.populate('organizerId', 'fullName email phone companyName');
      await event.populate('bookedSuppliers.supplierId', 'fullName companyName services phone email');
      
      res.json({
        success: true,
        message: 'Payment information updated successfully',
        data: event
      });
    } catch (error) {
      console.error('Update event payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating payment information'
      });
    }
  }

  // Get events by status for dashboard
  async getEventsByStatus(req, res) {
    try {
      const { status } = req.params;
      const { page = 1, limit = 10 } = req.query;
      
      const filter = { organizerId: req.user._id };
      if (status !== 'all') {
        filter.status = status;
      }
      
      const events = await Event.find(filter)
        .populate('organizerId', 'fullName email phone companyName')
        .populate('bookedSuppliers.supplierId', 'fullName companyName services phone email')
        .sort({ eventDate: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await Event.countDocuments(filter);
      
      res.json({
        success: true,
        data: events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get events by status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching events'
      });
    }
  }
}

export default new EventController();