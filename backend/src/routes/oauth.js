import express from 'express';
import mongoose from 'mongoose';
import Client from '../models/Client.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

// OAuth callback route - requires auth to know which user created the client
router.get('/callback/:platform', requireAuth, async (req, res) => {
  try {
    const { platform } = req.params;
    const { code, state } = req.query;
    const userIdString = req.user.sub || req.user.id || req.user._id;
    
    if (!userIdString) {
      return res.redirect(`/dashboard/clients?error=invalid_user`);
    }

    // Convert string ID to ObjectId for MongoDB
    const userId = mongoose.Types.ObjectId.isValid(userIdString) 
      ? new mongoose.Types.ObjectId(userIdString)
      : userIdString;

    // Extract client data from state (we'll encode it in the OAuth URL)
    let clientData = {};
    try {
      if (state) {
        clientData = JSON.parse(Buffer.from(state, 'base64').toString());
      }
    } catch (e) {
      console.error('Error parsing state:', e);
    }

    if (!code) {
      return res.redirect(`/dashboard/clients?error=oauth_cancelled`);
    }

    if (!['instagram', 'facebook'].includes(platform)) {
      return res.redirect(`/dashboard/clients?error=invalid_platform`);
    }

    // Exchange code for access token
    let accessToken, refreshToken, socialMediaId, socialMediaLink;

    if (platform === 'instagram') {
      // Instagram OAuth flow
      const redirectUri = `${process.env.API_URL || 'http://localhost:5000'}/api/oauth/callback/instagram`;
      
      try {
        const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.INSTAGRAM_CLIENT_ID || '',
            client_secret: process.env.INSTAGRAM_CLIENT_SECRET || '',
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code: code,
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.text();
          console.error('Instagram token error:', errorData);
          return res.redirect(`/dashboard/clients?error=instagram_token_failed`);
        }

        const tokenData = await tokenResponse.json();
        accessToken = tokenData.access_token;
        socialMediaId = tokenData.user_id;
        
        // Get user info
        try {
          const userResponse = await fetch(`https://graph.instagram.com/${socialMediaId}?fields=id,username&access_token=${accessToken}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            socialMediaLink = `https://instagram.com/${userData.username}`;
          }
        } catch (e) {
          console.error('Error fetching Instagram user:', e);
        }
      } catch (error) {
        console.error('Instagram OAuth error:', error);
        return res.redirect(`/dashboard/clients?error=instagram_oauth_failed`);
      }
    } else if (platform === 'facebook') {
      // Facebook OAuth flow
      const redirectUri = `${process.env.API_URL || 'http://localhost:5000'}/api/oauth/callback/facebook`;
      
      try {
        const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.FACEBOOK_CLIENT_ID || ''}&client_secret=${process.env.FACEBOOK_CLIENT_SECRET || ''}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;
        const tokenResponse = await fetch(tokenUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.text();
          console.error('Facebook token error:', errorData);
          return res.redirect(`/dashboard/clients?error=facebook_token_failed`);
        }

        const tokenData = await tokenResponse.json();
        accessToken = tokenData.access_token;
        refreshToken = tokenData.refresh_token;

        // Get user info
        try {
          const userResponse = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${accessToken}&fields=id,name,email`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            socialMediaId = userData.id;
            socialMediaLink = `https://facebook.com/${userData.id}`;
            // Use email from Facebook if not provided in form
            if (!clientData.email && userData.email) {
              clientData.email = userData.email;
            }
          }
        } catch (e) {
          console.error('Error fetching Facebook user:', e);
        }
      } catch (error) {
        console.error('Facebook OAuth error:', error);
        return res.redirect(`/dashboard/clients?error=facebook_oauth_failed`);
      }
    }

    // Create client with OAuth data
    const client = new Client({
      name: clientData.name || 'Client',
      email: clientData.email || `${socialMediaId}@${platform}.com`,
      socialMediaLink: socialMediaLink || `https://${platform}.com/${socialMediaId}`,
      platform: platform,
      accessToken: accessToken,
      refreshToken: refreshToken,
      socialMediaId: socialMediaId,
      createdBy: userId,
    });

    await client.save();

    // Redirect to clients page with success
    return res.redirect(`/dashboard/clients?success=client_added&platform=${platform}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.redirect(`/dashboard/clients?error=oauth_failed`);
  }
});

// Get OAuth authorization URL
router.post('/authorize', requireAuth, async (req, res) => {
  try {
    const { platform, name, email } = req.body;

    if (!['instagram', 'facebook'].includes(platform)) {
      return res.status(400).json({ success: false, error: 'Invalid platform' });
    }

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are required' });
    }

    // Encode client data in state parameter
    const state = Buffer.from(JSON.stringify({ name, email })).toString('base64');
    const redirectUri = `${process.env.API_URL || 'http://localhost:5000'}/api/oauth/callback/${platform}`;

    let authUrl;

    if (platform === 'instagram') {
      // Instagram Basic Display OAuth
      const instagramClientId = process.env.INSTAGRAM_CLIENT_ID || '';
      if (!instagramClientId) {
        console.error('INSTAGRAM_CLIENT_ID is not set in environment variables');
        return res.status(500).json({ 
          success: false, 
          error: 'Instagram OAuth not configured. Please set INSTAGRAM_CLIENT_ID in .env file.' 
        });
      }
      authUrl = `https://api.instagram.com/oauth/authorize?client_id=${instagramClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user_profile,user_media&response_type=code&state=${state}`;
      console.log('Instagram OAuth URL generated:', authUrl.replace(/client_id=[^&]+/, 'client_id=***'));
    } else if (platform === 'facebook') {
      authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_CLIENT_ID || ''}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email,public_profile&response_type=code&state=${state}`;
    }

    res.json({ success: true, authUrl });
  } catch (error) {
    console.error('OAuth authorize error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate OAuth URL' });
  }
});

export default router;
