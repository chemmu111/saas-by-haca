import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import Client from '../models/Client.js';
import { connectDB } from '../database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

// Get token from command line argument, env, or use the new Graph API Explorer token
const NEW_ACCESS_TOKEN = process.argv[2] || process.env.INSTAGRAM_ACCESS_TOKEN || 'EAAf0p4LmEfQBQBGAQz15ZAkh8JkfrhZAKM2nwPUXdGEZCqFbWY0powSaKygtvdIGXyKgkBAaGgfHB1tyZAyFTYnKVgqqq3jR62en1bW4o0tr8G535ijKB1E0rexS1y3zgiwVkNGHZCIFSxOuwJRmZBZANUdBgIAy4aOZC4lo5ZBgaZCHVSpQZCypxa9FIkZAWxLkLKlln8kprzASXygowTlrK66ZCIx1F4apxZAsoT';

if (!NEW_ACCESS_TOKEN) {
  console.error('\n❌ Error: No access token provided!\n');
  console.log('Usage:');
  console.log('  npm run update:instagram-token <YOUR_NEW_TOKEN>');
  console.log('  OR set INSTAGRAM_ACCESS_TOKEN in .env file\n');
  console.log('To get a new token:');
  console.log('  1. Go to: https://developers.facebook.com/tools/explorer/');
  console.log('  2. Select your app');
  console.log('  3. Get User Token with permissions: pages_manage_posts, instagram_content_publish');
  console.log('  4. Exchange for long-lived token');
  console.log('  5. Get Page Access Token from /me/accounts');
  console.log('\nOR re-authenticate through your app OAuth flow.\n');
  process.exit(1);
}

async function updateInstagramTokens() {
  console.log('\n🔑 Updating Instagram Access Tokens...\n');
  
  try {
    // Find all Instagram clients
    const instagramClients = await Client.find({ 
      platform: 'instagram',
      igUserId: { $exists: true, $ne: null }
    });

    console.log(`Found ${instagramClients.length} Instagram client(s) to update`);

    if (instagramClients.length === 0) {
      console.log('⚠️  No Instagram clients found. Make sure you have connected Instagram accounts.');
      return;
    }

    // Update each client's access token
    for (const client of instagramClients) {
      console.log(`\n📝 Updating client: ${client.name} (${client.email})`);
      console.log(`   IG User ID: ${client.igUserId}`);
      console.log(`   Old Token: ${client.pageAccessToken ? client.pageAccessToken.substring(0, 20) + '...' : 'None'}`);
      
      client.pageAccessToken = NEW_ACCESS_TOKEN;
      // Update token metadata
      client.tokenStatus = 'active';
      client.tokenLastValidated = new Date();
      client.tokenNeedsRefresh = false;
      client.tokenType = 'long-lived';
      
      // Set expiration to 60 days from now (typical for long-lived tokens)
      if (!client.tokenCreatedAt) {
        client.tokenCreatedAt = new Date();
      }
      client.tokenExpiresIn = 5184000; // 60 days in seconds
      client.tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      
      await client.save();
      
      console.log(`   ✅ Updated successfully`);
      console.log(`   New Token: ${NEW_ACCESS_TOKEN.substring(0, 20)}...`);
      console.log(`   Token Status: ${client.tokenStatus}`);
      console.log(`   Expires At: ${client.tokenExpiresAt.toISOString()}`);
    }

    console.log(`\n✅ Successfully updated ${instagramClients.length} client(s)\n`);
    console.log('⚠️  Important: Test posting to Instagram to verify the token works!\n');
  } catch (error) {
    console.error('❌ Error updating access tokens:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Instagram token update...\n');
    console.log('='.repeat(60));
    
    // Connect to database
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI is required in .env file');
    }
    await connectDB(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Update access tokens
    await updateInstagramTokens();

    console.log('='.repeat(60));
    console.log('✅ Update completed successfully!\n');
    
    // Close database connection
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
main();

