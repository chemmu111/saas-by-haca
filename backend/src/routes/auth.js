import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import VerificationCode from '../models/VerificationCode.js';
import { sendVerificationEmail } from '../services/emailService.js';

const router = Router();

function isValidEmail(email) {
  return /.+@.+\..+/.test(email);
}

function signToken(user) {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, secret, { expiresIn: '7d' });
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
    if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!password) return res.status(400).json({ error: 'Password is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

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

export default router;


