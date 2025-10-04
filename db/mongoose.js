const mongoose = require('mongoose');

const connectMongo = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set in environment variables');
  }

  // Recommended mongoose options
  const options = {
    autoIndex: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  };

  await mongoose.connect(uri, options);
  return mongoose.connection;
};

module.exports = { connectMongo };
