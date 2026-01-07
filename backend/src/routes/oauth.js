import express from 'express';
import mongoose from 'mongoose';
import Client from '../models/Client.js';
import requireAuth from '../middleware/requireAuth.js';
import { exchangeForLongLivedToken } from '../services/instagramTokenService.js';
import User from '../models/User.js';
import { updateClientStats } from '../services/analyticsService.js';
import { sendInstagramConnectedEmail } from '../services/emailService.js';

const router = express.Router();

// Test route to verify callback is accessible without auth
router.get('/callback/test', async (req, res) => {
  res.json({
    message: 'Callback route is accessible without auth!',
    timestamp: new Date().toISOString()
  });
});

// OAuth callback route - public route (called by Facebook/Instagram redirect)
// User ID is stored in state parameter during OAuth initiation
router.get('/callback/:platform', async (req, res) => {
  try {
    console.log('📥 OAuth callback received');
    console.log('  Platform:', req.params.platform);
    console.log('  Query params:', JSON.stringify(req.query));
    console.log('  Headers:', JSON.stringify(req.headers));

    const { platform } = req.params;
    const { code, state, error, error_description, error_reason } = req.query;

    if (state) {
      try {
        const decodedDebug = Buffer.from(state, 'base64').toString();
        const parsedDebug = JSON.parse(decodedDebug);
        console.log('🔐 [OAUTH CALLBACK] State contains UserID:', parsedDebug.userId);
      } catch (e) {
        console.log('❌ [OAUTH CALLBACK] Failed to decode state for debug log');
      }
    }



    // Get frontend URL for redirect (moved to top scope)
    // FORCE socialhac.com in production to avoid old Render URL issues
    const frontendUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:5173'
      : 'https://socialhac.com';

    // ... (unchanged code) ...

    if (platform === 'instagram') {
      console.log('📱 Starting Instagram Business API OAuth flow...');

      // Instagram Business API OAuth flow via Facebook Graph API
      // Robustly construct base URL by removing trailing slash and any existing /api path
      const isDev = process.env.NODE_ENV === 'development';
      const baseUrl = isDev ? 'http://localhost:5001' : (process.env.API_URL || 'https://socialhac.com').replace(/\/$/, '').replace(/\/api.*$/, '');
      const redirectUri = `${baseUrl}/api/oauth/callback/instagram`;
      console.log('  Redirect URI:', redirectUri);

      // For Instagram Business API, use Facebook App ID (can also use INSTAGRAM_CLIENT_ID if it's set to Facebook App ID)
      const clientId = process.env.FACEBOOK_CLIENT_ID || process.env.INSTAGRAM_CLIENT_ID || '';
      const clientSecret = process.env.FACEBOOK_CLIENT_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || '';

      console.log('  Client ID configured:', clientId ? 'Yes' : 'No');
      console.log('  Client Secret configured:', clientSecret ? 'Yes' : 'No');

      if (!clientId || !clientSecret) {
        console.error('  INSTAGRAM_CLIENT_ID:', process.env.INSTAGRAM_CLIENT_ID ? 'Set' : 'Missing');
        console.error('  INSTAGRAM_CLIENT_SECRET:', process.env.INSTAGRAM_CLIENT_SECRET ? 'Set' : 'Missing');
        return res.redirect(`${frontendUrl}/dashboard/clients?error=instagram_config_missing`);
      }

      try {
        // Step 1: Exchange code for short-lived access token
        console.log('📱 Step 1: Exchanging code for short-lived access token...');
        console.log('  Authorization code received:', code ? 'Yes (length: ' + code.length + ')' : 'No');
        console.log('  Redirect URI:', redirectUri);
        console.log('  Client ID:', clientId ? clientId.substring(0, 10) + '...' : 'Missing');

        const tokenUrl = `https://graph.facebook.com/v24.0/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;
        console.log('  Token URL (masked):', tokenUrl.replace(/client_secret=[^&]+/, 'client_secret=***').replace(/code=[^&]+/, 'code=***'));

        let tokenResponse;
        try {
          tokenResponse = await fetch(tokenUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          console.log('  Token response status:', tokenResponse.status, tokenResponse.statusText);
        } catch (fetchError) {
          console.error('❌ Network error fetching token:', fetchError.message);
          console.error('  Error stack:', fetchError.stack);
          return res.redirect(`${frontendUrl}/dashboard/clients?error=instagram_network_error`);
        }

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.text();
          console.error('❌ Instagram token exchange error:');
          console.error('  Status:', tokenResponse.status);
          console.error('  Status Text:', tokenResponse.statusText);
          console.error('  Error Response:', errorData);
          try {
            const errorJson = JSON.parse(errorData);
            console.error('  Parsed Error:', JSON.stringify(errorJson, null, 2));
          } catch (e) {
            console.error('  Error is not JSON');
          }
          return res.redirect(`${frontendUrl}/dashboard/clients?error=instagram_token_failed`);
        }

        let tokenData;
        try {
          tokenData = await tokenResponse.json();
          console.log('  Token response received:', Object.keys(tokenData).join(', '));
        } catch (parseError) {
          console.error('❌ Error parsing token response JSON:', parseError.message);
          const responseText = await tokenResponse.text();
          console.error('  Raw response:', responseText);
          return res.redirect(`${frontendUrl}/dashboard/clients?error=instagram_token_parse_error`);
        }

        if (!tokenData.access_token) {
          console.error('❌ No access_token in token response');
          console.error('  Token data:', JSON.stringify(tokenData, null, 2));
          return res.redirect(`${frontendUrl}/dashboard/clients?error=instagram_no_access_token`);
        }

        const shortLivedToken = tokenData.access_token;
        const expiresIn = tokenData.expires_in;

        console.log('✅ Short-lived token received');
        console.log('  Token length:', shortLivedToken ? shortLivedToken.length : 'Missing');
        console.log('  Expires in:', expiresIn, 'seconds');
        console.log('  ⚠️  CRITICAL: Short-lived tokens expire in 1 hour - MUST exchange for long-lived!');

        // Step 2: Exchange short-lived token for long-lived user token (60 days)
        // CRITICAL: This MUST succeed - we NEVER save short-lived tokens
        console.log('📱 Step 2: Exchanging short-lived token for long-lived token (60 days)...');
        console.log('  Using exchangeForLongLivedToken helper function...');

        try {
          // Use the helper function which uses v20.0 API
          const longLivedTokenData = await exchangeForLongLivedToken(shortLivedToken);

          // CRITICAL: Only use long-lived token - NEVER use short-lived
          accessToken = longLivedTokenData.accessToken;

          console.log('✅ Long-lived user token obtained successfully!');
          console.log(`   Token length: ${accessToken.length}`);
          console.log(`   Expires in: ${longLivedTokenData.expiresIn} seconds (${Math.floor(longLivedTokenData.expiresIn / 86400)} days)`);
          console.log(`   Token type: ${longLivedTokenData.tokenType}`);
          console.log('   ✅ This token will be valid for 60 days');
        } catch (exchangeError) {
          console.error('❌ CRITICAL ERROR: Failed to exchange short-lived token for long-lived token!');
          console.error('   Error:', exchangeError.message);
          console.error('   ⚠️  Cannot proceed - short-lived tokens expire in 1 hour');
          console.error('   User must re-authenticate with proper permissions');
          console.error('   User must re-authenticate with proper permissions');
          return res.redirect(`${frontendUrl}/dashboard/clients?error=token_exchange_failed&error_description=${encodeURIComponent(exchangeError.message)}`);
        }

        // Step 3: Get user's Facebook Pages
        // Request pages with all necessary permissions for Instagram publishing
        console.log('📱 Step 3: Fetching user\'s Facebook Pages...');
        console.log('  Using access token:', accessToken ? 'Yes (length: ' + accessToken.length + ')' : 'No');

        // V24.0 UPDATE: Fetch basic page list first
        // GET /me/accounts?fields=id,name,access_token
        const pagesUrl = `https://graph.facebook.com/v24.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`;
        console.log('  Pages URL (masked):', pagesUrl.replace(/access_token=[^&]+/, 'access_token=***'));

        let pagesResponse;
        try {
          pagesResponse = await fetch(pagesUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
          console.log('  Pages response status:', pagesResponse.status, pagesResponse.statusText);
        } catch (fetchError) {
          console.error('❌ Network error fetching pages:', fetchError.message);
          return res.redirect(`${frontendUrl}/dashboard/clients?error=instagram_pages_network_error`);
        }

        if (!pagesResponse.ok) {
          const errorData = await pagesResponse.text();
          console.error('❌ Failed to fetch pages:', pagesResponse.status, errorData);
          return res.redirect(`${frontendUrl}/dashboard/clients?error=instagram_pages_failed`);
        }

        const pagesData = await pagesResponse.json();
        const pages = pagesData.data || [];
        console.log(`✅ Found ${pages.length} page(s)`);

        if (pages.length === 0) {
          console.error('❌ No Facebook Pages found.');
          return res.redirect(`${frontendUrl}/dashboard/clients?error=instagram_no_pages`);
        }

        // Step 4: Find page with connected Instagram Business Account
        console.log('📱 Step 4: Finding page with connected Instagram Business Account...');
        let pageName = null;
        let pagesChecked = 0;

        for (const page of pages) {
          pagesChecked++;
          console.log(`  Checking page ${pagesChecked}/${pages.length}: ${page.id} (${page.name})`);

          if (page.instagram_business_account) {
            console.log('    ✅ Page has Instagram Business Account directly linked!');
            igUserId = page.instagram_business_account.id;
            pageId = page.id;
            pageName = page.name;
          } else {
            // Fallback: Fetch explicit page details if not returned in list
            // V24.0 UPDATE: Explicitly fetch individual page details
            const pageDetailsUrl = `https://graph.facebook.com/v24.0/${page.id}?fields=instagram_business_account,name,access_token&access_token=${page.access_token}`;
            try {
              const pdRes = await fetch(pageDetailsUrl);
              if (pdRes.ok) {
                const pd = await pdRes.json();
                if (pd.instagram_business_account) {
                  console.log('    ✅ Found Instagram Business Account via distinct fetch!');
                  igUserId = pd.instagram_business_account.id;
                  pageId = pd.id;
                  pageName = pd.name;
                  // Update page token if needed
                  if (pd.access_token) page.access_token = pd.access_token;
                }
              }
            } catch (e) {
              console.warn('    ⚠️ Failed to fetch specific page details:', e.message);
            }
          }

          if (igUserId) {
            // Page access token might be short-lived - we need to exchange it too
            const pageToken = page.access_token;
            console.log('    Page access token received (length):', pageToken ? pageToken.length : 'Missing');

            // Exchange page token for long-lived - CRITICAL: Must succeed
            try {
              console.log('    🔄 Exchanging page token for long-lived token...');
              const longLivedPageToken = await exchangeForLongLivedToken(pageToken);
              pageAccessToken = longLivedPageToken.accessToken;
              console.log('    ✅ Long-lived page token obtained');
            } catch (pageTokenError) {
              console.error('    ❌ CRITICAL: Failed to exchange page token:', pageTokenError.message);
              return res.redirect(`${frontendUrl}/dashboard/clients?error=page_token_exchange_failed&error_description=${encodeURIComponent(pageTokenError.message)}`);
            }
            break; // Found our account, stop searching
          }
        }

        if (!igUserId) {
          console.error('❌ No Instagram Business Account found after checking', pagesChecked, 'page(s)');
          console.error('  User must connect Instagram Business account to a Facebook Page.');
          console.error('  Steps to fix:');
          console.error('    2. Link Instagram Business Account to the Page');
          console.error('    3. Try connecting again');
          return res.redirect(`${frontendUrl}/dashboard/clients?error=instagram_no_ig_account`);
        }

        // Step 5: Get Instagram Business Account info
        console.log('📱 Step 5: Fetching Instagram Business Account info...');
        console.log('  IG User ID:', igUserId);
        console.log('  Page Access Token:', pageAccessToken ? 'Yes (length: ' + pageAccessToken.length + ')' : 'No');


        try {
          // Note: Instagram Business API doesn't provide profile_picture_url directly
          // We can only get username and then construct profile link
          const igInfoUrl = `https://graph.facebook.com/v24.0/${igUserId}?fields=id,username&access_token=${pageAccessToken}`;
          console.log('  IG Info URL (masked):', igInfoUrl.replace(/access_token=[^&]+/, 'access_token=***'));

          let igInfoResponse;
          try {
            igInfoResponse = await fetch(igInfoUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            console.log('  IG Info response status:', igInfoResponse.status, igInfoResponse.statusText);
          } catch (fetchError) {
            console.error('  ❌ Network error fetching IG info:', fetchError.message);
            throw fetchError;
          }

          if (igInfoResponse.ok) {
            let igInfo;
            try {
              igInfo = await igInfoResponse.json();
              console.log('  IG Info keys:', Object.keys(igInfo).join(', '));
            } catch (parseError) {
              console.error('  ❌ Error parsing IG info JSON:', parseError.message);
              const responseText = await igInfoResponse.text();
              console.error('  Raw response:', responseText);
              throw parseError;
            }

            if (igInfo.username) {
              socialMediaLink = `https://instagram.com/${igInfo.username}`;
              socialMediaId = igInfo.id;
              instagramUsername = igInfo.username; // Store for client model
              // Instagram Business API doesn't provide profile picture URL
              // We'll use a placeholder or fetch from Instagram public API
              instagramProfilePicture = null; // Will be null for now
              console.log('✅ Instagram username:', igInfo.username);
              console.log('  Instagram link:', socialMediaLink);
              console.log('  Profile picture: Not available via Instagram Business API');
            } else {
              console.error('  ⚠️ No username in IG info, using ID as fallback');
              socialMediaId = igUserId;
              socialMediaLink = `https://instagram.com/${igUserId}`;
            }
          } else {
            const errorData = await igInfoResponse.text();
            console.error('  ❌ Failed to fetch IG info:');
            console.error('    Status:', igInfoResponse.status);
            console.error('    Error:', errorData);

            // Check for permission errors (error code 10)
            try {
              const errorJson = JSON.parse(errorData);
              if (errorJson.error && (errorJson.error.code === 10 ||
                (errorJson.error.type === 'OAuthException' && errorJson.error.code === 10))) {
                console.error('  ❌ PERMISSION ERROR DETECTED DURING OAUTH');
                console.error('    Error Code:', errorJson.error.code);
                console.error('    Error Type:', errorJson.error.type);
                console.error('    Error Message:', errorJson.error.message);
                console.error('    This usually means:');
                console.error('    1. App is in Development Mode and user is not a test user');
                console.error('    2. Permissions (pages_manage_posts, instagram_content_publish) not approved');
                console.error('    3. App needs Facebook review for production use');

                const appId = clientId;
                const errorDescription = `Permission denied (Error #10). The app may be in Development Mode or permissions are not approved. Please: 1) Add yourself as a test user in Facebook App Dashboard (Roles → Test Users), 2) Request review for pages_manage_posts and instagram_content_publish permissions, or 3) Switch app to Live mode after approval. App Dashboard: https://developers.facebook.com/apps/${appId}/app-review/permissions/`;

                return res.redirect(`${frontendUrl}/dashboard/clients?error=instagram_permission_error&error_description=${encodeURIComponent(errorDescription)}&app_id=${appId}`);
              }
            } catch (parseErr) {
              // Not a JSON error, continue with generic error
            }

            throw new Error(`Failed to fetch IG info: ${igInfoResponse.status}`);
          }
        } catch (e) {
          // Check if it's a permission error that was already handled
          if (e.message && e.message.includes('Permission denied')) {
            throw e; // Re-throw to be caught by outer catch
          }

          console.error('⚠️ Error fetching Instagram info:', e.message);
          console.error('  Error stack:', e.stack);
          console.error('  Will use IG User ID as fallback');
          // Use IG User ID as fallback
          socialMediaId = igUserId;
          socialMediaLink = `https://instagram.com/${igUserId}`;
        }

        // Store all tokens and IDs
        refreshToken = accessToken; // Store long-lived user token in refreshToken field for compatibility
        console.log('✅ Instagram Business API OAuth flow completed successfully!');
        console.log('  Final values:');
        console.log('    Social Media ID:', socialMediaId);
        console.log('    Social Media Link:', socialMediaLink);
        console.log('    Page ID:', pageId);
        console.log('    IG User ID:', igUserId);

      } catch (error) {
        console.error('❌ Instagram OAuth error (catch block):');
        console.error('  Error message:', error.message);
        console.error('  Error stack:', error.stack);
        console.error('  Error name:', error.name);
        if (error.cause) {
          console.error('  Error cause:', error.cause);
        }
        return res.redirect(`${frontendUrl}/dashboard/clients?error=instagram_oauth_failed`);
      }
    } else if (platform === 'facebook') {
      console.log('📘 Starting Facebook OAuth flow...');

      // Facebook OAuth flow
      // Robustly construct base URL by removing trailing slash and any existing /api path
      const isDev = process.env.NODE_ENV === 'development';
      const baseUrl = isDev ? 'http://localhost:5001' : (process.env.API_URL || 'https://socialhac.com').replace(/\/$/, '').replace(/\/api.*$/, '');
      const redirectUri = `${baseUrl}/api/oauth/callback/facebook`;
      console.log('  Redirect URI:', redirectUri);

      const facebookClientId = process.env.FACEBOOK_CLIENT_ID || '';
      const facebookClientSecret = process.env.FACEBOOK_CLIENT_SECRET || '';

      console.log('  Client ID configured:', facebookClientId ? 'Yes' : 'No');
      console.log('  Client Secret configured:', facebookClientSecret ? 'Yes' : 'No');

      if (!facebookClientId || !facebookClientSecret) {
        console.error('❌ Facebook OAuth credentials not configured');
        console.error('  FACEBOOK_CLIENT_ID:', process.env.FACEBOOK_CLIENT_ID ? 'Set' : 'Missing');
        console.error('  FACEBOOK_CLIENT_SECRET:', process.env.FACEBOOK_CLIENT_SECRET ? 'Set' : 'Missing');
        return res.redirect(`${frontendUrl}/dashboard/clients?error=facebook_config_missing`);
      }

      try {
        // Step 1: Exchange code for access token
        console.log('📘 Step 1: Exchanging code for Facebook access token...');
        console.log('  Authorization code received:', code ? 'Yes (length: ' + code.length + ')' : 'No');
        console.log('  Client ID:', facebookClientId ? facebookClientId.substring(0, 10) + '...' : 'Missing');

        const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${facebookClientId}&client_secret=${facebookClientSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;
        console.log('  Token URL (masked):', tokenUrl.replace(/client_secret=[^&]+/, 'client_secret=***').replace(/code=[^&]+/, 'code=***'));

        let tokenResponse;
        try {
          tokenResponse = await fetch(tokenUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          console.log('  Token response status:', tokenResponse.status, tokenResponse.statusText);
        } catch (fetchError) {
          console.error('❌ Network error fetching Facebook token:', fetchError.message);
          console.error('  Error stack:', fetchError.stack);
          return res.redirect(`${frontendUrl}/dashboard/clients?error=facebook_network_error`);
        }

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.text();
          console.error('❌ Facebook token exchange error:');
          console.error('  Status:', tokenResponse.status);
          console.error('  Status Text:', tokenResponse.statusText);
          console.error('  Error Response:', errorData);
          try {
            const errorJson = JSON.parse(errorData);
            console.error('  Parsed Error:', JSON.stringify(errorJson, null, 2));
          } catch (e) {
            console.error('  Error is not JSON');
          }
          return res.redirect(`${frontendUrl}/dashboard/clients?error=facebook_token_failed`);
        }

        let tokenData;
        try {
          tokenData = await tokenResponse.json();
          console.log('  Token response received:', Object.keys(tokenData).join(', '));
        } catch (parseError) {
          console.error('❌ Error parsing Facebook token response JSON:', parseError.message);
          const responseText = await tokenResponse.text();
          console.error('  Raw response:', responseText);
          return res.redirect(`${frontendUrl}/dashboard/clients?error=facebook_token_parse_error`);
        }

        if (!tokenData.access_token) {
          console.error('❌ No access_token in Facebook token response');
          console.error('  Token data:', JSON.stringify(tokenData, null, 2));
          return res.redirect(`${frontendUrl}/dashboard/clients?error=facebook_no_access_token`);
        }

        accessToken = tokenData.access_token;
        refreshToken = tokenData.refresh_token || accessToken; // Facebook may not always return refresh_token

        console.log('✅ Facebook access token received');
        console.log('  Token length:', accessToken ? accessToken.length : 'Missing');
        console.log('  Refresh token:', refreshToken ? 'Yes' : 'No');

        // Step 2: Get user info
        console.log('📘 Step 2: Fetching Facebook user info...');
        console.log('  Using access token:', accessToken ? 'Yes (length: ' + accessToken.length + ')' : 'No');

        try {
          const userInfoUrl = `https://graph.facebook.com/v18.0/me?access_token=${accessToken}&fields=id,name,email`;
          console.log('  User info URL (masked):', userInfoUrl.replace(/access_token=[^&]+/, 'access_token=***'));

          let userResponse;
          try {
            userResponse = await fetch(userInfoUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            console.log('  User info response status:', userResponse.status, userResponse.statusText);
          } catch (fetchError) {
            console.error('  ❌ Network error fetching Facebook user info:', fetchError.message);
            console.error('  Error stack:', fetchError.stack);
            throw fetchError;
          }

          if (userResponse.ok) {
            let userData;
            try {
              userData = await userResponse.json();
              console.log('  User info keys:', Object.keys(userData).join(', '));
            } catch (parseError) {
              console.error('  ❌ Error parsing Facebook user info JSON:', parseError.message);
              const responseText = await userResponse.text();
              console.error('  Raw response:', responseText);
              throw parseError;
            }

            if (userData.id) {
              socialMediaId = userData.id;
              socialMediaLink = `https://facebook.com/${userData.id}`;
              console.log('✅ Facebook user info received');
              console.log('  User ID:', userData.id);
              console.log('  User Name:', userData.name || 'Not provided');
              console.log('  User Email:', userData.email || 'Not provided');
              console.log('  Facebook link:', socialMediaLink);

              // Use email from Facebook if not provided in form
              if (!clientData.email && userData.email) {
                clientData.email = userData.email;
                console.log('  Updated email from Facebook:', userData.email);
              }
            } else {
              console.error('  ❌ No user ID in Facebook user info');
              console.error('  User data:', JSON.stringify(userData, null, 2));
              throw new Error('No user ID in Facebook response');
            }
          } else {
            const errorData = await userResponse.text();
            console.error('  ❌ Failed to fetch Facebook user info:');
            console.error('    Status:', userResponse.status);
            console.error('    Status Text:', userResponse.statusText);
            console.error('    Error Response:', errorData);
            try {
              const errorJson = JSON.parse(errorData);
              console.error('    Parsed Error:', JSON.stringify(errorJson, null, 2));
            } catch (e) {
              console.error('    Error is not JSON');
            }
            throw new Error(`Failed to fetch Facebook user info: ${userResponse.status}`);
          }
        } catch (e) {
          console.error('⚠️ Error fetching Facebook user info:', e.message);
          console.error('  Error stack:', e.stack);
          // Continue with basic info if user fetch fails
          console.error('  Will continue without full user info');
        }

        console.log('✅ Facebook OAuth flow completed successfully!');
        console.log('  Final values:');
        console.log('    Social Media ID:', socialMediaId);
        console.log('    Social Media Link:', socialMediaLink);

      } catch (error) {
        console.error('❌ Facebook OAuth error (catch block):');
        console.error('  Error message:', error.message);
        console.error('  Error stack:', error.stack);
        console.error('  Error name:', error.name);
        if (error.cause) {
          console.error('  Error cause:', error.cause);
        }
        return res.redirect(`${frontendUrl}/dashboard/clients?error=facebook_oauth_failed`);
      }
    }

    // Create client with OAuth data
    console.log('📝 Creating client record...');
    console.log('  Name:', clientData.name || 'Client');
    console.log('  Email:', clientData.email || `${socialMediaId}@${platform}.com`);
    console.log('  Platform:', platform);
    console.log('  Social Media ID:', socialMediaId);
    console.log('  Social Media Link:', socialMediaLink);
    console.log('  User ID:', userId);
    console.log('  Has Access Token:', accessToken ? 'Yes' : 'No');

    const clientDataToSave = {
      name: clientData.name || 'Client',
      email: clientData.email || `${socialMediaId}@${platform}.com`,
      socialMediaLink: socialMediaLink || `https://${platform}.com/${socialMediaId}`,
      platform: platform,
      accessToken: accessToken,
      refreshToken: refreshToken,
      socialMediaId: socialMediaId,
      logo: clientData.logo || undefined, // Include logo from OAuth state
      createdBy: userId,
    };

    // Add Instagram Business API specific fields if platform is Instagram
    if (platform === 'instagram') {
      console.log('📱 Setting up Instagram client with long-lived tokens...');

      // CRITICAL: pageAccessToken should already be long-lived (exchanged in Step 4)
      // But verify and exchange again if needed (double-check)
      if (pageAccessToken) {
        // Verify token is long-lived by checking expiration
        // If we're not sure, exchange it again to be safe
        console.log('🔄 Verifying page access token is long-lived...');
        try {
          // Exchange again to ensure it's long-lived (safe to call on already long-lived tokens)
          const verifiedLongLivedToken = await exchangeForLongLivedToken(pageAccessToken);
          pageAccessToken = verifiedLongLivedToken.accessToken;

          // Add token lifecycle metadata - ALWAYS mark as long-lived
          // Use 60 days (5184000 seconds) as default if expiresIn is undefined
          const expiresInSeconds = verifiedLongLivedToken.expiresIn || 5184000; // 60 days default
          clientDataToSave.tokenType = 'long-lived';
          clientDataToSave.tokenCreatedAt = verifiedLongLivedToken.createdAt;
          clientDataToSave.tokenExpiresIn = expiresInSeconds;
          const expiresAt = new Date(verifiedLongLivedToken.createdAt.getTime() + (expiresInSeconds * 1000));
          clientDataToSave.tokenExpiresAt = expiresAt;
          clientDataToSave.tokenLastRefreshed = verifiedLongLivedToken.createdAt;
          clientDataToSave.tokenRefreshCount = 0;
          clientDataToSave.tokenStatus = {
            state: 'active',
            expiresInDays: Math.ceil(expiresInSeconds / 86400),
            lastChecked: new Date()
          };
          clientDataToSave.tokenNeedsRefresh = false;

          console.log('✅ Long-lived page token verified and saved!');
          console.log(`   Token type: long-lived`);
          console.log(`   Valid for: ${Math.floor(expiresInSeconds / 86400)} days`);
          console.log(`   Expires at: ${expiresAt.toLocaleDateString()}`);
          console.log(`   ✅ This token will last ${Math.floor(expiresInSeconds / 86400)} days`);
        } catch (tokenError) {
          console.error('❌ CRITICAL: Failed to verify/exchange page token:', tokenError.message);
          console.error('   ⚠️  Cannot save short-lived tokens - OAuth flow must fail');
          return res.redirect(`${frontendUrl}/dashboard/clients?error=page_token_exchange_failed&error_description=${encodeURIComponent(tokenError.message)}`);
        }
      } else {
        console.error('❌ CRITICAL: No page access token available');
        return res.redirect(`${frontendUrl}/dashboard/clients?error=no_page_token`);
      }

      // Store long-lived tokens
      clientDataToSave.longLivedUserToken = accessToken; // Long-lived user token (already exchanged in Step 2)
      clientDataToSave.pageId = pageId;
      clientDataToSave.pageAccessToken = pageAccessToken; // Long-lived page token (exchanged above)
      clientDataToSave.igUserId = igUserId;
      clientDataToSave.instagramAccessToken = pageAccessToken;
      clientDataToSave.instagramRefreshToken = refreshToken || null;
      clientDataToSave.instagramTokenExpiresAt = clientDataToSave.tokenExpiresAt || null;
      // Add Instagram profile data
      clientDataToSave.instagramUsername = instagramUsername;
      clientDataToSave.instagramProfilePicture = instagramProfilePicture;
      clientDataToSave.instagramConnected = true;

      console.log('✅ Instagram-specific fields added with LONG-LIVED tokens only');
      console.log('    Page ID:', pageId);
      console.log('    IG User ID:', igUserId);
      console.log('    Instagram Username:', instagramUsername || 'Not available');
      console.log('    Profile Picture:', instagramProfilePicture ? 'Available' : 'Not available');
      console.log('    ✅ User token: long-lived (60 days)');
      console.log('    ✅ Page token: long-lived (60 days)');
      console.log('    ✅ NO short-lived tokens saved!');
    }

    try {
      // Check if client already exists for this Instagram account
      let existingClient = null;

      if (platform === 'instagram' && igUserId) {
        existingClient = await Client.findOne({
          createdBy: userId,
          platform: 'instagram',
          igUserId: igUserId
        });

        if (existingClient) {
          console.log('  ℹ️  Existing client found for this Instagram account');
          console.log('  Client ID:', existingClient._id);
          console.log('  Client Name:', existingClient.name);
          console.log('  Updating existing client with new token...');
        }
      }

      let client;

      if (existingClient) {
        // Update existing client with new token data
        Object.assign(existingClient, clientDataToSave);
        await existingClient.save();
        client = existingClient;
        console.log('✅ Existing client updated successfully!');
        console.log('  Client ID:', client._id);
      } else {
        // Create new client
        client = new Client(clientDataToSave);
        console.log('  Client object created, saving to database...');
        await client.save();
        console.log('✅ Client saved successfully!');
        console.log('  Client ID:', client._id);
      }

      // Send Instagram Connected Email (non-blocking)
      if (platform === 'instagram') {
        try {
          // Fetch user details mostly for the name and email
          const user = await User.findById(userId);
          if (user) {
            sendInstagramConnectedEmail(user.email, user.name, client.instagramUsername || client.name)
              .catch(err => console.error('Instagram connected email error:', err));
          }
        } catch (err) {
          console.error('Error fetching user for email:', err);
        }
      }

      // Fetch initial stats for Instagram clients
      if (platform === 'instagram' && client.pageAccessToken && client.igUserId) {
        console.log('📊 Fetching initial Instagram analytics...');
        try {
          const stats = await updateClientStats(client);
          if (stats) {
            // Update client with fetched stats
            client.followerCount = stats.followerCount;
            client.totalPosts = stats.totalPosts;
            client.engagementRate = stats.engagementRate;
            client.statsLastUpdated = stats.statsLastUpdated;
            await client.save();
            console.log('✅ Initial stats fetched successfully!');
            console.log('  Followers:', stats.followerCount);
            console.log('  Posts:', stats.totalPosts);
            console.log('  Engagement Rate:', stats.engagementRate);
          } else {
            console.log('⚠️  Stats fetch returned null - may need manual sync later');
          }
        } catch (statsError) {
          console.error('⚠️  Failed to fetch initial stats (non-blocking):', statsError.message);
          console.error('  Stats can be synced later from clients page');
          // Don't block OAuth flow - stats can be fetched later
        }

        // Import historical posts for NEW clients only
        if (!existingClient) {
          console.log('📥 Importing historical Instagram posts...');
          try {
            const importedCount = await importHistoricalPosts(client.igUserId, client.pageAccessToken, client._id);
            console.log(`✅ Historical import complete: ${importedCount} posts imported`);
          } catch (importError) {
            console.error('⚠️  Failed to import historical posts (non-blocking):', importError.message);
            console.error('  Posts can be manually refreshed later');
            // Don't block OAuth flow - posts can be fetched later
          }
        } else {
          console.log('ℹ️  Skipping historical import for existing client');
        }
      }

      // Redirect to clients page with success
      const action = existingClient ? 'client_updated' : 'client_added';
      // const frontendUrl = ... (using top scope variable)
      return res.redirect(`${frontendUrl}/dashboard/clients/${client._id}?success=${action}&platform=${platform}`);
    } catch (dbError) {
      console.error('❌ Database error saving client:');
      console.error('  Error message:', dbError.message);
      console.error('  Error stack:', dbError.stack);
      console.error('  Error name:', dbError.name);
      if (dbError.errors) {
        console.error('  Validation errors:', JSON.stringify(dbError.errors, null, 2));
      }
      // const frontendUrl = ... (using top scope variable)
      return res.redirect(`${frontendUrl}/dashboard/clients?error=database_error`);
    }
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    console.error('  Error stack:', error.stack);
    // Always redirect, never return JSON error (to avoid "Unauthorized" JSON response)
    // const frontendUrl = ... (using top scope variable)
    // Note: If error occurred before frontendUrl was defined at top, we need a fallback here
    const redirectBase = (process.env.NODE_ENV === 'development') ? 'http://localhost:3000' : 'https://socialhac.com';
    return res.redirect(`${redirectBase}/dashboard/clients?error=oauth_failed`);
  }
});

// Get OAuth authorization URL
router.post('/authorize', requireAuth, async (req, res) => {
  try {
    console.log('📥 OAuth authorize request received');
    console.log('  Body:', JSON.stringify(req.body));
    console.log('  User:', req.user?.sub || req.user?.id);

    const { platform, name, email, logo } = req.body;

    // DEBUG: Log the authenticated user requesting authorization
    const requestUserId = req.user.sub || req.user.id || req.user._id;
    console.log('🔐 [OAUTH START] /authorize called by UserID:', requestUserId);
    console.log('   Request Body:', JSON.stringify(req.body));

    if (!['instagram', 'facebook'].includes(platform)) {
      return res.status(400).json({ success: false, error: 'Invalid platform' });
    }

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are required' });
    }

    // Get user ID from authenticated request (this route requires auth)
    const userId = req.user.sub || req.user.id || req.user._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID not found in authentication token'
      });
    }

    // Encode client data and user ID in state parameter
    // State will be sent to OAuth provider and returned in callback
    const state = Buffer.from(JSON.stringify({
      name,
      email,
      logo: logo || null,
      userId: userId.toString()
    })).toString('base64');
    // Robustly construct base URL by removing trailing slash and any existing /api path
    const isDev = process.env.NODE_ENV === 'development';
    const baseUrl = isDev ? 'http://localhost:5001' : (process.env.API_URL || 'https://socialhac.com').replace(/\/$/, '').replace(/\/api.*$/, '');
    const redirectUri = `${baseUrl}/api/oauth/callback/${platform}`;

    let authUrl;

    if (platform === 'instagram') {
      // Instagram Business API OAuth via Facebook Graph API
      // For Instagram Business API, use Facebook App ID (can also use INSTAGRAM_CLIENT_ID if it's set to Facebook App ID)
      const facebookAppId = process.env.FACEBOOK_CLIENT_ID || process.env.INSTAGRAM_CLIENT_ID || '';
      if (!facebookAppId) {
        console.error('FACEBOOK_CLIENT_ID or INSTAGRAM_CLIENT_ID is not set');
        return res.status(500).json({
          success: false,
          error: 'Instagram Business API requires FACEBOOK_CLIENT_ID. Please set it in .env file.'
        });
      }

      // Log the configuration
      console.log('Instagram Business API OAuth Configuration:');
      console.log('  Facebook App ID:', facebookAppId);
      console.log('  Redirect URI:', redirectUri);
      console.log('  API URL:', process.env.API_URL || 'http://localhost:5001');
      // Use Facebook OAuth endpoint for Instagram Business API with explicit scopes
      // REMOVED unapproved scopes: pages_manage_posts, read_insights, business_messaging, pages_read_user_content
      const scopes = [
        'email',
        'public_profile',
        'instagram_basic',
        'instagram_content_publish',
        'instagram_manage_comments',
        'instagram_manage_insights',
        'pages_show_list',
        'pages_read_engagement',
        'business_management' // Optional, but good to request
      ].join(',');

      console.log('  Using explicit scopes:', scopes);

      authUrl = `https://www.facebook.com/v24.0/dialog/oauth?client_id=${facebookAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code&state=${state}`;
      console.log('Instagram Business API OAuth URL generated:', authUrl.replace(/client_id=[^&]+/, 'client_id=***'));
      console.log('⚠️  Make sure this redirect URI is configured in Instagram Business API settings:', redirectUri);
    } else if (platform === 'facebook') {
      const facebookClientId = process.env.FACEBOOK_CLIENT_ID || '';
      if (!facebookClientId) {
        console.error('FACEBOOK_CLIENT_ID is not set in environment variables');
        return res.status(500).json({
          success: false,
          error: 'Facebook OAuth not configured. Please set FACEBOOK_CLIENT_ID in .env file.'
        });
      }
      authUrl = `https://www.facebook.com/v24.0/dialog/oauth?client_id=${facebookClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email,public_profile&response_type=code&state=${state}`;
    }

    if (!authUrl) {
      console.error('Failed to generate auth URL for platform:', platform);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate OAuth URL. Unsupported platform.'
      });
    }

    res.json({ success: true, authUrl });
  } catch (error) {
    console.error('❌ OAuth authorize error:', error);
    console.error('  Error message:', error.message);
    console.error('  Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to generate OAuth URL',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
