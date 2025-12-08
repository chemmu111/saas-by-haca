import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import PendingUser from '../models/PendingUser.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import Client from '../models/Client.js';
import mongoose from 'mongoose';
import { refreshLongLivedToken } from '../services/instagramTokenService.js';

const router = Router();

function isValidEmail(email) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

function generateTokens(user) {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  // Use a different secret for refresh tokens, or append a string to the main secret
  // In production, these should be separate env vars. For now, we'll derive it or use a fallback.
  const refreshSecret = process.env.JWT_REFRESH_SECRET || secret + '_refresh';

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name, type: 'access' },
    secret,
    { expiresIn: '1d' }
  );

  const refreshToken = jwt.sign(
    { sub: user.id, type: 'refresh' },
    refreshSecret,
    { expiresIn: '2d' }
  );

  return { accessToken, refreshToken };
}

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, avatar, gender } = req.body || {};
    if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Name is required' });
    if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existingUser) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = 'social media manager';

    // 2. Create User Directly
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash,
      avatar: avatar || '',
      gender: gender || '',
      role: userRole,
      isVerified: true
    });

    // 3. Track device & Generate Token
    await trackUserDevice(user, req);

    const tokens = generateTokens(user);
    res.status(201).json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      message: 'Account created successfully!'
    });
  } catch (err) {
    console.error('Signup error', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
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



    // For non-admin users, proceed with normal login
    // 5. Track device
    await trackUserDevice(user, req);

    const tokens = generateTokens(user);
    res.json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// POST /api/auth/verify-login-otp - Verify Login OTP
router.post('/verify-login-otp', async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!code || code.length !== 6) return res.status(400).json({ error: 'Valid 6-digit code is required' });

    // Find verification code
    const verification = await VerificationCode.findOne({
      email: email.toLowerCase(),
      code: code,
      purpose: 'login',
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

    // Mark code as used
    verification.used = true;
    await verification.save();

    // Ensure role exists
    if (!user.role) {
      user.role = 'social media manager';
      await user.save();
    }

    // Generate token and return user

    // Track device
    await trackUserDevice(user, req);

    const tokens = generateTokens(user);
    res.json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Verify Login OTP error', err);
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

    // Track device
    await trackUserDevice(user, req);

    const tokens = generateTokens(user);
    res.json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Verification error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password - Request password reset OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success (security best practice)
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a verification code has been sent.'
      });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Delete any existing unused codes for this user/purpose
    await VerificationCode.deleteMany({
      email: email.toLowerCase(),
      purpose: 'reset',
      used: false
    });

    // Save verification code
    await VerificationCode.create({
      email: email.toLowerCase(),
      code: verificationCode,
      expiresAt: expiresAt,
      purpose: 'reset',
      userId: user._id
    });

    // Send OTP email
    try {
      await sendOtpEmail(user.email, verificationCode, 'reset');
      return res.json({
        success: true,
        message: 'If an account with that email exists, a verification code has been sent.'
      });
    } catch (emailError) {
      console.error('Error sending password reset OTP:', emailError);
      return res.status(500).json({
        error: 'Failed to send verification code. Please try again.'
      });
    }
  } catch (err) {
    console.error('Forgot password error', err);
    res.status(500).json({ error: 'Internal server error', details: err.message, stack: err.stack });
  }
});

// POST /api/auth/reset-password - Reset password with OTP
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, password } = req.body || {};

    if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'Email is required' });
    if (!code || code.length !== 6) return res.status(400).json({ error: 'Valid 6-digit code is required' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    // Find verification code
    const verification = await VerificationCode.findOne({
      email: email.toLowerCase(),
      code: code,
      purpose: 'reset',
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

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password
    user.passwordHash = passwordHash;
    await user.save();

    // Mark code as used
    verification.used = true;
    await verification.save();

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

// POST /api/auth/refresh-token - Refresh Access Token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh Token Required' });
    }

    const secret = process.env.JWT_SECRET || 'dev-secret';
    const refreshSecret = process.env.JWT_REFRESH_SECRET || secret + '_refresh';

    // Verify Refresh Token
    let payload;
    try {
      payload = jwt.verify(refreshToken, refreshSecret);
    } catch (e) {
      console.error('RefreshToken verification failed:', e.message);
      return res.status(401).json({ error: 'Invalid or Expired Refresh Token', code: 'REFRESH_EXPIRED' });
    }

    if (payload.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid Token Type', code: 'INVALID_TOKEN' });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new tokens
    const tokens = generateTokens(user);
    res.json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Refresh token error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


