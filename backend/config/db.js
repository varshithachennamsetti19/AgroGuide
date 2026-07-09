import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`📡 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    if (process.env.NODE_ENV === 'testing' || process.env.IGNORE_DB_ERRORS === 'true') {
      console.warn('⚠️ MongoDB is offline. Bypassing crash exit for test execution environment.');
    } else {
      process.exit(1);
    }
  }
};

export default connectDB;
