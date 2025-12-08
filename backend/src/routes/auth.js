import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import PendingUser from '../models/PendingUser.js';
import VerificationCode from '../models/VerificationCode.js';
import PasswordReset from '../models/PasswordReset.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendOtpEmail } from '../services/emailService.js';
import Client from '../models/Client.js';
import mongoose from 'mongoose';
import { refreshLongLivedToken } from '../services/instagramTokenService.js';

const router = Router();

function isValidEmail(email) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

function signToken(user) {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, name: user.name }, secret, { expiresIn: '12h' });
}

async function trackUserDevice(user, req) {
  try {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ip = req.ip || req.connection.remoteAddress || 'Unknown';

    // Ensure devices array exists
    if (!user.devices) {
      user.devices = [];
    }

    const existingDevice = user.devices.find(d => d.userAgent === userAgent);

    if (existingDevice) {
      existingDevice.loginCount = (existingDevice.loginCount || 0) + 1;
      existingDevice.lastLogin = new Date();
      existingDevice.ip = ip;
    } else {
      user.devices.push({
        userAgent,
        ip,
        lastLogin: new Date(),
        loginCount: 1
      });
    }

    await user.save();
  } catch (error) {
    console.error('Error tracking device:', error);
    // Fallback: don't fail auth just because tracking failed
  }
}

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, avatar, gender } = req.body || {};
    if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Name is required' });
    if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    // 1. Check if user already exists in MAIN database
    const existingUser = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existingUser) return res.status(409).json({ error: 'Email already in use' });

    // 2. Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = 'social media manager';

    // 3. Store in PendingUser (Overwrite existing pending request if any)
    await PendingUser.deleteMany({ email: email.toLowerCase() }); // Clear old pending

    const pendingUser = await PendingUser.create({
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash,
      avatar: avatar || '',
      gender: gender || '',
      role: userRole,
      verificationCode,
      expiresAt
    });

    // 4. Send verification email
    try {
      await sendOtpEmail(email, verificationCode, 'signup');
      res.status(201).json({
        requiresVerification: true,
        message: 'Verification code sent to your email',
        email: email
      });
    } catch (emailError) {
      console.error('Error sending signup verification email:', emailError);
      // If email fails, we might want to delete pending user or just let it expire?
      // For now, return success but warn, allowing resend (if we implement resend for pending).
      // Actually, if email fails, user can't verify. But we returned 201.
      // Ideally we should fail if email fails, but let's keep consistency with previous code.
      res.status(201).json({
        requiresVerification: true,
        message: 'Account info saved but failed to send verification email. Please try signing up again or wait.',
        email: email,
        emailError: true
      });
    }
  } catch (err) {
    console.error('Signup error', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// POST /api/auth/verify-signup - Verify signup OTP
// POST /api/auth/verify-signup - Verify signup OTP and CREATE ACCOUNT
router.post('/verify-signup', async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!code || code.length !== 6) return res.status(400).json({ error: 'Valid 6-digit code is required' });

    // 1. Find in PendingUser
    const pendingUser = await PendingUser.findOne({ email: email.toLowerCase() });

    if (!pendingUser) {
      return res.status(401).json({ error: 'Verification session not found. Please sign up again.' });
    }

    if (pendingUser.verificationCode !== code.trim()) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    if (new Date() > new Date(pendingUser.expiresAt)) {
      return res.status(401).json({ error: 'Verification code expired' });
    }

    // 2. Check if user already exists (double check race condition)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      // Logic if user somehow exists now? Maybe just login?
      // Or error out. Let's error out for safety.
      return res.status(409).json({ error: 'User already exists' });
    }

    // 3. Create Real User
    const user = await User.create({
      name: pendingUser.name,
      email: pendingUser.email,
      passwordHash: pendingUser.passwordHash,
      avatar: pendingUser.avatar || '',
      gender: pendingUser.gender || '',
      role: pendingUser.role,
      isVerified: true
    });

    // 4. Delete PendingUser record
    await PendingUser.deleteOne({ _id: pendingUser._id });

    // 5. Track device & Generate Token
    await trackUserDevice(user, req);
    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
      message: 'Account created successfully!'
    });

  } catch (err) {
    console.error('Verify signup error', err);
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
    await trackUserDevice(user, req);
    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login-otp-init - Initialize Login with OTP
router.post('/login-otp-init', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Account does not exist' });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Invalidate old unused codes for this purpose
    await VerificationCode.updateMany(
      { email: email.toLowerCase(), purpose: 'login', used: false },
      { used: true }
    );

    // Save verification code
    await VerificationCode.create({
      email: user.email.toLowerCase(),
      code: verificationCode,
      expiresAt: expiresAt,
      purpose: 'login',
      userId: user._id
    });

    // Send email
    try {
      await sendOtpEmail(user.email, verificationCode, 'login');
      res.json({ success: true, message: 'Verification code sent to your email.' });
    } catch (emailError) {
      console.error('Error sending login OTP:', emailError);
      res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
    }
  } catch (err) {
    console.error('Login OTP Init error', err);
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
    await trackUserDevice(user, req);
    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
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
    await trackUserDevice(user, req);
    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
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

// POST /api/auth/resend-otp - Resend OTP
// POST /api/auth/resend-otp - Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email, purpose } = req.body || {};
    if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!['signup', 'reset', 'login'].includes(purpose)) return res.status(400).json({ error: 'Valid purpose is required' });

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Special handling for signup (uses PendingUser)
    if (purpose === 'signup') {
      const pendingUser = await PendingUser.findOne({ email: email.toLowerCase() });

      if (!pendingUser) {
        // Maybe they are already signed up?
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
          return res.status(400).json({ error: 'User already registered. Please login.' });
        }
        return res.status(404).json({ error: 'Signup session expired. Please sign up again.' });
      }

      // Update code
      pendingUser.verificationCode = verificationCode;
      pendingUser.expiresAt = expiresAt;
      await pendingUser.save();

      await sendOtpEmail(email, verificationCode, 'signup');
      return res.json({ success: true, message: 'Verification code resent.' });
    }

    // Normal handling for login/reset (uses User + VerificationCode)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Security: Don't reveal user existence
      return res.json({ success: true, message: 'If account exists, code sent.' });
    }

    // Invalidate old unused codes for this purpose
    await VerificationCode.updateMany(
      { email: email.toLowerCase(), purpose: purpose, used: false },
      { used: true }
    );

    // Save new code
    await VerificationCode.create({
      email: user.email.toLowerCase(),
      code: verificationCode,
      expiresAt: expiresAt,
      purpose: purpose,
      userId: user._id
    });

    // Send email
    await sendOtpEmail(user.email, verificationCode, purpose);

    res.json({ success: true, message: 'Verification code resent.' });
  } catch (err) {
    console.error('Resend OTP error', err);
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


