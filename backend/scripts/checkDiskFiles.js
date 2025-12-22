import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.resolve(__dirname, '../uploads');

const filesToCheck = [
    'image-1764912427739-61041836.mp4',
    'image-1764744050765-116029246.mp4',
    'image-1764135807636-612312795.mp4'
];

console.log(`Checking uploads directory: ${uploadsDir}`);

filesToCheck.forEach(filename => {
    const filePath = path.join(uploadsDir, filename);
    const exists = fs.existsSync(filePath);
    console.log(`File: ${filename}`);
    console.log(`  Exists: ${exists}`);
    if (exists) {
        const stats = fs.statSync(filePath);
        console.log(`  Size: ${stats.size}`);
    }
});

// Also list directory to see what IS there
console.log('\nListing first 10 files in uploads:');
try {
    const files = fs.readdirSync(uploadsDir);
    files.slice(0, 10).forEach(f => console.log(f));
} catch (e) {
    console.error('Error listing directory:', e);
}
