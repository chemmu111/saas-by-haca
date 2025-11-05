import express from 'express';
import Client from '../models/Client.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/clients - Get all clients for the authenticated user
router.get('/', async (req, res) => {
  try {
    const clients = await Client.find({ createdBy: req.user.sub })
      .sort({ createdAt: -1 })
      .select('-createdBy -accessToken -refreshToken');
    
    res.json({ success: true, data: clients, count: clients.length });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch clients' });
  }
});

// POST /api/clients - Create a new client (manual entry)
router.post('/', async (req, res) => {
  try {
    const { name, email, socialMediaLink } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    // Basic email validation
    if (!/.+@.+\..+/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Create new client (manual entry)
    const client = new Client({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      socialMediaLink: socialMediaLink ? socialMediaLink.trim() : '',
      platform: 'manual',
      createdBy: req.user.sub
    });

    await client.save();

    // Return client without createdBy field
    const clientData = client.toObject();
    delete clientData.createdBy;
    delete clientData.accessToken; // Don't send tokens to frontend
    delete clientData.refreshToken;

    res.status(201).json({ success: true, data: clientData });
  } catch (error) {
    console.error('Error creating client:', error);
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        error: 'A client with this email already exists'
      });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create client' });
    }
  }
});

// GET /api/clients/count - Get client count for dashboard
router.get('/count', async (req, res) => {
  try {
    const count = await Client.countDocuments({ createdBy: req.user.sub });
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error fetching client count:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch client count' });
  }
});

export default router;

