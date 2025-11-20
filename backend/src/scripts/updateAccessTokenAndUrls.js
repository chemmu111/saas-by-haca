import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import Client from '../models/Client.js';
import Post from '../models/Post.js';
import { connectDB } from '../database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

// Configuration
const NEW_ACCESS_TOKEN = 'EAAf0p4LmEfQBPwiuLt55Uwex2whLZBeY6cKROIfZBKw6hNiZBVLl6dMSKETL0bi7sB8OtqAoAFPSVZAZBwQ0OxRrEwMFQGndc3CIjSjrBscWK3XbsyPwmkjGMpB12Bri1gfEZCE2PeLZAlvfuYtpqdxZBXgB1xNRzKUNpfwgtZBLNcrI0UgYgGdZAsmYcJ2lZAP3uZBkj2j5ahIsa0UV0NGprnjQTgVZBtywPW4dlypc8JpLThQF0niJahBYUcPna262pOFf13CUcAonHa1QPBG08sk5J';
const CURRENT_NGROK_URL = 'https://geneva-incapacious-romana.ngrok-free.dev';
const OLD_NGROK_URLS = [
  'https://kody-electrochemical-semisentimentally.ngrok-free.dev',
  'https://geneva-incapacious-romana.ngrok-free.dev' // Will update to current if different
];

async function updateAccessTokens() {
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
      await client.save();
      
      console.log(`   ✅ Updated successfully`);
    }

    console.log(`\n✅ Successfully updated ${instagramClients.length} client(s)\n`);
  } catch (error) {
    console.error('❌ Error updating access tokens:', error);
    throw error;
  }
}

async function updateMediaUrls() {
  console.log('\n🖼️  Updating Media URLs in Posts...\n');
  
  try {
    // Find all posts with media URLs containing old ngrok URLs
    const posts = await Post.find({
      mediaUrls: { $exists: true, $ne: [] }
    });

    console.log(`Found ${posts.length} post(s) with media URLs`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const post of posts) {
      if (!post.mediaUrls || post.mediaUrls.length === 0) {
        skippedCount++;
        continue;
      }

      let updated = false;
      const updatedUrls = post.mediaUrls.map(url => {
        if (!url || typeof url !== 'string') return url;

        // Check if URL contains any old ngrok domain
        const needsUpdate = OLD_NGROK_URLS.some(oldUrl => url.includes(oldUrl)) ||
                           (url.includes('ngrok') && !url.includes(CURRENT_NGROK_URL));

        if (needsUpdate) {
          updated = true;
          // Extract the path (e.g., /uploads/filename.png)
          try {
            const urlObj = new URL(url);
            const newUrl = `${CURRENT_NGROK_URL}${urlObj.pathname}`;
            console.log(`   🔄 ${url.substring(0, 60)}... → ${newUrl.substring(0, 60)}...`);
            return newUrl;
          } catch (e) {
            // If URL parsing fails, try to extract path manually
            const pathMatch = url.match(/\/uploads\/[^\s]+/);
            if (pathMatch) {
              const newUrl = `${CURRENT_NGROK_URL}${pathMatch[0]}`;
              console.log(`   🔄 ${url.substring(0, 60)}... → ${newUrl.substring(0, 60)}...`);
              return newUrl;
            }
            return url; // Return original if we can't parse it
          }
        }
        return url;
      });

      if (updated) {
        post.mediaUrls = updatedUrls;
        await post.save();
        updatedCount++;
        console.log(`   ✅ Updated post: ${post._id}`);
      } else {
        skippedCount++;
      }
    }

    console.log(`\n✅ Updated ${updatedCount} post(s)`);
    console.log(`⏭️  Skipped ${skippedCount} post(s) (no changes needed)\n`);
  } catch (error) {
    console.error('❌ Error updating media URLs:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting update script...\n');
    console.log('='.repeat(60));
    
    // Connect to database
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI is required in .env file');
    }
    await connectDB(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Update access tokens
    await updateAccessTokens();

    // Update media URLs
    await updateMediaUrls();

    console.log('='.repeat(60));
    console.log('✅ All updates completed successfully!\n');
    
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

