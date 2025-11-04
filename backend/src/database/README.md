# Database Configuration

This folder contains the database connection and configuration files for the Social Media Management Platform.

## Files

- **connection.js** - Main database connection module
  - `connectDB(mongoURI)` - Establishes connection to MongoDB
  - `disconnectDB()` - Closes the database connection
  - Handles connection events (error, disconnected, reconnected)
  - Manages graceful shutdown

- **config.js** - Database configuration constants
  - Database connection options
  - Helper functions for database status

## Usage

The database connection is automatically established when the server starts. The connection string is read from the `.env` file:

```env
MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/?appName=AppName"
```

## Connection Status

The connection module provides event handlers for:
- ✅ Successful connection
- ❌ Connection errors
- ⚠️  Disconnection events
- 🔄 Reconnection events

## Models

Database models are located in `../models/` directory:
- `User.js` - User model for authentication

