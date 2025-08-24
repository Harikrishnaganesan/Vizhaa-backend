import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authController from './controllers/authController.js';

const app = express();
const PORT = 5001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch(console.error);