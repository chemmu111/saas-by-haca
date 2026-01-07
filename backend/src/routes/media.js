import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer'; // Import multer

const router = express.Router();

// Resolve uploads directory relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Prepend a timestamp to the original filename to ensure uniqueness
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

// Create the multer upload middleware
const upload = multer({ storage: storage });

// GET /api/media - list all uploaded files
router.get('/', async (req, res) => {
    try {
        const files = await fs.promises.readdir(uploadsDir);
        // Return URLs for each file
        const baseUrl = process.env.API_URL || 'http://localhost:5000';
        const fileData = files.map(fname => ({
            name: fname,
            url: `${baseUrl}/uploads/${fname}`,
        }));
        res.json({ success: true, data: fileData });
    } catch (err) {
        console.error('Error reading uploads directory:', err);
        res.status(500).json({ success: false, error: 'Failed to list media files' });
    }
});

// POST /api/media/upload - upload a new file
router.post('/upload', upload.single('mediaFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

    res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
            name: req.file.filename,
            url: fileUrl,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        }
    });
});

// GET /api/media/check - Check if multiple media files exist
router.post('/check', async (req, res) => {
    try {
        const { filenames } = req.body;
        
        if (!Array.isArray(filenames)) {
            return res.status(400).json({ 
                success: false, 
                error: 'filenames must be an array' 
            });
        }

        const results = {};
        
        for (const filename of filenames) {
            // Extract just the filename from URL if full URL is provided
            let cleanFilename = filename;
            if (filename.includes('/uploads/')) {
                cleanFilename = filename.split('/uploads/')[1].split('?')[0];
            } else if (filename.includes('/api/images/')) {
                cleanFilename = filename.split('/api/images/')[1].split('?')[0];
            } else if (filename.includes('/')) {
                cleanFilename = filename.split('/').pop().split('?')[0];
            }
            
            const filePath = path.join(uploadsDir, cleanFilename);
            try {
                await fs.promises.access(filePath, fs.constants.F_OK);
                results[filename] = { exists: true, filename: cleanFilename };
            } catch (err) {
                results[filename] = { exists: false, filename: cleanFilename };
            }
        }

        res.json({ 
            success: true, 
            data: results 
        });
    } catch (err) {
        console.error('Error checking media files:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to check media files' 
        });
    }
});

// DELETE /api/media/:filename - delete a specific file
router.delete('/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    try {
        // Check if the file exists before attempting to delete
        await fs.promises.access(filePath, fs.constants.F_OK);
        await fs.promises.unlink(filePath);
        res.json({ success: true, message: `File '${filename}' deleted successfully.` });
    } catch (err) {
        if (err.code === 'ENOENT') {
            // File not found
            res.status(404).json({ success: false, error: `File '${filename}' not found.` });
        } else {
            console.error(`Error deleting file '${filename}':`, err);
            res.status(500).json({ success: false, error: `Failed to delete file '${filename}'.` });
        }
    }
});

export default router;
