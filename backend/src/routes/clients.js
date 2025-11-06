import express from 'express';
import mongoose from 'mongoose';
import Client from '../models/Client.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/clients - Get all clients for the authenticated user
router.get('/', async (req, res) => {
  try {
    const userIdString = req.user.sub || req.user.id || req.user._id;
    
    if (!userIdString) {
      console.error('No user ID found in token:', req.user);
      return res.status(401).json({ success: false, error: 'Invalid user token' });
    }

    // Convert string ID to ObjectId for MongoDB query
    const userId = mongoose.Types.ObjectId.isValid(userIdString) 
      ? new mongoose.Types.ObjectId(userIdString)
      : userIdString;

    console.log('Fetching clients for user:', userId, '(original:', userIdString, ')'); // Debug log
    
    const clients = await Client.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .select('-createdBy -accessToken -refreshToken');
    
    console.log(`Found ${clients.length} clients for user ${userId}`); // Debug log
    
    // Also check if there are any clients in the database at all
    const totalClients = await Client.countDocuments();
    console.log(`Total clients in database: ${totalClients}`); // Debug log
    
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

    // Get user ID from token
    const userIdString = req.user.sub || req.user.id || req.user._id;
    
    if (!userIdString) {
      return res.status(401).json({
        success: false,
        error: 'Invalid user token'
      });
    }

    // Convert string ID to ObjectId for MongoDB
    const userId = mongoose.Types.ObjectId.isValid(userIdString) 
      ? new mongoose.Types.ObjectId(userIdString)
      : userIdString;

    console.log('Creating client for user:', userId, '(original:', userIdString, ')'); // Debug log

    // Create new client (manual entry)
    const client = new Client({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      socialMediaLink: socialMediaLink ? socialMediaLink.trim() : '',
      platform: 'manual',
      createdBy: userId
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
    const userIdString = req.user.sub || req.user.id || req.user._id;
    
    if (!userIdString) {
      return res.status(401).json({ success: false, error: 'Invalid user token' });
    }

    // Convert string ID to ObjectId for MongoDB query
    const userId = mongoose.Types.ObjectId.isValid(userIdString) 
      ? new mongoose.Types.ObjectId(userIdString)
      : userIdString;

    const count = await Client.countDocuments({ createdBy: userId });
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error fetching client count:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch client count' });
  }
});

export default router;

