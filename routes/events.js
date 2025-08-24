import express from 'express';
import eventController from '../controllers/eventController.js';
import { authenticate } from '../middleware/auth.js';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Validation rules for event creation
const eventValidation = [
  body('eventName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Event name must be between 2 and 100 characters'),
  body('eventType')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Event type must be between 2 and 50 characters'),
  body('location')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Location must be between 5 and 200 characters'),
  body('numberOfSuppliers')
    .isInt({ min: 1 })
    .withMessage('Number of suppliers must be at least 1'),
  body('eventDate')
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('eventTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide a valid time in HH:MM format'),
  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget must be a positive number'),
  handleValidationErrors
];

// All routes require authentication
router.use(authenticate);

// Event routes
router.post('/', eventValidation, eventController.createEvent);
router.get('/', eventController.getEvents);
router.get('/stats', eventController.getEventStats);
router.get('/:id', eventController.getEvent);
router.put('/:id', eventValidation, eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

// Get events by status
router.get('/status/:status', eventController.getEventsByStatus);

// Payment routes
router.put('/:eventId/payment', eventController.updateEventPayment);

// Available events for suppliers
router.get('/available/events', eventController.getAvailableEvents);

// Supplier applies to event
router.post('/book', eventController.bookEvent);

// Get event applications (organizer)
router.get('/applications/:eventId', eventController.getEventApplications);

// Update application status (organizer)
router.put('/application/:bookingId/status', eventController.updateApplicationStatus);

// Get supplier's bookings
router.get('/supplier/bookings', eventController.getSupplierBookings);

export default router;