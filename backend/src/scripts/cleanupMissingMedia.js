import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import Post from '../models/Post.js';
import { connectDB } from '../database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

const uploadsDir = resolve(__dirname, '../../uploads');

async function checkMissingMedia() {
  console.log('\n🔍 Checking for posts with missing media files...\n');
  
  try {
    // Get all posts with media URLs
    const posts = await Post.find({
      mediaUrls: { $exists: true, $ne: [] }
    }).select('_id caption content mediaUrls status createdAt');

    console.log(`Found ${posts.length} post(s) with media URLs\n`);

    let missingCount = 0;
    const postsWithMissingMedia = [];

    for (const post of posts) {
      if (!post.mediaUrls || post.mediaUrls.length === 0) continue;

      const missingFiles = [];
      
      for (const mediaUrl of post.mediaUrls) {
        // Extract filename from URL
        let filename = null;
        try {
          if (mediaUrl.includes('/uploads/')) {
            filename = mediaUrl.split('/uploads/')[1].split('?')[0];
          } else if (mediaUrl.includes('/api/images/')) {
            filename = mediaUrl.split('/api/images/')[1].split('?')[0];
          } else {
            // Try to extract from end of URL
            const parts = mediaUrl.split('/');
            filename = parts[parts.length - 1].split('?')[0];
          }

          if (filename) {
            const filePath = resolve(uploadsDir, filename);
            if (!fs.existsSync(filePath)) {
              missingFiles.push({ url: mediaUrl, filename });
            }
          }
        } catch (error) {
          // Skip if we can't parse the URL
          continue;
        }
      }

      if (missingFiles.length > 0) {
        missingCount++;
        postsWithMissingMedia.push({
          postId: post._id,
          caption: post.caption || post.content || 'No caption',
          status: post.status,
          createdAt: post.createdAt,
          missingFiles: missingFiles.map(f => f.filename)
        });

        console.log(`❌ Post ${post._id}:`);
        console.log(`   Caption: ${post.caption || post.content || 'No caption'}`);
        console.log(`   Status: ${post.status}`);
        console.log(`   Missing files (${missingFiles.length}):`);
        missingFiles.forEach(f => {
          console.log(`     - ${f.filename}`);
        });
        console.log('');
      }
    }

    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   Total posts checked: ${posts.length}`);
    console.log(`   Posts with missing media: ${missingCount}`);
    console.log(`   Posts with valid media: ${posts.length - missingCount}`);
    console.log('='.repeat(60));

    if (postsWithMissingMedia.length > 0) {
      console.log('\n💡 Options:');
      console.log('   1. These posts will show placeholders in the UI');
      console.log('   2. You can manually delete or update these posts');
      console.log('   3. Or re-upload the missing media files');
      console.log('\n⚠️  Note: Posts are kept in database for historical records');
      console.log('   Missing media files just show placeholders in the UI.\n');
    } else {
      console.log('\n✅ All media files are present!\n');
    }

    return postsWithMissingMedia;
  } catch (error) {
    console.error('❌ Error checking missing media:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting missing media check...\n');
    console.log('='.repeat(60));
    
    // Connect to database
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI is required in .env file');
    }
    await connectDB(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Check for missing media
    await checkMissingMedia();

    console.log('='.repeat(60));
    console.log('✅ Check completed successfully!\n');
    
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









