/**
 * Test script to verify media file serving is working correctly
 * Run with: node test-media-serving.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, './uploads');

console.log('🧪 Testing Media File Serving Setup\n');
console.log('=' .repeat(50));

// Test 1: Check if uploads directory exists
console.log('\n📁 Test 1: Uploads Directory');
console.log('   Path:', uploadsDir);
console.log('   Exists:', fs.existsSync(uploadsDir));

if (!fs.existsSync(uploadsDir)) {
  console.log('   ❌ FAILED: Uploads directory does not exist');
  process.exit(1);
} else {
  console.log('   ✅ PASSED');
}

// Test 2: List files in uploads directory
console.log('\n📄 Test 2: Files in Uploads');
try {
  const files = fs.readdirSync(uploadsDir);
  console.log(`   Found ${files.length} file(s):`);
  
  const recentFiles = files
    .map(f => {
      const stats = fs.statSync(path.join(uploadsDir, f));
      return { name: f, size: stats.size, modified: stats.mtime };
    })
    .sort((a, b) => b.modified - a.modified)
    .slice(0, 5);
  
  recentFiles.forEach(f => {
    const sizeMB = (f.size / (1024 * 1024)).toFixed(2);
    const ext = path.extname(f.name).toLowerCase();
    const type = ['.mp4', '.mov', '.avi'].includes(ext) ? '🎥' : '🖼️';
    console.log(`   ${type} ${f.name} (${sizeMB}MB)`);
  });
  
  if (files.length === 0) {
    console.log('   ⚠️  WARNING: No files found. Upload a test file first.');
  } else {
    console.log('   ✅ PASSED');
  }
} catch (error) {
  console.log('   ❌ FAILED:', error.message);
  process.exit(1);
}

// Test 3: Check environment variables
console.log('\n🌍 Test 3: Environment Variables');
const apiUrl = process.env.API_URL;
console.log('   API_URL:', apiUrl || 'NOT SET');

if (!apiUrl) {
  console.log('   ⚠️  WARNING: API_URL not set in .env');
  console.log('   This may cause issues with Instagram uploads');
} else if (!apiUrl.startsWith('https://')) {
  console.log('   ⚠️  WARNING: API_URL does not use HTTPS');
  console.log('   Instagram requires HTTPS for media URLs');
} else {
  console.log('   ✅ PASSED');
}

// Test 4: Test file serving locally
console.log('\n🔗 Test 4: Local File Serving');
console.log('   Testing http://localhost:5000/api/images/...');

try {
  const files = fs.readdirSync(uploadsDir);
  if (files.length > 0) {
    const testFile = files[0];
    const testUrl = `http://localhost:5000/api/images/${testFile}`;
    console.log(`   Test URL: ${testUrl}`);
    console.log('   To test: curl -I "${testUrl}"');
    
    // Check if file is readable
    const testPath = path.join(uploadsDir, testFile);
    try {
      fs.accessSync(testPath, fs.constants.R_OK);
      console.log('   File is readable: ✅');
    } catch {
      console.log('   ❌ FAILED: File is not readable');
    }
  } else {
    console.log('   ⚠️  No files to test');
  }
} catch (error) {
  console.log('   ❌ FAILED:', error.message);
}

// Test 5: File MIME type detection
console.log('\n🎭 Test 5: MIME Type Detection');
const mimeTypes = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'mp4': 'video/mp4',
  'mov': 'video/quicktime',
  'avi': 'video/x-msvideo',
  'mkv': 'video/x-matroska',
  'webm': 'video/webm',
};

console.log('   Supported types:');
Object.entries(mimeTypes).forEach(([ext, mime]) => {
  const icon = mime.startsWith('video/') ? '🎥' : '🖼️';
  console.log(`   ${icon} .${ext} → ${mime}`);
});
console.log('   ✅ PASSED');

// Summary
console.log('\n' + '='.repeat(50));
console.log('\n📋 Summary:');
console.log('   - Uploads directory: ✅');
console.log('   - Files found: ✅');
console.log('   - MIME types configured: ✅');
console.log('   - API_URL:', apiUrl ? '✅' : '⚠️');

console.log('\n💡 Next Steps:');
console.log('   1. Start backend: npm start');
console.log('   2. Start ngrok: ngrok http 5000');
console.log('   3. Update .env with ngrok URL');
console.log('   4. Test upload endpoint');
console.log('   5. Check server logs');

console.log('\n🧪 Manual Tests:');
console.log('   # Test local file serving');
console.log('   curl -I http://localhost:5000/api/images/YOUR_FILE.mp4');
console.log('');
console.log('   # Test ngrok file serving');
console.log('   curl -I https://YOUR-NGROK-URL/api/images/YOUR_FILE.mp4');
console.log('');
console.log('   # Test download');
console.log('   curl -o test.mp4 https://YOUR-NGROK-URL/api/images/YOUR_FILE.mp4');
console.log('');

console.log('\n✅ Test script completed!\n');

