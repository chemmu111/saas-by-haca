/**
 * Quick script to update Instagram token for a client by name
 * Usage: node --env-file=.env src/scripts/quickUpdateToken.js "MUHAMMAD NIDHIL" "TOKEN_HERE"
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { exchangeForLongLivedToken } from '../services/instagramTokenService.js';
import Client from '../models/Client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/social-media-manager';

async function main() {
  try {
    const clientName = process.argv[2] || 'MUHAMMAD NIDHIL';
    const token = process.argv[3] || process.env.INSTAGRAM_ACCESS_TOKEN;
    
    if (!token) {
      console.error('❌ No token provided!');
      console.error('Usage: node src/scripts/quickUpdateToken.js "Client Name" "TOKEN"');
      process.exit(1);
    }
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');
    
    console.log(`🔍 Finding client: "${clientName}"...`);
    const client = await Client.findOne({ 
      name: clientName,
      platform: 'instagram'
    });
    
    if (!client) {
      console.error(`❌ Client "${clientName}" not found!`);
      console.log('\nAvailable Instagram clients:');
      const allClients = await Client.find({ platform: 'instagram' });
      allClients.forEach(c => console.log(`  - ${c.name} (${c._id})`));
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log(`✅ Found client: ${client.name} (${client._id})`);
    console.log(`   IG User ID: ${client.igUserId || 'N/A'}`);
    console.log(`   Current token type: ${client.tokenType || 'unknown'}`);
    console.log(`   Current token status: ${client.tokenStatus || 'unknown'}\n`);
    
    console.log('🔄 Exchanging token for long-lived token (60 days)...');
    const longLivedTokenData = await exchangeForLongLivedToken(token);
    
    console.log('✅ Long-lived token obtained!');
    console.log(`   Expires in: ${Math.floor(longLivedTokenData.expiresIn / 86400)} days\n`);
    
    console.log('💾 Updating client in database...');
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
    
    console.log('✅ Token updated successfully!');
    console.log(`\n📊 Updated Client Info:`);
    console.log(`   Name: ${client.name}`);
    console.log(`   Token Type: ${client.tokenType}`);
    console.log(`   Token Status: ${client.tokenStatus}`);
    console.log(`   Expires At: ${client.tokenExpiresAt.toLocaleString()}`);
    console.log(`   Valid for: ${Math.floor(client.tokenExpiresIn / 86400)} days`);
    console.log(`\n✅ All done! Your token is now long-lived (60 days).\n`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

main();

