import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Client from '../models/Client.js';
import requireAuth from '../middleware/requireAuth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// ===== PROFILE SETTINGS =====

// GET /api/settings/profile - Get user profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId).select('name email bio role avatar gender');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        bio: user.bio || '',
        avatar: user.avatar || '',
        gender: user.gender || '',
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// Import centralized upload middleware
import upload from '../middleware/upload.js';

// POST /api/settings/avatar - Upload profile avatar
router.post('/avatar', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Use the file path returned by the middleware (Cloudinary URL or local path)
    // upload middleware already handles storage logic
    let fileUrl;

    if (req.file.path) {
      fileUrl = req.file.path;
    } else {
      // Fallback for local storage if path didn't come through full url (shouldn't happen with correct middleware)
      const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
      fileUrl = `${backendUrl}/uploads/${req.file.filename}`;
    }

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      url: fileUrl
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to upload avatar' });
  }
});

// PUT /api/settings/profile - Update user profile
router.put('/profile', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { name, email, bio, avatar, gender } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Valid email is required' });
    }

    if (bio && bio.length > 500) {
      return res.status(400).json({ success: false, error: 'Bio must be less than 500 characters' });
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'Email already in use' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.toLowerCase();
    if (bio !== undefined) updateData.bio = bio.trim();
    if (avatar !== undefined) updateData.avatar = avatar;
    if (gender !== undefined) updateData.gender = gender;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('name email bio role avatar gender');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        name: user.name,
        email: user.email,
        bio: user.bio || '',
        avatar: user.avatar || '',
        gender: user.gender || '',
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// ===== NOTIFICATION SETTINGS =====

// GET /api/settings/notifications - Get notification settings
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId).select('notificationSettings');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const defaultSettings = {
      emailAlerts: true,
      tokenAlerts: true,
      reminders: true,
      weeklyReports: false
    };

    res.json({
      success: true,
      data: user.notificationSettings || defaultSettings
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notification settings' });
  }
});

// PUT /api/settings/notifications - Update notification settings
router.put('/notifications', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { emailAlerts, tokenAlerts, reminders, weeklyReports } = req.body;

    const notificationSettings = {};
    if (emailAlerts !== undefined) notificationSettings.emailAlerts = Boolean(emailAlerts);
    if (tokenAlerts !== undefined) notificationSettings.tokenAlerts = Boolean(tokenAlerts);
    if (reminders !== undefined) notificationSettings.reminders = Boolean(reminders);
    if (weeklyReports !== undefined) notificationSettings.weeklyReports = Boolean(weeklyReports);

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { notificationSettings } },
      { new: true, runValidators: true }
    ).select('notificationSettings');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: user.notificationSettings
    });
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to update notification settings' });
  }
});

// ===== SECURITY SETTINGS =====

// POST /api/settings/change-password - Change password
router.post('/change-password', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, error: 'All password fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'New passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    user.passwordHash = passwordHash;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

// POST /api/settings/enable-2fa - Toggle 2FA
router.post('/enable-2fa', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { enabled } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { twoFactorEnabled: Boolean(enabled) } },
      { new: true }
    ).select('twoFactorEnabled');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: { twoFactorEnabled: user.twoFactorEnabled }
    });
  } catch (error) {
    console.error('Error toggling 2FA:', error);
    res.status(500).json({ success: false, error: 'Failed to update 2FA settings' });
  }
});

// POST /api/settings/logout-all - Logout from all devices
router.post('/logout-all', async (req, res) => {
  try {
    const userId = req.user.sub;

    // Clear all sessions
    await User.findByIdAndUpdate(
      userId,
      { $set: { sessions: [] } }
    );

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });
  } catch (error) {
    console.error('Error logging out from all devices:', error);
    res.status(500).json({ success: false, error: 'Failed to logout from all devices' });
  }
});

// GET /api/settings/security - Get security settings
router.get('/security', async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId).select('twoFactorEnabled sessions');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const formattedSessions = (user.sessions || []).map(session => ({
      id: session._id,
      deviceName: session.deviceName || 'Unknown Device',
      ip: session.ip || 'Unknown IP',
      lastActive: session.lastActive || session.createdAt,
      createdAt: session.createdAt,
      isCurrent: req.user.sessionId && session._id && session._id.toString() === req.user.sessionId
    }));

    res.json({
      success: true,
      data: {
        twoFactorEnabled: user.twoFactorEnabled || false,
        activeSessions: formattedSessions.length,
        sessions: formattedSessions
      }
    });
  } catch (error) {
    console.error('Error fetching security settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch security settings' });
  }
});

