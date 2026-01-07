import express from 'express';
import requireAuth from '../middleware/requireAuth.js';
import axios from 'axios';

const router = express.Router();
router.use(requireAuth);

// Helper function to call Gemini API
async function callGemini(prompt) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY is not set');
        throw new Error('AI service is not configured.');
    }

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        console.log('🤖 Calling Gemini API...');
        const response = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 1024,
            }
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });

        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            console.log('✅ Response received');
            return response.data.candidates[0].content.parts[0].text;
        }
        throw new Error('No response from AI');
    } catch (error) {
        console.error('❌ Gemini Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || 'AI generation failed');
    }
}

// POST /api/ai/generate-caption
router.post('/generate-caption', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ success: false, error: 'Prompt is required' });
        }

        console.log(`📝 Generating caption: "${prompt.substring(0, 50)}..."`);

        const aiPrompt = `You are an expert Instagram caption writer.

Based on this request: "${prompt}"

Write a creative, engaging Instagram caption. Follow the user's instructions for style, mood, length, and emojis.

Rules:
- Match the requested tone and style exactly
- Use emojis only if requested or if they fit naturally
- Keep it Instagram-friendly with good spacing
- Do NOT add hashtags
- Just output the caption directly, no "Caption:" prefix

Output the caption only:`;

        const result = await callGemini(aiPrompt);

        // Clean up the response
        let caption = result.trim();
        caption = caption.replace(/^Caption:\s*/i, '');
        caption = caption.replace(/#[a-zA-Z0-9_]+/g, '').trim();

        res.json({ success: true, data: { caption } });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/ai/generate-hashtags
router.post('/generate-hashtags', async (req, res) => {
    try {
        const { topic, caption } = req.body;
        const context = caption || topic;

        if (!context) {
            return res.status(400).json({ success: false, error: 'Topic or caption required' });
        }

        const prompt = `Generate 15 relevant Instagram hashtags for: "${context}"
Return only hashtags separated by spaces, no explanations.
Example: #Marketing #Business #Growth`;

        const result = await callGemini(prompt);
        const hashtags = result.match(/#[a-zA-Z0-9_]+/g) || [];

        res.json({ success: true, data: hashtags });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
