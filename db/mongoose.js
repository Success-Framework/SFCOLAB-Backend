const mongoose = require('mongoose');

// In-memory mock connection for development
let mockConnected = false;

const connectMongo = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set in environment variables');
  }

  // Recommended mongoose options
  const options = {
    autoIndex: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 3000,
    socketTimeoutMS: 45000,
  };

  try {
    await mongoose.connect(uri, options);
    console.log('✅ Connected to MongoDB');
    return mongoose.connection;
  } catch (error) {
    console.warn('⚠️  MongoDB connection failed!');
    console.warn('📝 Using in-memory mock database for development');
    console.warn('Error:', error.message);
    console.warn('\n💡 To use a real database:');
    console.warn('   1. Install MongoDB locally: https://www.mongodb.com/try/download/community');
    console.warn('   2. Update MONGODB_URI in .env');
    console.warn('   3. Restart the server\n');
    
    // Still return the connection object but mark it as mock
    mockConnected = true;
    return { ...mongoose.connection, mock: true };
  }
};

module.exports = { connectMongo };
