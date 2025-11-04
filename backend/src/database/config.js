/**
 * Database Configuration
 * 
 * This file contains database configuration constants and helpers
 */

export const DB_CONFIG = {
  // Connection options can be added here if needed
  options: {
    // Example: retryWrites: true,
    // Example: w: 'majority',
  }
};

/**
 * Get database connection status
 * @param {object} mongoose - Mongoose instance
 * @returns {object} Connection status information
 */
export function getDBStatus(mongoose) {
  if (!mongoose || !mongoose.connection) {
    return {
      readyState: 0,
      isConnected: false,
      message: 'Mongoose not initialized'
    };
  }
  
  return {
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    isConnected: mongoose.connection.readyState === 1
  };
}

export default DB_CONFIG;

