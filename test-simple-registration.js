import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Simple User Schema for testing
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { type: String, enum: ['organizer', 'supplier'], required: true },
  phone: { type: String, required: true, unique: true },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

const User = mongoose.model('TestUser', userSchema);

const testRegistration = async () => {
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Found' : 'Not found');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear any existing test users
    await User.deleteMany({ email: 'test@example.com' });

    const userData = {
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      userType: 'organizer',
      phone: '1234567890',
      isVerified: true
    };

    console.log('Creating user with data:', userData);
    
    const user = new User(userData);
    const savedUser = await user.save();
    
    console.log('SUCCESS: User saved to database with ID:', savedUser._id);
    console.log('User data:', {
      id: savedUser._id,
      fullName: savedUser.fullName,
      email: savedUser.email,
      userType: savedUser.userType,
      phone: savedUser.phone
    });
    
    // Verify user exists in database
    const foundUser = await User.findById(savedUser._id);
    console.log('Verification: User found in database:', foundUser ? 'YES' : 'NO');
    
    await mongoose.disconnect();
    console.log('Test completed successfully');
    
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
};

testRegistration();