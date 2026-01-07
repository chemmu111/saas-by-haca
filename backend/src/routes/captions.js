import express from 'express';
import SavedCaption from '../models/SavedCaption.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/captions
router.get('/', async (req, res) => {
    try {
        const captions = await SavedCaption.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, data: captions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/captions
router.post('/', async (req, res) => {
    try {
        const caption = new SavedCaption({ ...req.body, createdBy: req.user._id });
        await caption.save();
        res.status(201).json({ success: true, data: caption });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// DELETE /api/captions/:id
router.delete('/:id', async (req, res) => {
    try {
        await SavedCaption.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
        res.json({ success: true, message: 'Caption deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
