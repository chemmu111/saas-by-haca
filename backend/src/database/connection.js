import mongoose from 'mongoose';

/**
 * Connect to MongoDB database
 * @param {string} mongoURI - MongoDB connection string
 * @returns {Promise<void>}
 */
export async function connectDB(mongoURI) {
  try {
    if (!mongoURI) {
      throw new Error('MONGODB_URI is required. Please set it in your .env file.');
    }

    const options = {
      // Use modern mongoose defaults
      // These options are optional but help with connection stability
    };

    await mongoose.connect(mongoURI, options);
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Log connection status
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

/**
 * Disconnect from MongoDB database
 * @returns {Promise<void>}
 */
export async function disconnectDB() {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    throw error;
  }
}

export default { connectDB, disconnectDB };

