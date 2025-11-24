import express from 'express';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();
router.use(requireAuth);

// POST /api/ai/generate-caption
router.post('/generate-caption', async (req, res) => {
    // Placeholder for AI logic
    const { topic, tone } = req.body;
    const mockCaption = `Here is a ${tone || 'professional'} caption about ${topic || 'something amazing'}! 🚀 #growth #socialmedia`;

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    res.json({ success: true, data: mockCaption });
});

// POST /api/ai/generate-hashtags
router.post('/generate-hashtags', async (req, res) => {
    const { topic } = req.body;
    const mockHashtags = ['#viral', '#trending', `#${topic?.replace(/\s+/g, '') || 'content'}`, '#fyp', '#growth'];

    await new Promise(resolve => setTimeout(resolve, 1000));

    res.json({ success: true, data: mockHashtags });
});

export default router;
