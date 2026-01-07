import express from 'express';
import Folder from '../models/Folder.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/folders
router.get('/', async (req, res) => {
    try {
        const folders = await Folder.find({ createdBy: req.user._id }).sort({ name: 1 });
        res.json({ success: true, data: folders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/folders
router.post('/', async (req, res) => {
    try {
        const folder = new Folder({ ...req.body, createdBy: req.user._id });
        await folder.save();
        res.status(201).json({ success: true, data: folder });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// DELETE /api/folders/:id
router.delete('/:id', async (req, res) => {
    try {
        await Folder.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
        res.json({ success: true, message: 'Folder deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
