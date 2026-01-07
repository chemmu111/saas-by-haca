import express from 'express';
import Template from '../models/Template.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();
router.use(requireAuth);

// GET all templates for the user
router.get('/', async (req, res) => {
    try {
        const templates = await Template.find({ createdBy: req.user.sub }).sort({ createdAt: -1 });
        res.json({ success: true, data: templates });
    } catch (err) {
        console.error('Error fetching templates:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch templates' });
    }
});

// POST create new template
router.post('/', async (req, res) => {
    try {
        const { name, content, platform } = req.body;
        if (!name) return res.status(400).json({ success: false, error: 'Template name required' });
        const template = new Template({ name, content, platform, createdBy: req.user.sub });
        await template.save();
        res.status(201).json({ success: true, data: template });
    } catch (err) {
        console.error('Error creating template:', err);
        res.status(500).json({ success: false, error: 'Failed to create template' });
    }
});

// PUT update template
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, content, platform } = req.body;
        const template = await Template.findOne({ _id: id, createdBy: req.user.sub });
        if (!template) return res.status(404).json({ success: false, error: 'Template not found' });
        if (name !== undefined) template.name = name;
        if (content !== undefined) template.content = content;
        if (platform !== undefined) template.platform = platform;
        await template.save();
        res.json({ success: true, data: template });
    } catch (err) {
        console.error('Error updating template:', err);
        res.status(500).json({ success: false, error: 'Failed to update template' });
    }
});

// DELETE template
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Template.deleteOne({ _id: id, createdBy: req.user.sub });
        if (result.deletedCount === 0) return res.status(404).json({ success: false, error: 'Template not found' });
        res.json({ success: true, message: 'Template deleted' });
    } catch (err) {
        console.error('Error deleting template:', err);
        res.status(500).json({ success: false, error: 'Failed to delete template' });
    }
});

export default router;
