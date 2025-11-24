/**
 * Script to update existing Instagram token to long-lived token
 * This script exchanges a short-lived or existing token for a 60-day long-lived token
 * 
 * Usage: node --env-file=.env src/scripts/updateTokenToLongLived.js [token]
 * Or set INSTAGRAM_ACCESS_TOKEN in .env file
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { exchangeForLongLivedToken } from '../services/instagramTokenService.js';
import Client from '../models/Client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/social-media-manager';

/**
 * Update a specific client's token to long-lived
 */
async function updateClientTokenToLongLived(clientId, newToken) {
  try {
    console.log(`\n🔄 Updating client ${clientId} with long-lived token...`);
    
    // Exchange the provided token for long-lived
    console.log('📱 Exchanging token for long-lived token (60 days)...');
    const longLivedTokenData = await exchangeForLongLivedToken(newToken);
    
    // Find the client
    const client = await Client.findById(clientId);
    if (!client) {
      throw new Error(`Client not found: ${clientId}`);
    }
    
    // Update with long-lived token
    client.pageAccessToken = longLivedTokenData.accessToken;
    client.tokenType = 'long-lived';
    client.tokenCreatedAt = longLivedTokenData.createdAt;
    client.tokenExpiresIn = longLivedTokenData.expiresIn;
    client.tokenExpiresAt = new Date(longLivedTokenData.createdAt.getTime() + (longLivedTokenData.expiresIn * 1000));
    client.tokenLastRefreshed = longLivedTokenData.createdAt;
    client.tokenRefreshCount = 0;
    client.tokenStatus = 'active';
    client.tokenNeedsRefresh = false;
    
    await client.save();
    
    console.log('✅ Client token updated to long-lived successfully!');
    console.log(`   Client: ${client.name}`);
    console.log(`   Token type: long-lived`);
    console.log(`   Expires in: ${Math.floor(longLivedTokenData.expiresIn / 86400)} days`);
    console.log(`   Expires at: ${client.tokenExpiresAt.toLocaleDateString()}`);
    
    return client;
  } catch (error) {
    console.error(`❌ Error updating client ${clientId}:`, error.message);
    throw error;
  }
}

/**
 * Update all Instagram clients with a new long-lived token
 */
async function updateAllClientsWithToken(newToken) {
  try {
    console.log('\n🔄 Updating all Instagram clients with long-lived token...');
    
    // Exchange token for long-lived
    console.log('📱 Exchanging provided token for long-lived token (60 days)...');
    const longLivedTokenData = await exchangeForLongLivedToken(newToken);
    
    // Find all Instagram clients
    const clients = await Client.find({
      platform: 'instagram',
      igUserId: { $exists: true, $ne: null }
    });
    
    console.log(`📊 Found ${clients.length} Instagram client(s) to update`);
    
    let updated = 0;
    let failed = 0;
    
    for (const client of clients) {
      try {
        // Update with long-lived token
        client.pageAccessToken = longLivedTokenData.accessToken;
        client.tokenType = 'long-lived';
        client.tokenCreatedAt = longLivedTokenData.createdAt;
        client.tokenExpiresIn = longLivedTokenData.expiresIn;
        client.tokenExpiresAt = new Date(longLivedTokenData.createdAt.getTime() + (longLivedTokenData.expiresIn * 1000));
        client.tokenLastRefreshed = longLivedTokenData.createdAt;
        client.tokenRefreshCount = 0;
        client.tokenStatus = 'active';
        client.tokenNeedsRefresh = false;
        
        await client.save();
        
        console.log(`✅ Updated: ${client.name} (${client.igUserId})`);
        updated++;
      } catch (error) {
        console.error(`❌ Failed to update ${client.name}:`, error.message);
        failed++;
      }
    }
    
    console.log('\n📊 Update Summary:');
    console.log(`   ✅ Updated: ${updated} client(s)`);
    console.log(`   ❌ Failed: ${failed} client(s)`);
    console.log(`   Token type: long-lived (60 days)`);
    console.log(`   Expires at: ${longLivedTokenData.createdAt.toLocaleDateString()} + 60 days`);
    
    return { updated, failed };
  } catch (error) {
    console.error('❌ Error updating clients:', error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Get token from command line or environment
    const token = process.argv[2] || process.env.INSTAGRAM_ACCESS_TOKEN;
    
    if (!token) {
      console.error('❌ No token provided!');
      console.error('\nUsage:');
      console.error('  node --env-file=.env src/scripts/updateTokenToLongLived.js <token>');
      console.error('  OR set INSTAGRAM_ACCESS_TOKEN in .env file\n');
      console.error('To get a new token:');
      console.error('  1. Go to: https://developers.facebook.com/tools/explorer/');
      console.error('  2. Select your app');
      console.error('  3. Get User Token with permissions');
      console.error('  4. Copy the token\n');
      process.exit(1);
    }
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Check if client ID is provided
    const clientId = process.argv[3];
    
    if (clientId) {
      // Update specific client
      await updateClientTokenToLongLived(clientId, token);
    } else {
      // Update all clients
      await updateAllClientsWithToken(token);
    }
    
    console.log('\n✅ Token update completed successfully!');
    console.log('   All tokens are now long-lived (60 days)');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    console.error('   Error stack:', error.stack);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { updateClientTokenToLongLived, updateAllClientsWithToken };

