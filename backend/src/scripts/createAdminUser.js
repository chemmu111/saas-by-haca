/**
 * Script to create the default admin user
 * Run this script once to create the admin user
 * 
 * Usage: node backend/src/scripts/createAdminUser.js
 */

import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../database/connection.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function createAdminUser() {
  try {
    console.log('🔄 Creating admin user...\n');

    // Connect to database
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('❌ MONGODB_URI is required. Please set it in your .env file.');
      process.exit(1);
    }

    await connectDB(mongoURI);
    console.log('✅ Connected to database\n');

    const adminEmail = 'hacaadmin@gmail.com';
    const adminPassword = 'adminhaca';
    const adminName = 'Admin User';

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      
      // Update existing admin user
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      existingAdmin.passwordHash = passwordHash;
      existingAdmin.role = 'admin';
      existingAdmin.name = adminName;
      await existingAdmin.save();
      
      console.log('✅ Admin user updated successfully!\n');
      console.log('📋 Admin credentials:');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log(`   Role: admin\n`);
    } else {
      // Create new admin user
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const adminUser = await User.create({
        name: adminName,
        email: adminEmail.toLowerCase(),
        passwordHash: passwordHash,
        role: 'admin'
      });

      console.log('✅ Admin user created successfully!\n');
      console.log('📋 Admin credentials:');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log(`   Role: admin\n`);
    }

    await disconnectDB();
    console.log('✅ Script completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    await disconnectDB().catch(() => {});
    process.exit(1);
  }
}

// Run script
createAdminUser();


