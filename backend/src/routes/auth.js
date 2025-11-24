import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import VerificationCode from '../models/VerificationCode.js';
import PasswordReset from '../models/PasswordReset.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js';
import Client from '../models/Client.js';
import mongoose from 'mongoose';
import { refreshLongLivedToken } from '../services/instagramTokenService.js';

const router = Router();

function isValidEmail(email) {
  return /.+@.+\..+/.test(email);
}

function signToken(user) {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, name: user.name }, secret, { expiresIn: '7d' });
}

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Name is required' });
    if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    // All signups are social media managers
    const userRole = 'social media manager';

    const existing = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), email: email.toLowerCase(), passwordHash, role: userRole });

    const token = signToken(user);
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Signup error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    console.log('🔐 Login attempt:', { email, passwordLength: password?.length });

    if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!password) return res.status(400).json({ error: 'Password is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ User found:', user.email);

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      console.log('❌ Password mismatch for:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ Password correct for:', email);

    // Ensure role exists (for existing users without role field)
    if (!user.role) {
      user.role = 'social media manager';
      await user.save();
    }

    // If user is admin, send verification email instead of logging in
    if (user.role === 'admin') {
      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Set expiration to 10 minutes from now
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      // Delete any existing verification codes for this user
      await VerificationCode.deleteMany({ email: user.email.toLowerCase(), used: false });

      // Save verification code
      await VerificationCode.create({
        email: user.email.toLowerCase(),
        code: verificationCode,
        expiresAt: expiresAt,
        userId: user._id
      });

      // Send verification email
      try {
        await sendVerificationEmail(user.email, verificationCode);
        return res.status(200).json({
          requiresVerification: true,
          message: 'Verification code sent to your email',
          email: user.email
        });
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
        return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
      }
    }

    // For non-admin users, proceed with normal login
    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!code || code.length !== 6) return res.status(400).json({ error: 'Valid 6-digit code is required' });

    // Find verification code
    const verification = await VerificationCode.findOne({
      email: email.toLowerCase(),
      code: code,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!verification) {
      return res.status(401).json({ error: 'Invalid or expired verification code' });
    }

    // Get user
    const user = await User.findById(verification.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Mark verification code as used
    verification.used = true;
    await verification.save();

    // Generate token and return user
    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Verification error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success (security best practice - don't reveal if email exists)
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Set expiration to 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Delete any existing unused reset tokens for this user
    await PasswordReset.deleteMany({
      email: email.toLowerCase(),
      used: false
    });

    // Save reset token
    await PasswordReset.create({
      email: email.toLowerCase(),
      token: resetToken,
      userId: user._id,
      expiresAt: expiresAt
    });

    // Generate reset URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5001';
    const resetUrl = `${frontendUrl}/reset-password.html?token=${resetToken}`;

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken, resetUrl);
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      return res.status(500).json({
        error: 'Failed to send password reset email. Please try again.'
      });
    }
  } catch (err) {
    console.error('Forgot password error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (!token) {
      return res.status(400).json({ error: 'Reset token is required' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Find reset token
    const passwordReset = await PasswordReset.findOne({
      token: token,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!passwordReset) {
      return res.status(401).json({ error: 'Invalid or expired reset token' });
    }

    // Get user
    const user = await User.findById(passwordReset.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password
    user.passwordHash = passwordHash;
    await user.save();

    // Mark reset token as used
    passwordReset.used = true;
    await passwordReset.save();

    // Delete all unused reset tokens for this user (security)
    await PasswordReset.deleteMany({
      email: user.email.toLowerCase(),
      used: false
    });

    return res.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });
  } catch (err) {
    console.error('Reset password error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/token-status/:clientId - Get token status
router.get('/token-status/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // If tokenStatus is still a string (old schema), return basic info
    if (typeof client.tokenStatus === 'string') {
      return res.json({
        state: client.tokenStatus,
        expiresInDays: null,
        lastRefresh: client.lastTokenRefresh,
        nextRefresh: null,
        lastRefreshStatus: 'unknown'
      });
    }

    res.json(client.tokenStatus);
  } catch (error) {
    console.error('Error fetching token status:', error);
    res.status(500).json({ error: 'Failed to fetch token status' });
  }
});

// POST /api/auth/refresh/:clientId - Force refresh token
router.post('/refresh/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (client.platform !== 'instagram' || !client.pageAccessToken) {
      return res.status(400).json({ error: 'Client is not connected to Instagram' });
    }

    console.log(`🔄 Force refreshing token for ${client.name}...`);
    const refreshResult = await refreshLongLivedToken(client.pageAccessToken);

    if (refreshResult.success) {
      client.pageAccessToken = refreshResult.accessToken;
      client.tokenCreatedAt = refreshResult.refreshedAt;
      client.tokenExpiresIn = refreshResult.expiresIn;
      client.tokenExpiresAt = new Date(refreshResult.refreshedAt.getTime() + (refreshResult.expiresIn * 1000));
      client.lastTokenRefresh = refreshResult.refreshedAt;

      client.tokenStatus = {
        state: refreshResult.expiresInDays > 30 ? 'active' : 'expiring',
        expiresInDays: refreshResult.expiresInDays,
        lastRefresh: refreshResult.refreshedAt,
        nextRefresh: refreshResult.nextRefresh,
        lastRefreshStatus: 'success'
      };

      client.tokenNeedsRefresh = false;
      await client.save();

      res.json({ success: true, status: client.tokenStatus });
    } else {
      client.tokenStatus = {
        state: 'expired',
        expiresInDays: 0,
        lastRefresh: new Date(),
        nextRefresh: null,
        lastRefreshStatus: 'failed'
      };
      await client.save();

      res.status(400).json({
        success: false,
        error: refreshResult.error || 'Token refresh failed',
        needReLogin: refreshResult.needReLogin
      });
    }
  } catch (error) {
    console.error('Error forcing token refresh:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// GET /api/token/check/:clientId - Real-time token validation via Facebook Debug API
router.get('/token/check/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (client.platform !== 'instagram' || !client.pageAccessToken) {
      return res.json({
        status: 'not_connected',
        isExpired: false,
        isExpiringSoon: false,
        expiresInDays: null,
        expiresAt: null
      });
    }

    // Use Facebook Debug Token API to validate token
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      console.warn('⚠️ Facebook App ID or Secret not configured');
      // Fallback to local calculation
      if (client.tokenExpiresAt) {
        const now = new Date();
        const expiresAt = new Date(client.tokenExpiresAt);
        const diffTime = expiresAt - now;
        const expiresInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return res.json({
          status: expiresInDays <= 0 ? 'expired' : expiresInDays <= 10 ? 'expiringSoon' : 'active',
          isExpired: expiresInDays <= 0,
          isExpiringSoon: expiresInDays > 0 && expiresInDays <= 10,
          expiresInDays: expiresInDays,
          expiresAt: client.tokenExpiresAt,
          source: 'local_calculation'
        });
      }

      return res.json({
        status: 'unknown',
        isExpired: false,
        isExpiringSoon: false,
        expiresInDays: null,
        expiresAt: null
      });
    }

    try {
      // Call Facebook Debug Token API
      const axios = (await import('axios')).default;
      const debugUrl = `https://graph.facebook.com/debug_token?input_token=${client.pageAccessToken}&access_token=${appId}|${appSecret}`;

      const response = await axios.get(debugUrl);
      const tokenData = response.data.data;

      if (!tokenData.is_valid) {
        // Token is invalid/expired
        return res.json({
          status: 'expired',
          isExpired: true,
          isExpiringSoon: false,
          expiresInDays: 0,
          expiresAt: client.tokenExpiresAt,
          source: 'facebook_api'
        });
      }

      // Calculate days until expiration
      const expiresAtTimestamp = tokenData.expires_at * 1000; // Convert to milliseconds
      const expiresAt = new Date(expiresAtTimestamp);
      const now = new Date();
      const diffTime = expiresAt - now;
      const expiresInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const status = expiresInDays <= 0 ? 'expired' : expiresInDays <= 10 ? 'expiringSoon' : 'active';

      return res.json({
        status: status,
        isExpired: expiresInDays <= 0,
        isExpiringSoon: expiresInDays > 0 && expiresInDays <= 10,
        expiresInDays: expiresInDays,
        expiresAt: expiresAt.toISOString(),
        source: 'facebook_api'
      });
    } catch (apiError) {
      console.error('Error calling Facebook Debug Token API:', apiError.message);

      // Fallback to local calculation
      if (client.tokenExpiresAt) {
        const now = new Date();
        const expiresAt = new Date(client.tokenExpiresAt);
        const diffTime = expiresAt - now;
        const expiresInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return res.json({
          status: expiresInDays <= 0 ? 'expired' : expiresInDays <= 10 ? 'expiringSoon' : 'active',
          isExpired: expiresInDays <= 0,
          isExpiringSoon: expiresInDays > 0 && expiresInDays <= 10,
          expiresInDays: expiresInDays,
          expiresAt: client.tokenExpiresAt,
          source: 'local_calculation_fallback'
        });
      }

      return res.json({
        status: 'unknown',
        isExpired: false,
        isExpiringSoon: false,
        expiresInDays: null,
        expiresAt: null,
        error: 'Failed to validate token'
      });
    }
  } catch (error) {
    console.error('Error checking token:', error);
    res.status(500).json({ error: 'Failed to check token status' });
  }
});

export default router;


