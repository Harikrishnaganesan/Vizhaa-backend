import express from 'express';
import organizerController from '../controllers/organizerController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Dashboard
router.get('/dashboard', organizerController.getDashboard);

// Events
router.post('/events', organizerController.createEvent);
router.get('/events', organizerController.getEvents);
router.get('/events/:eventId/suppliers', organizerController.getEventSuppliers);

// Bookings (Status Management)
router.get('/bookings', organizerController.getBookings);
router.get('/bookings/:bookingId', organizerController.getBookingDetails);
router.put('/bookings/:bookingId/status', organizerController.updateBookingStatus);

export default router;