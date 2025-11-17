import express from 'express';
import mongoose from 'mongoose';
import Client from '../models/Client.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

// Helper function to get the base URL for redirect URIs
// Detects ngrok and other forwarded hosts
const getBaseUrl = (req) => {
  // Check for forwarded host (ngrok sets this)
  const forwardedHost = req.get('x-forwarded-host');
  const forwardedProto = req.get('x-forwarded-proto') || 'https';
  
  if (forwardedHost) {
    // ngrok or other proxy detected
    return `${forwardedProto}://${forwardedHost}`;
  }
  
  // Check origin header
  const origin = req.get('origin');
  if (origin) {
    return origin;
  }
  
  // Check referer header
  const referer = req.get('referer');
  if (referer) {
    try {
      const url = new URL(referer);
      return `${url.protocol}//${url.host}`;
    } catch (e) {
      // Invalid referer, continue
    }
  }
  
  // Fall back to environment variable or localhost
  return process.env.API_URL || 'http://localhost:5001';
};

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

    // Check for OAuth errors from Facebook/Instagram
    if (error) {
      console.error('❌ OAuth error received from provider');
      console.error('  Error:', error);
      console.error('  Error description:', error_description);
      console.error('  Error reason:', error_reason);
      
      let errorParam = 'oauth_error';
      if (error === 'access_denied') {
        errorParam = 'oauth_cancelled';
      }
      
      // Build redirect URL with error parameters
      let redirectUrl = `/dashboard/clients?error=${errorParam}`;
      if (error_description) {
        // Encode error description to pass it to frontend
        const encodedError = encodeURIComponent(error_description);
        redirectUrl += `&error_description=${encodedError}`;
      }
      if (error_reason) {
        const encodedReason = encodeURIComponent(error_reason);
        redirectUrl += `&error_reason=${encodedReason}`;
      }
      
      return res.redirect(redirectUrl);
    }

    if (!code) {
      console.error('❌ No authorization code received');
      return res.redirect(`/dashboard/clients?error=oauth_cancelled`);
    }

    if (!state) {
      console.error('❌ No state parameter received');
      return res.redirect(`/dashboard/clients?error=invalid_state`);
    }

    // Extract client data from state (includes userId, name, email)
    let clientData = {};
    try {
      console.log('📦 Decoding state parameter...');
      const decodedState = Buffer.from(state, 'base64').toString();
      console.log('  Decoded state:', decodedState);
      clientData = JSON.parse(decodedState);
      console.log('  Parsed clientData:', JSON.stringify(clientData));
    } catch (e) {
      console.error('❌ Error parsing state:', e.message);
      console.error('  State value:', state);
      return res.redirect(`/dashboard/clients?error=invalid_state`);
    }

    // Get user ID from state parameter (set during OAuth initiation)
    const userIdString = clientData.userId;
    if (!userIdString) {
      console.error('❌ No userId found in state parameter');
      console.error('  clientData:', JSON.stringify(clientData));
      return res.redirect(`/dashboard/clients?error=invalid_user`);
    }
    
    console.log('✅ User ID extracted from state:', userIdString);

    // Convert string ID to ObjectId for MongoDB
    const userId = mongoose.Types.ObjectId.isValid(userIdString) 
      ? new mongoose.Types.ObjectId(userIdString)
      : userIdString;

    if (!['instagram', 'facebook'].includes(platform)) {
      console.error('❌ Invalid platform:', platform);
      return res.redirect(`/dashboard/clients?error=invalid_platform`);
    }

    console.log(`✅ Platform validated: ${platform}`);

    // Exchange code for access token
    let accessToken, refreshToken, socialMediaId, socialMediaLink;
    // Instagram Business API specific variables
    let pageId = null, pageAccessToken = null, igUserId = null;

    if (platform === 'instagram') {
      console.log('📱 Starting Instagram Business API OAuth flow...');
      
      // Instagram Business API OAuth flow via Facebook Graph API
      const baseUrl = getBaseUrl(req);
      const redirectUri = `${baseUrl}/auth/instagram/callback`;
      console.log('  Base URL:', baseUrl);
      console.log('  Redirect URI:', redirectUri);
      
      // For Instagram Business API, use Facebook App ID (can also use INSTAGRAM_CLIENT_ID if it's set to Facebook App ID)
      const clientId = process.env.FACEBOOK_CLIENT_ID || process.env.INSTAGRAM_CLIENT_ID || '';
      const clientSecret = process.env.FACEBOOK_CLIENT_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || '';
      
      console.log('  Client ID configured:', clientId ? 'Yes' : 'No');
      console.log('  Client Secret configured:', clientSecret ? 'Yes' : 'No');
      
      if (!clientId || !clientSecret) {
        console.error('❌ Instagram Business API credentials not configured');
        console.error('  FACEBOOK_CLIENT_ID:', process.env.FACEBOOK_CLIENT_ID ? 'Set' : 'Missing');
        console.error('  FACEBOOK_CLIENT_SECRET:', process.env.FACEBOOK_CLIENT_SECRET ? 'Set' : 'Missing');
        console.error('  INSTAGRAM_CLIENT_ID:', process.env.INSTAGRAM_CLIENT_ID ? 'Set' : 'Missing');
        console.error('  INSTAGRAM_CLIENT_SECRET:', process.env.INSTAGRAM_CLIENT_SECRET ? 'Set' : 'Missing');
        return res.redirect(`/dashboard/clients?error=instagram_config_missing`);
      }
      
      try {
        // Step 1: Exchange code for short-lived access token
        console.log('📱 Step 1: Exchanging code for short-lived access token...');
        console.log('  Authorization code received:', code ? 'Yes (length: ' + code.length + ')' : 'No');
        console.log('  Redirect URI:', redirectUri);
        console.log('  Client ID:', clientId ? clientId.substring(0, 10) + '...' : 'Missing');
        
        const tokenUrl = `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;
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
          return res.redirect(`/dashboard/clients?error=instagram_network_error`);
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
          return res.redirect(`/dashboard/clients?error=instagram_token_failed`);
        }

        let tokenData;
        try {
          tokenData = await tokenResponse.json();
          console.log('  Token response received:', Object.keys(tokenData).join(', '));
        } catch (parseError) {
          console.error('❌ Error parsing token response JSON:', parseError.message);
          const responseText = await tokenResponse.text();
          console.error('  Raw response:', responseText);
          return res.redirect(`/dashboard/clients?error=instagram_token_parse_error`);
        }
        
        if (!tokenData.access_token) {
          console.error('❌ No access_token in token response');
          console.error('  Token data:', JSON.stringify(tokenData, null, 2));
          return res.redirect(`/dashboard/clients?error=instagram_no_access_token`);
        }
        
        const shortLivedToken = tokenData.access_token;
        const expiresIn = tokenData.expires_in;
        
        console.log('✅ Short-lived token received');
        console.log('  Token length:', shortLivedToken ? shortLivedToken.length : 'Missing');
        console.log('  Expires in:', expiresIn, 'seconds');

        // Step 2: Exchange short-lived token for long-lived user token (60 days)
        console.log('📱 Step 2: Exchanging for long-lived user token...');
        const longLivedTokenUrl = `https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`;
        console.log('  Long-lived token URL (masked):', longLivedTokenUrl.replace(/client_secret=[^&]+/, 'client_secret=***').replace(/fb_exchange_token=[^&]+/, 'fb_exchange_token=***'));
        
        let longLivedResponse;
        try {
          longLivedResponse = await fetch(longLivedTokenUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          console.log('  Long-lived response status:', longLivedResponse.status, longLivedResponse.statusText);
        } catch (fetchError) {
          console.error('❌ Network error fetching long-lived token:', fetchError.message);
          console.error('  Will continue with short-lived token');
          accessToken = shortLivedToken;
        }

        if (longLivedResponse && !longLivedResponse.ok) {
          const errorData = await longLivedResponse.text();
          console.error('❌ Long-lived token exchange error:');
          console.error('  Status:', longLivedResponse.status);
          console.error('  Error Response:', errorData);
          console.error('  Will continue with short-lived token');
          // Continue with short-lived token if exchange fails
          accessToken = shortLivedToken;
        } else if (longLivedResponse && longLivedResponse.ok) {
          try {
            const longLivedData = await longLivedResponse.json();
            if (longLivedData.access_token) {
              accessToken = longLivedData.access_token;
              console.log('✅ Long-lived user token received');
              console.log('  Expires in:', longLivedData.expires_in, 'seconds');
            } else {
              console.error('❌ No access_token in long-lived response, using short-lived token');
              accessToken = shortLivedToken;
            }
          } catch (parseError) {
            console.error('❌ Error parsing long-lived token response:', parseError.message);
            console.error('  Will continue with short-lived token');
            accessToken = shortLivedToken;
          }
        }

        // Step 3: Get user's Facebook Pages
        // Request pages with all necessary permissions for Instagram publishing
        console.log('📱 Step 3: Fetching user\'s Facebook Pages...');
        console.log('  Using access token:', accessToken ? 'Yes (length: ' + accessToken.length + ')' : 'No');
        // Request pages with fields including access_token and permissions
        // The access_token returned here should have the permissions requested in the OAuth scopes
        const pagesUrl = `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`;
        console.log('  Pages URL (masked):', pagesUrl.replace(/access_token=[^&]+/, 'access_token=***'));
        
        let pagesResponse;
        try {
          pagesResponse = await fetch(pagesUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          console.log('  Pages response status:', pagesResponse.status, pagesResponse.statusText);
        } catch (fetchError) {
          console.error('❌ Network error fetching pages:', fetchError.message);
          console.error('  Error stack:', fetchError.stack);
          return res.redirect(`/dashboard/clients?error=instagram_pages_network_error`);
        }

        if (!pagesResponse.ok) {
          const errorData = await pagesResponse.text();
          console.error('❌ Failed to fetch pages:');
          console.error('  Status:', pagesResponse.status);
          console.error('  Status Text:', pagesResponse.statusText);
          console.error('  Error Response:', errorData);
          try {
            const errorJson = JSON.parse(errorData);
            console.error('  Parsed Error:', JSON.stringify(errorJson, null, 2));
          } catch (e) {
            console.error('  Error is not JSON');
          }
          return res.redirect(`/dashboard/clients?error=instagram_pages_failed`);
        }

        let pagesData;
        try {
          pagesData = await pagesResponse.json();
          console.log('  Pages response keys:', Object.keys(pagesData).join(', '));
        } catch (parseError) {
          console.error('❌ Error parsing pages response JSON:', parseError.message);
          const responseText = await pagesResponse.text();
          console.error('  Raw response:', responseText);
          return res.redirect(`/dashboard/clients?error=instagram_pages_parse_error`);
        }
        
        const pages = pagesData.data || [];
        console.log(`✅ Found ${pages.length} page(s)`);
        
        if (pages.length === 0) {
          console.error('❌ No Facebook Pages found.');
          console.error('  User must have a Facebook Page connected to Instagram Business account.');
          console.error('  Pages response:', JSON.stringify(pagesData, null, 2));
          return res.redirect(`/dashboard/clients?error=instagram_no_pages`);
        }
        
        console.log('  Page IDs:', pages.map(p => p.id).join(', '));

        // Step 4: Find page with connected Instagram Business Account
        console.log('📱 Step 4: Finding page with connected Instagram Business Account...');
        let pageName = null;
        let pagesChecked = 0;

        for (const page of pages) {
          pagesChecked++;
          console.log(`  Checking page ${pagesChecked}/${pages.length}: ${page.id}`);
          console.log('    Page has access token:', page.access_token ? 'Yes' : 'No');
          
          const pageInfoUrl = `https://graph.facebook.com/v22.0/${page.id}?fields=instagram_business_account,name&access_token=${page.access_token}`;
          console.log('    Page info URL (masked):', pageInfoUrl.replace(/access_token=[^&]+/, 'access_token=***'));
          
          let pageInfoResponse;
          try {
            pageInfoResponse = await fetch(pageInfoUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            console.log('    Page info response status:', pageInfoResponse.status, pageInfoResponse.statusText);
          } catch (fetchError) {
            console.error('    ❌ Network error fetching page info:', fetchError.message);
            continue; // Try next page
          }

          if (pageInfoResponse.ok) {
            let pageInfo;
            try {
              pageInfo = await pageInfoResponse.json();
              console.log('    Page info keys:', Object.keys(pageInfo).join(', '));
            } catch (parseError) {
              console.error('    ❌ Error parsing page info JSON:', parseError.message);
              continue; // Try next page
            }
            
            console.log('    Page name:', pageInfo.name || 'Not found');
            console.log('    Has Instagram Business Account:', pageInfo.instagram_business_account ? 'Yes' : 'No');
            
            if (pageInfo.instagram_business_account) {
              pageId = page.id;
              pageAccessToken = page.access_token; // This is already a long-lived page token
              igUserId = pageInfo.instagram_business_account.id;
              pageName = pageInfo.name;
              
              console.log('✅ Found Instagram Business Account!');
              console.log('  Page ID:', pageId);
              console.log('  Page Name:', pageName);
              console.log('  IG Business Account ID:', igUserId);
              break;
            } else {
              console.log('    ❌ This page does not have Instagram Business Account connected');
            }
          } else {
            const errorData = await pageInfoResponse.text();
            console.error('    ❌ Failed to fetch page info:');
            console.error('      Status:', pageInfoResponse.status);
            console.error('      Error:', errorData);
            continue; // Try next page
          }
        }

        if (!igUserId) {
          console.error('❌ No Instagram Business Account found after checking', pagesChecked, 'page(s)');
          console.error('  User must connect Instagram Business account to a Facebook Page.');
          console.error('  Steps to fix:');
          console.error('    1. Go to Facebook Page Settings');
          console.error('    2. Link Instagram Business Account to the Page');
          console.error('    3. Try connecting again');
          return res.redirect(`/dashboard/clients?error=instagram_no_ig_account`);
        }

        // Step 5: Get Instagram Business Account info
        console.log('📱 Step 5: Fetching Instagram Business Account info...');
        console.log('  IG User ID:', igUserId);
        console.log('  Page Access Token:', pageAccessToken ? 'Yes (length: ' + pageAccessToken.length + ')' : 'No');
        
        try {
          const igInfoUrl = `https://graph.facebook.com/v22.0/${igUserId}?fields=id,username&access_token=${pageAccessToken}`;
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
              console.log('✅ Instagram username:', igInfo.username);
              console.log('  Instagram link:', socialMediaLink);
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
                
                return res.redirect(`/dashboard/clients?error=instagram_permission_error&error_description=${encodeURIComponent(errorDescription)}&app_id=${appId}`);
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
        return res.redirect(`/dashboard/clients?error=instagram_oauth_failed`);
      }
    } else if (platform === 'facebook') {
      console.log('📘 Starting Facebook OAuth flow...');
      
      // Facebook OAuth flow
      const baseUrl = getBaseUrl(req);
      const redirectUri = `${baseUrl}/auth/facebook/callback`;
      console.log('  Base URL:', baseUrl);
      console.log('  Redirect URI:', redirectUri);
      
      const facebookClientId = process.env.FACEBOOK_CLIENT_ID || '';
      const facebookClientSecret = process.env.FACEBOOK_CLIENT_SECRET || '';
      
      console.log('  Client ID configured:', facebookClientId ? 'Yes' : 'No');
      console.log('  Client Secret configured:', facebookClientSecret ? 'Yes' : 'No');
      
      if (!facebookClientId || !facebookClientSecret) {
        console.error('❌ Facebook OAuth credentials not configured');
        console.error('  FACEBOOK_CLIENT_ID:', process.env.FACEBOOK_CLIENT_ID ? 'Set' : 'Missing');
        console.error('  FACEBOOK_CLIENT_SECRET:', process.env.FACEBOOK_CLIENT_SECRET ? 'Set' : 'Missing');
        return res.redirect(`/dashboard/clients?error=facebook_config_missing`);
      }
      
      try {
        // Step 1: Exchange code for access token
        console.log('📘 Step 1: Exchanging code for Facebook access token...');
        console.log('  Authorization code received:', code ? 'Yes (length: ' + code.length + ')' : 'No');
        console.log('  Client ID:', facebookClientId ? facebookClientId.substring(0, 10) + '...' : 'Missing');
        
        const tokenUrl = `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${facebookClientId}&client_secret=${facebookClientSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;
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
          return res.redirect(`/dashboard/clients?error=facebook_network_error`);
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
          return res.redirect(`/dashboard/clients?error=facebook_token_failed`);
        }

        let tokenData;
        try {
          tokenData = await tokenResponse.json();
          console.log('  Token response received:', Object.keys(tokenData).join(', '));
        } catch (parseError) {
          console.error('❌ Error parsing Facebook token response JSON:', parseError.message);
          const responseText = await tokenResponse.text();
          console.error('  Raw response:', responseText);
          return res.redirect(`/dashboard/clients?error=facebook_token_parse_error`);
        }
        
        if (!tokenData.access_token) {
          console.error('❌ No access_token in Facebook token response');
          console.error('  Token data:', JSON.stringify(tokenData, null, 2));
          return res.redirect(`/dashboard/clients?error=facebook_no_access_token`);
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
          const userInfoUrl = `https://graph.facebook.com/v22.0/me?access_token=${accessToken}&fields=id,name,email`;
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
        return res.redirect(`/dashboard/clients?error=facebook_oauth_failed`);
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
      createdBy: userId,
    };

    // Add Instagram Business API specific fields if platform is Instagram
    if (platform === 'instagram') {
      clientDataToSave.longLivedUserToken = accessToken; // Long-lived user token
      clientDataToSave.pageId = pageId;
      clientDataToSave.pageAccessToken = pageAccessToken; // Long-lived page token for publishing
      clientDataToSave.igUserId = igUserId;
      console.log('  Instagram-specific fields added');
      console.log('    Page ID:', pageId);
      console.log('    IG User ID:', igUserId);
    }

    try {
      const client = new Client(clientDataToSave);
      console.log('  Client object created, saving to database...');
      await client.save();
      console.log('✅ Client saved successfully!');
      console.log('  Client ID:', client._id);
      
      // Redirect to clients page with success
      return res.redirect(`/dashboard/clients?success=client_added&platform=${platform}`);
    } catch (dbError) {
      console.error('❌ Database error saving client:');
      console.error('  Error message:', dbError.message);
      console.error('  Error stack:', dbError.stack);
      console.error('  Error name:', dbError.name);
      if (dbError.errors) {
        console.error('  Validation errors:', JSON.stringify(dbError.errors, null, 2));
      }
      return res.redirect(`/dashboard/clients?error=database_error`);
    }
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    console.error('  Error stack:', error.stack);
    // Always redirect, never return JSON error (to avoid "Unauthorized" JSON response)
    return res.redirect(`/dashboard/clients?error=oauth_failed`);
  }
});

