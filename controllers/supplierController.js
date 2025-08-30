import Event from '../models/Event.js';
import Booking from '../models/Booking.js';

class SupplierController {
  // Dashboard data
  async getDashboard(req, res) {
    try {
      const supplierId = req.user._id;
      
      const totalBookings = await Booking.countDocuments({ supplierId });
      const activeBookings = await Booking.countDocuments({ 
        supplierId, 
        status: { $in: ['Pending', 'Confirmed'] }
      });
      
      const availableEvents = await Event.countDocuments({ 
        status: { $in: ['Draft', 'Planning'] }
      });
      
      const recentBookings = await Booking.find({ supplierId })
        .populate('eventId', 'eventName eventDate')
        .sort({ createdAt: -1 })
        .limit(5);

      res.json({
        success: true,
        data: {
          totalBookings,
          activeBookings,
          availableEvents,
          recentBookings
        }
      });
    } catch (error) {
      console.error('Supplier dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard data'
      });
    }
  }

  // View all available events from all organizers
  async getAvailableEvents(req, res) {
    try {
      const supplierId = req.user._id;
      
      // Get all events from all organizers
      const events = await Event.find({})
        .populate('organizerId', 'fullName companyName phone email')
        .sort({ createdAt: -1 });

      // Check booking status for each event
      const eventsWithBookingStatus = await Promise.all(
        events.map(async (event) => {
          const booking = await Booking.findOne({
            eventId: event._id,
            supplierId: supplierId
          });

          return {
            id: event._id,
            eventName: event.eventName,
            eventType: event.eventType,
            location: event.location,
            eventDate: event.eventDate,
            eventTime: event.eventTime,
            budget: event.budget,
            servicesNeeded: event.servicesNeeded,
            numberOfGuests: event.numberOfGuests,
            description: event.description,
            organizer: {
              id: event.organizerId._id,
              fullName: event.organizerId.fullName,
              companyName: event.organizerId.companyName,
              phone: event.organizerId.phone,
              email: event.organizerId.email
            },
            status: event.status,
            createdAt: event.createdAt,
            isBooked: !!booking,
            bookingStatus: booking ? booking.status : null,
            bookingId: booking ? booking._id : null
          };
        })
      );

      res.json({
        success: true,
        data: eventsWithBookingStatus
      });
    } catch (error) {
      console.error('Get available events error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch available events'
      });
    }
  }

  // Book an event
  async bookEvent(req, res) {
    try {
      const { eventId } = req.params;
      const { services, proposedPrice, message } = req.body;
      
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      // Check if already booked
      const existingBooking = await Booking.findOne({
        eventId,
        supplierId: req.user._id
      });

      if (existingBooking) {
        return res.status(400).json({
          success: false,
          message: 'You have already booked this event'
        });
      }

      const booking = new Booking({
        eventId,
        supplierId: req.user._id,
        organizerId: event.organizerId,
        services,
        proposedPrice,
        message
      });

      await booking.save();

      res.status(201).json({
        success: true,
        message: 'Event booked successfully',
        data: booking
      });
    } catch (error) {
      console.error('Book event error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to book event'
      });
    }
  }

  // Get supplier's bookings (My Events page)
  async getBookings(req, res) {
    try {
      const bookings = await Booking.find({ supplierId: req.user._id })
        .populate('eventId', 'eventName eventDate location')
        .populate('organizerId', 'fullName companyName phone')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: bookings
      });
    } catch (error) {
      console.error('Get bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch bookings'
      });
    }
  }
}

export default new SupplierController();