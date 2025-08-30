import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    let conn;
    try {
      // Try Atlas connection first
      conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
    } catch (atlasError) {
      console.log('⚠️ Atlas connection failed, trying local MongoDB...');
      // Fallback to local MongoDB
      conn = await mongoose.connect('mongodb://localhost:27017/vizhaa');
    }
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('💡 Solutions:');
    console.log('1. Whitelist your IP in MongoDB Atlas');
    console.log('2. Install local MongoDB: https://www.mongodb.com/try/download/community');
    process.exit(1);
  }
};

export default connectDB;