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

    // Validate connection string format
    if (typeof mongoURI !== 'string') {
      throw new Error('MONGODB_URI must be a string.');
    }

    // Remove surrounding quotes if present (common in .env files)
    let cleanedURI = mongoURI.trim();
    if ((cleanedURI.startsWith('"') && cleanedURI.endsWith('"')) || 
        (cleanedURI.startsWith("'") && cleanedURI.endsWith("'"))) {
      cleanedURI = cleanedURI.slice(1, -1).trim();
    }

    // Check if connection string starts with mongodb:// or mongodb+srv://
    if (!cleanedURI.startsWith('mongodb://') && !cleanedURI.startsWith('mongodb+srv://')) {
      throw new Error('Invalid MongoDB connection string format. It must start with "mongodb://" or "mongodb+srv://". ' +
        'Note: Remove quotes around the value in your .env file.');
    }

    const options = {
      // Use modern mongoose defaults
      // These options are optional but help with connection stability
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
    };

    await mongoose.connect(cleanedURI, options);
    
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
    
    // Provide helpful diagnostic information
    if (error.code === 'ECONNREFUSED' || error.syscall === 'querySrv') {
      console.error('\n💡 Troubleshooting tips:');
      console.error('   1. Check that your MongoDB connection string starts with "mongodb+srv://" or "mongodb://"');
      console.error('   2. Verify the cluster hostname is correct in your .env file');
      console.error('   3. Ensure your MongoDB Atlas cluster is running and accessible');
      console.error('   4. Check your network connection and firewall settings');
      console.error('   5. Verify your MongoDB Atlas IP whitelist includes your current IP');
      console.error('\n   Connection string format should be:');
      console.error('   mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/<database>?retryWrites=true&w=majority');
    } else if (error.message.includes('authentication failed')) {
      console.error('\n💡 Authentication failed:');
      console.error('   1. Verify your username and password in the connection string');
      console.error('   2. Ensure your MongoDB user has the correct permissions');
    } else if (error.message.includes('Invalid')) {
      console.error('\n💡 Invalid connection string format detected');
    }
    
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

