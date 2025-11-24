import express from 'express';
import User from '../models/User.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/settings - Get user settings
router.get('/', async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId).select('email name role settings');
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ 
      success: true, 
      data: {
        email: user.email,
        name: user.name,
        role: user.role,
        settings: user.settings || {}
      }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings - Update user settings
router.put('/', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { settings, name, email } = req.body;

    const updateData = {};
    if (settings !== undefined) {
      updateData.settings = settings;
    }
    if (name !== undefined) {
      updateData.name = name;
    }
    if (email !== undefined) {
      updateData.email = email;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('email name role settings');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ 
      success: true, 
      message: 'Settings updated successfully',
      data: {
        email: user.email,
        name: user.name,
        role: user.role,
        settings: user.settings || {}
      }
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// PATCH /api/settings - Partially update user settings
router.patch('/', async (req, res) => {
  try {
    const userId = req.user.sub;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.password;
    delete updates.role;
    delete updates.createdAt;
    delete updates.updatedAt;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('email name role settings');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ 
      success: true, 
      message: 'Settings updated successfully',
      data: {
        email: user.email,
        name: user.name,
        role: user.role,
        settings: user.settings || {}
      }
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

export default router;




