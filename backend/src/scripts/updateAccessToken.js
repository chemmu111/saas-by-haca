import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import Client from '../models/Client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

// New access token from Graph API Explorer
const NEW_ACCESS_TOKEN = 'EAAf0p4LmEfQBQBGAQz15ZAkh8JkfrhZAKM2nwPUXdGEZCqFbWY0powSaKygtvdIGXyKgkBAaGgfHB1tyZAyFTYnKVgqqq3jR62en1bW4o0tr8G535ijKB1E0rexS1y3zgiwVkNGHZCIFSxOuwJRmZBZANUdBgIAy4aOZC4lo5ZBgaZCHVSpQZCypxa9FIkZAWxLkLKlln8kprzASXygowTlrK66ZCIx1F4apxZAsoT';

async function updateAccessToken() {
  console.log('\n🔑 Updating Instagram Access Token from Graph API Explorer...\n');
  
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/saas-by-haca';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find all Instagram clients
    const instagramClients = await Client.find({ 
      $or: [
        { platform: 'instagram' },
        { igUserId: { $exists: true, $ne: null } },
        { pageAccessToken: { $exists: true, $ne: null } }
      ]
    });

    console.log(`Found ${instagramClients.length} Instagram client(s) to update\n`);

    if (instagramClients.length === 0) {
      console.log('⚠️  No Instagram clients found.');
      console.log('   Make sure you have connected Instagram accounts in the dashboard.\n');
      await mongoose.disconnect();
      return;
    }

    // Update each client's access token
    for (const client of instagramClients) {
      console.log(`📝 Updating client: ${client.name || 'Unknown'} (${client.email || 'No email'})`);
      console.log(`   Client ID: ${client._id}`);
      console.log(`   IG User ID: ${client.igUserId || 'Not set'}`);
      console.log(`   Old Token: ${client.pageAccessToken ? client.pageAccessToken.substring(0, 20) + '...' : 'None'}`);
      
      // Update the token
      client.pageAccessToken = NEW_ACCESS_TOKEN;
      client.tokenStatus = 'active';
      client.tokenLastValidated = new Date();
      client.tokenNeedsRefresh = false;
      
      // If token expiration info exists, keep it, otherwise set defaults
      if (!client.tokenExpiresAt) {
        // Set expiration to 60 days from now (typical for long-lived tokens)
        client.tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
        client.tokenExpiresIn = 5184000; // 60 days in seconds
        client.tokenCreatedAt = new Date();
      }
      
      await client.save();
      
      console.log(`   ✅ Updated successfully`);
      console.log(`   New Token: ${NEW_ACCESS_TOKEN.substring(0, 20)}...`);
      console.log(`   Token Status: ${client.tokenStatus}`);
      console.log(`   Expires At: ${client.tokenExpiresAt ? client.tokenExpiresAt.toISOString() : 'Not set'}\n`);
    }

    console.log(`✅ Successfully updated ${instagramClients.length} client(s)\n`);
    console.log('⚠️  Important: Test posting to Instagram to verify the token works!\n');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');
  } catch (error) {
    console.error('❌ Error updating access token:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the update
updateAccessToken()
  .then(() => {
    console.log('✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

