import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/database.js';

// Route imports
import authRoutes from './routes/auth.js';
import otpRoutes from './routes/otp.js';
import userRoutes from './routes/user.js';
import eventRoutes from './routes/events.js';
import organizerRoutes from './routes/organizer.js';
import supplierRoutes from './routes/supplier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 

// Startup message
console.log('🚀 Starting Vizhaa Backend Server...');
console.log('🌐 Environment:', process.env.NODE_ENV || 'development');

// Connect to database
connectDB().catch(error => {
  console.error('❌ Failed to start server due to database connection error');
  process.exit(1);
});

const app = express();

// Middleware
app.use(cors({
  origin: [
    "https://vizhaa-backend-1.onrender.com", 
    "http://localhost:3000", 
    "http://localhost:3001",
    "http://127.0.0.1:3000"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Request body:', req.body);
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/supplier', supplierRoutes); 

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: "ok" });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running successfully',
    timestamp: new Date().toISOString()
  });
});

// Database test endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const mongoose = await import('mongoose');
    const isConnected = mongoose.default.connection.readyState === 1;
    
    res.status(200).json({
      success: true,
      database: {
        connected: isConnected,
        state: mongoose.default.connection.readyState,
        host: mongoose.default.connection.host,
        name: mongoose.default.connection.name
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  console.error('Error stack:', err.stack);
  
  // Ensure we always send a response
  if (res.headersSent) {
    return next(err);
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;