/**
 * Migration script to add role field to existing users
 * Run this script once to update all existing users without a role field
 * 
 * Usage: node backend/src/scripts/migrateUsersAddRole.js
 */

import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../database/connection.js';
import User from '../models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function migrateUsers() {
  try {
    console.log('🔄 Starting user role migration...\n');

    // Connect to database
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('❌ MONGODB_URI is required. Please set it in your .env file.');
      process.exit(1);
    }

    await connectDB(mongoURI);
    console.log('✅ Connected to database\n');

    // Find all users without a role field
    const usersWithoutRole = await User.find({ 
      $or: [
        { role: { $exists: false } },
        { role: null },
        { role: '' }
      ]
    });

    console.log(`📊 Found ${usersWithoutRole.length} user(s) without role field\n`);

    if (usersWithoutRole.length === 0) {
      console.log('✅ All users already have a role field. No migration needed.');
      await disconnectDB();
      process.exit(0);
    }

    // Update all users without role to have default role
    const result = await User.updateMany(
      { 
        $or: [
          { role: { $exists: false } },
          { role: null },
          { role: '' }
        ]
      },
      { 
        $set: { role: 'social media manager' }
      }
    );

    console.log(`✅ Successfully updated ${result.modifiedCount} user(s) with default role: 'social media manager'\n`);

    // Verify the update
    const updatedUsers = await User.find({ 
      $or: [
        { role: { $exists: false } },
        { role: null },
        { role: '' }
      ]
    });

    if (updatedUsers.length === 0) {
      console.log('✅ Migration completed successfully! All users now have a role field.');
    } else {
      console.warn(`⚠️  Warning: ${updatedUsers.length} user(s) still missing role field.`);
    }

    // Show updated users
    const allUsers = await User.find({}).select('name email role').lean();
    console.log('\n📋 Updated users:');
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role || 'NOT SET'}`);
    });

    await disconnectDB();
    console.log('\n✅ Migration completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    await disconnectDB().catch(() => {});
    process.exit(1);
  }
}

// Run migration
migrateUsers();

