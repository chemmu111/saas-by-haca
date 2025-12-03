import express from 'express';
import mongoose from 'mongoose';
import Client from '../models/Client.js';
import requireAuth from '../middleware/requireAuth.js';
import { updateClientStats } from '../services/analyticsService.js';

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

    // Check if any clients need stats update (older than 24h or never updated)
    // Only for Instagram clients with active tokens
    const now = new Date();
    const clientsToUpdate = clients.filter(c =>
      c.platform === 'instagram' &&
      c.tokenStatus && c.tokenStatus.state === 'active' &&
      (!c.statsLastUpdated || (now - new Date(c.statsLastUpdated)) > 24 * 60 * 60 * 1000)
    );

    // Trigger background update (don't wait for response)
    if (clientsToUpdate.length > 0) {
      console.log(`Triggering background stats update for ${clientsToUpdate.length} clients`);
      clientsToUpdate.forEach(async (client) => {
        try {
          const stats = await updateClientStats(client);
          if (stats) {
            await Client.findByIdAndUpdate(client._id, stats);
          }
        } catch (err) {
          console.error(`Background stats update failed for ${client.name}:`, err);
        }
      });
    }

    // Calculate dynamic token status for each client
    const clientsWithDynamicStatus = clients.map(client => {
      const clientObj = client.toObject();

      if (clientObj.platform === 'instagram' && clientObj.tokenExpiresAt) {
        const now = new Date();
        const expiresAt = new Date(clientObj.tokenExpiresAt);
        const diffTime = expiresAt - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Update status object
        if (!clientObj.tokenStatus) {
          clientObj.tokenStatus = {};
        }

        clientObj.tokenStatus.expiresInDays = diffDays;

        // Update state based on days remaining
        if (diffDays <= 0) {
          clientObj.tokenStatus.state = 'expired';
        } else if (diffDays <= 7) {
          clientObj.tokenStatus.state = 'expiring';
        } else {
          clientObj.tokenStatus.state = 'active';
        }
      }

      return clientObj;
    });

    res.json({ success: true, data: clientsWithDynamicStatus, count: clientsWithDynamicStatus.length });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch clients',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST /api/clients - Create a new client (manual entry)
router.post('/', async (req, res) => {
  try {
    const { name, email, socialMediaLink, phone, website, tags, brandColors } = req.body;

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
      phone: phone ? phone.trim() : '',
      website: website ? website.trim() : '',
      tags: Array.isArray(tags) ? tags : [],
      brandColors: brandColors || undefined,
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

// GET /api/clients/count - Get client count for dashboard (MUST be before /:id route)
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

// GET /api/clients/debug-token - Inspect token payload (MUST be before /:id route)
router.get('/debug-token', (req, res) => {
  const userIdString = req.user.sub || req.user.id || req.user._id;
  res.json({
    success: true,
    user: req.user,
    userIdString,
    isObjectId: mongoose.Types.ObjectId.isValid(userIdString)
  });
});

// GET /api/clients/:id - Get a single client by ID (MUST be last)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userIdString = req.user.sub || req.user.id || req.user._id;

    if (!userIdString) {
      return res.status(401).json({ success: false, error: 'Invalid user token' });
    }

    // Convert string ID to ObjectId for MongoDB query
    const userId = mongoose.Types.ObjectId.isValid(userIdString)
      ? new mongoose.Types.ObjectId(userIdString)
      : userIdString;

    // Validate client ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid client ID' });
    }

    const client = await Client.findOne({
      _id: id,
      createdBy: userId
    }).select('-createdBy -accessToken -refreshToken');

    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    res.json({ success: true, data: client });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch client' });
  }
});

// PUT /api/clients/:id - Update a client
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userIdString = req.user.sub || req.user.id || req.user._id;

    if (!userIdString) {
      return res.status(401).json({ success: false, error: 'Invalid user token' });
    }

    const userId = mongoose.Types.ObjectId.isValid(userIdString)
      ? new mongoose.Types.ObjectId(userIdString)
      : userIdString;

    // Prevent updating critical fields directly if needed, but for now allow most
    delete updates._id;
    delete updates.createdBy;
    delete updates.createdAt;
    delete updates.updatedAt;

    const client = await Client.findOneAndUpdate(
      { _id: id, createdBy: userId },
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-createdBy -accessToken -refreshToken');

    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    res.json({ success: true, data: client });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ success: false, error: 'Failed to update client' });
  }
});

// DELETE /api/clients/:id - Delete a client
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userIdString = req.user.sub || req.user.id || req.user._id;

    if (!userIdString) {
      return res.status(401).json({ success: false, error: 'Invalid user token' });
    }

    const userId = mongoose.Types.ObjectId.isValid(userIdString)
      ? new mongoose.Types.ObjectId(userIdString)
      : userIdString;

    const client = await Client.findOneAndDelete({
      _id: id,
      createdBy: userId
    });

    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    res.json({ success: true, message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ success: false, error: 'Failed to delete client' });
  }
});

// POST /api/clients/:id/notes - Add a note
router.post('/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userIdString = req.user.sub || req.user.id || req.user._id;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Note content is required' });
    }

    const userId = mongoose.Types.ObjectId.isValid(userIdString)
      ? new mongoose.Types.ObjectId(userIdString)
      : userIdString;

    const client = await Client.findOne({ _id: id, createdBy: userId });
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    client.notes.push({
      content,
      createdBy: userId,
      createdAt: new Date()
    });

    await client.save();
    res.json({ success: true, data: client.notes });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ success: false, error: 'Failed to add note' });
  }
});

// POST /api/clients/:id/tasks - Add a task
router.post('/:id/tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, status } = req.body;
    const userIdString = req.user.sub || req.user.id || req.user._id;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Task title is required' });
    }

    const userId = mongoose.Types.ObjectId.isValid(userIdString)
      ? new mongoose.Types.ObjectId(userIdString)
      : userIdString;

    const client = await Client.findOne({ _id: id, createdBy: userId });
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    client.tasks.push({
      title,
      description,
      dueDate,
      status: status || 'todo',
      createdBy: userId,
      createdAt: new Date()
    });

    await client.save();
    res.json({ success: true, data: client.tasks });
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).json({ success: false, error: 'Failed to add task' });
  }
});

// POST /api/clients/:id/sync - Manually sync client stats
router.post('/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const userIdString = req.user.sub || req.user.id || req.user._id;

    const userId = mongoose.Types.ObjectId.isValid(userIdString)
      ? new mongoose.Types.ObjectId(userIdString)
      : userIdString;

    const client = await Client.findOne({ _id: id, createdBy: userId });
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    if (client.platform !== 'instagram' || client.tokenStatus !== 'active') {
      return res.status(400).json({ success: false, error: 'Client is not connected to Instagram or token is invalid' });
    }

    const stats = await updateClientStats(client);
    if (stats) {
      const updatedClient = await Client.findByIdAndUpdate(
        id,
        stats,
        { new: true }
      ).select('-createdBy -accessToken -refreshToken');

      res.json({ success: true, data: updatedClient });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch stats from Instagram' });
    }
  } catch (error) {
    console.error('Error syncing client stats:', error);
    res.status(500).json({ success: false, error: 'Failed to sync client stats' });
  }
});

export default router;

