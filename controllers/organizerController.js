import Event from '../models/Event.js';
import Booking from '../models/Booking.js';

class OrganizerController {
  // Dashboard data
  async getDashboard(req, res) {
    try {
      const organizerId = req.user._id;
      
      const totalEvents = await Event.countDocuments({ organizerId });
      const activeEvents = await Event.countDocuments({ 
        organizerId, 
        status: { $in: ['Draft', 'Planning', 'Confirmed'] }
      });
      
      const totalBookings = await Booking.countDocuments({ organizerId });
      
      const recentEvents = await Event.find({ organizerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('eventName eventDate status');

      res.json({
        success: true,
        data: {
          totalEvents,
          activeEvents,
          totalBookings,
          recentEvents
        }
      });
    } catch (error) {
      console.error('Organizer dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard data'
      });
    }
  }

  // Create event (Form page)
  async createEvent(req, res) {
    try {
      const eventData = {
        ...req.body,
        organizerId: req.user._id
      };

      const event = new Event(eventData);
      await event.save();

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: event
      });
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create event'
      });
    }
  }

  // Get organizer's events (My Events page)
  async getEvents(req, res) {
    try {
      const events = await Event.find({ organizerId: req.user._id })
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch events'
      });
    }
  }

  // Get event suppliers (Event status)
  async getEventSuppliers(req, res) {
    try {
      const { eventId } = req.params;
      
      const bookings = await Booking.find({ 
        eventId, 
        organizerId: req.user._id 
      }).populate('supplierId', 'fullName phone email services');

      const formattedBookings = bookings.map(booking => ({
        bookingId: booking._id,
        supplier: {
          id: booking.supplierId._id,
          fullName: booking.supplierId.fullName,
          phone: booking.supplierId.phone,
          email: booking.supplierId.email,
          services: booking.supplierId.services
        },
        bookedServices: booking.services,
        proposedPrice: booking.proposedPrice,
        message: booking.message,
        status: booking.status,
        bookedAt: booking.createdAt
      }));

      res.json({
        success: true,
        data: formattedBookings
      });
    } catch (error) {
      console.error('Get event suppliers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch event suppliers'
      });
    }
  }

  // Get all bookings overview
  async getBookings(req, res) {
    try {
      const organizerId = req.user._id;
      
      const bookings = await Booking.find({ organizerId })
        .populate('eventId', 'eventName eventDate')
        .populate('supplierId', 'fullName phone email services')
        .sort({ createdAt: -1 });

      const stats = {
        totalBookings: bookings.length,
        pendingBookings: bookings.filter(b => b.status === 'Pending').length,
        confirmedBookings: bookings.filter(b => b.status === 'Confirmed').length,
        rejectedBookings: bookings.filter(b => b.status === 'Rejected').length
      };

      // Group bookings by event
      const bookingsByEvent = {};
      bookings.forEach(booking => {
        const eventId = booking.eventId._id.toString();
        if (!bookingsByEvent[eventId]) {
          bookingsByEvent[eventId] = {
            eventId: booking.eventId._id,
            eventName: booking.eventId.eventName,
            eventDate: booking.eventId.eventDate,
            bookings: [],
            totalBookings: 0,
            pendingCount: 0,
            confirmedCount: 0
          };
        }
        bookingsByEvent[eventId].bookings.push(booking);
        bookingsByEvent[eventId].totalBookings++;
        if (booking.status === 'Pending') bookingsByEvent[eventId].pendingCount++;
        if (booking.status === 'Confirmed') bookingsByEvent[eventId].confirmedCount++;
      });

      res.json({
        success: true,
        data: {
          ...stats,
          bookingsByEvent: Object.values(bookingsByEvent),
          allBookings: bookings
        }
      });
    } catch (error) {
      console.error('Get bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch bookings'
      });
    }
  }

  // Update booking status
  async updateBookingStatus(req, res) {
    try {
      const { bookingId } = req.params;
      const { status, organizerMessage } = req.body;

      if (!['Confirmed', 'Rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be Confirmed or Rejected'
        });
      }

      const booking = await Booking.findOneAndUpdate(
        { _id: bookingId, organizerId: req.user._id },
        { 
          status, 
          organizerMessage: organizerMessage || '',
          statusUpdatedAt: new Date() 
        },
        { new: true }
      ).populate('supplierId', 'fullName phone email')
       .populate('eventId', 'eventName eventDate');

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      res.json({
        success: true,
        message: `Booking ${status.toLowerCase()} successfully`,
        data: {
          bookingId: booking._id,
          status: booking.status,
          updatedAt: booking.statusUpdatedAt,
          supplier: booking.supplierId.fullName,
          event: booking.eventId.eventName
        }
      });
    } catch (error) {
      console.error('Update booking status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update booking status'
      });
    }
  }

  // Get single booking details
  async getBookingDetails(req, res) {
    try {
      const { bookingId } = req.params;
      
      const booking = await Booking.findOne({
        _id: bookingId,
        organizerId: req.user._id
      })
      .populate('eventId', 'eventName eventDate location')
      .populate('supplierId', 'fullName phone email services');

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      res.json({
        success: true,
        data: {
          bookingId: booking._id,
          event: {
            eventName: booking.eventId.eventName,
            eventDate: booking.eventId.eventDate,
            location: booking.eventId.location
          },
          supplier: {
            fullName: booking.supplierId.fullName,
            phone: booking.supplierId.phone,
            email: booking.supplierId.email,
            services: booking.supplierId.services
          },
          bookedServices: booking.services,
          proposedPrice: booking.proposedPrice,
          supplierMessage: booking.message,
          organizerMessage: booking.organizerMessage,
          status: booking.status,
          bookedAt: booking.createdAt,
          statusUpdatedAt: booking.statusUpdatedAt
        }
      });
    } catch (error) {
      console.error('Get booking details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch booking details'
      });
    }
  }
}

export default new OrganizerController();