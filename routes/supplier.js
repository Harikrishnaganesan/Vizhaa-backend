import express from 'express';
import supplierController from '../controllers/supplierController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Dashboard
router.get('/dashboard', supplierController.getDashboard);

// Events
router.get('/events', supplierController.getAvailableEvents);
router.post('/events/:eventId/book', supplierController.bookEvent);

// Bookings
router.get('/bookings', supplierController.getBookings);

export default router;