import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from './models/User.js';

const testRegistration = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const testUser = {
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      userType: 'organizer',
      phone: '1234567890',
      isVerified: true
    };

    console.log('Creating test user:', testUser);
    
    const user = new User(testUser);
    const savedUser = await user.save();
    
    console.log('User created successfully:', savedUser._id);
    
    // Clean up
    await User.deleteOne({ _id: savedUser._id });
    console.log('Test user deleted');
    
    await mongoose.disconnect();
    console.log('Test completed successfully');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
};

testRegistration();