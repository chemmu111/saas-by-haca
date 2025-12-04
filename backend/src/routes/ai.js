import express from 'express';
import requireAuth from '../middleware/requireAuth.js';
import axios from 'axios';

const router = express.Router();
router.use(requireAuth);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Helper function to call Gemini API
async function callGemini(prompt) {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key is not configured');
    }

    try {
        const response = await axios.post(GEMINI_API_URL, {
            contents: [{
                parts: [{ text: prompt }]
            }]
        });

        if (response.data && response.data.candidates && response.data.candidates.length > 0) {
            return response.data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('No response from Gemini API');
        }
    } catch (error) {
        console.error('Gemini API Error:', error.response?.data || error.message);
        throw new Error('Failed to generate content using AI');
    }
}

// POST /api/ai/generate-caption
router.post('/generate-caption', async (req, res) => {
    try {
        const { topic, tone } = req.body;

        if (!topic) {
            return res.status(400).json({ success: false, error: 'Topic is required' });
        }

        const prompt = `Write a ${tone || 'professional'} Instagram caption about "${topic}". 
        Include relevant emojis. 
        Keep it engaging and concise. 
        Do not include hashtags in the main text, I will add them separately.`;

        const caption = await callGemini(prompt);

        res.json({ success: true, data: caption.trim() });
    } catch (error) {
        console.error('Error generating caption:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/ai/generate-hashtags
router.post('/generate-hashtags', async (req, res) => {
    try {
        const { topic, caption } = req.body;

        const context = caption || topic;
        if (!context) {
            return res.status(400).json({ success: false, error: 'Topic or caption is required' });
        }

        const prompt = `Generate 15-20 relevant, high-performing Instagram hashtags for a post about: "${context}".
        Return ONLY the hashtags separated by spaces. 
        Do not include any introductory text or numbering.
        Example format: #socialmedia #growth #marketing`;

        const hashtagsText = await callGemini(prompt);

        // Extract hashtags from response
        const hashtags = hashtagsText.match(/#[a-zA-Z0-9_]+/g) || [];

        res.json({ success: true, data: hashtags });
    } catch (error) {
        console.error('Error generating hashtags:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