// DELETE /api/settings/security/sessions/:sessionId - Revoke a specific session
router.delete('/security/sessions/:sessionId', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Session ID is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Filter out the session to be revoked
    const originalLength = user.sessions.length;
    user.sessions = user.sessions.filter(s => s._id.toString() !== sessionId);

    if (user.sessions.length === originalLength) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    await user.save();

    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({ success: false, error: 'Failed to revoke session' });
  }
});

// ===== TOKEN HEALTH =====

// GET /api/settings/token-health - Get Instagram token status
router.get('/token-health', async (req, res) => {
  try {
    const userId = req.user.sub;

    const clients = await Client.find({ createdBy: userId }).select(
      'name platform instagramAccessToken instagramRefreshToken instagramTokenExpiresAt pageAccessToken longLivedUserToken tokenExpiresAt igUserId'
    );

    const now = new Date();
    const tokens = clients.map(client => {
      const hasToken = Boolean(client.instagramAccessToken || client.pageAccessToken || client.longLivedUserToken);
      const expiresAt = client.instagramTokenExpiresAt || client.tokenExpiresAt || null;

      let tokenStatus = 'no_token';
      if (hasToken && expiresAt) {
        tokenStatus = expiresAt > now ? 'active' : 'expired';
      } else if (hasToken && !expiresAt) {
        tokenStatus = 'active';
      }

      const expiresInDays = expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : null;

      return {
        clientId: client._id,
        name: client.name,
        instagramConnected: client.platform === 'instagram' && Boolean(client.igUserId || hasToken),
        tokenStatus,
        expiresAt,
        expiresInDays
      };
    });

    res.json({
      success: true,
      data: {
        totalClients: clients.length,
        tokens
      }
    });
  } catch (error) {
    console.error('Error fetching token health:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch token health' });
  }
});

// ===== APPEARANCE SETTINGS =====

// GET /api/settings/theme - Get theme settings
router.get('/theme', async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId).select('theme');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const defaultTheme = {
      mode: 'light',
      color: 'blue'
    };

    res.json({
      success: true,
      data: user.theme || defaultTheme
    });
  } catch (error) {
    console.error('Error fetching theme:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch theme settings' });
  }
});

// PUT /api/settings/theme - Update theme settings
router.put('/theme', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { mode, color } = req.body;

    const theme = {};
    if (mode && ['light', 'dark', 'auto'].includes(mode)) {
      theme.mode = mode;
    }
    if (color) {
      theme.color = color;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { theme } },
      { new: true, runValidators: true }
    ).select('theme');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Theme updated successfully',
      data: user.theme
    });
  } catch (error) {
    console.error('Error updating theme:', error);
    res.status(500).json({ success: false, error: 'Failed to update theme' });
  }
});

// ===== PREFERENCES =====

// GET /api/settings/preferences - Get preferences
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId).select('preferences');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const defaultPreferences = {
      language: 'en',
      timezone: 'UTC',
      defaultTab: 'overview',
      defaultDateRange: '7days'
    };

    res.json({
      success: true,
      data: user.preferences || defaultPreferences
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch preferences' });
  }
});

// PUT /api/settings/preferences - Update preferences
router.put('/preferences', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { language, timezone, defaultTab, defaultDateRange } = req.body;

    const preferences = {};
    if (language) preferences.language = language;
    if (timezone) preferences.timezone = timezone;
    if (defaultTab) preferences.defaultTab = defaultTab;
    if (defaultDateRange) preferences.defaultDateRange = defaultDateRange;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { preferences } },
      { new: true, runValidators: true }
    ).select('preferences');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: user.preferences
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
});

// ===== LEGACY ROUTES (for backward compatibility) =====

// GET /api/settings - Get all user settings
router.get('/', async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId).select('email name role bio theme notificationSettings preferences twoFactorEnabled');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        email: user.email,
        name: user.name,
        role: user.role,
        bio: user.bio || '',
        theme: user.theme || { mode: 'light', color: 'blue' },
        notificationSettings: user.notificationSettings || {},
        preferences: user.preferences || {},
        twoFactorEnabled: user.twoFactorEnabled || false
      }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

export default router;


