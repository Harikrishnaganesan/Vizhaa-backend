import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

export default connectDB;