// Get OAuth authorization URL
router.post('/authorize', requireAuth, async (req, res) => {
  try {
    console.log('📥 OAuth authorize request received');
    console.log('  Body:', JSON.stringify(req.body));
    console.log('  User:', req.user?.sub || req.user?.id);
    
    const { platform, name, email } = req.body;

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
      userId: userId.toString() 
    })).toString('base64');
    // Build redirect URI based on platform
    // Detect ngrok or forwarded host from request
    const baseUrl = getBaseUrl(req);
    const redirectUri = platform === 'instagram' 
      ? `${baseUrl}/auth/instagram/callback`
      : `${baseUrl}/auth/facebook/callback`;
    
    console.log('  Base URL detected:', baseUrl);
    console.log('  Redirect URI:', redirectUri);

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
      
      // Instagram Business API scopes (via Facebook OAuth)
      // Required permissions for Instagram publishing:
      // - pages_manage_posts: Required to publish content to Instagram via Page
      // - instagram_content_publish: Required to publish to Instagram
      // - pages_show_list: Required to list user's Facebook Pages
      // - pages_read_engagement: Required to read page engagement metrics
      // - instagram_basic: Required for basic Instagram account info
      // - business_management: Required for managing business assets
      const scopes = [
        'instagram_basic',
        'instagram_content_publish',
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'instagram_manage_insights',
        'instagram_manage_comments',
        'business_management'
      ].join(',');
      
      // Log the configuration
      console.log('Instagram Business API OAuth Configuration:');
      console.log('  Facebook App ID:', facebookAppId);
      console.log('  Redirect URI:', redirectUri);
      console.log('  API URL:', process.env.API_URL || 'http://localhost:5001');
      console.log('  Scopes:', scopes);
      
      // Use Facebook OAuth endpoint for Instagram Business API (v18.0)
      authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${facebookAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=${state}`;
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
      authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${facebookClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email,public_profile&response_type=code&state=${state}`;
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
