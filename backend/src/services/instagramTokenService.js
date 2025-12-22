/**
 * Instagram Token Lifecycle Management Service
 * Handles token exchange, refresh, validation, and expiration
 */

import Client from '../models/Client.js';

/**
 * Exchange short-lived token for long-lived token (60 days)
 * @param {string} shortLivedToken - Short-lived access token from OAuth
 * @returns {Promise<Object>} - Long-lived token data
 */
/**
 * Exchange short-lived token for long-lived token (60 days)
 * CRITICAL: This function MUST succeed - never returns short-lived tokens
 * @param {string} shortLivedToken - Short-lived access token from OAuth
 * @returns {Promise<Object>} - Long-lived token data
 */
export async function exchangeForLongLivedToken(shortLivedToken) {
  try {
    console.log('🔄 Exchanging short-lived token for long-lived token...');
    console.log('   Short token received (length):', shortLivedToken ? shortLivedToken.length : 'Missing');

    const appId = process.env.META_APP_ID || process.env.FB_APP_ID || process.env.FACEBOOK_CLIENT_ID;
    const appSecret = process.env.META_APP_SECRET || process.env.FB_APP_SECRET || process.env.FACEBOOK_CLIENT_SECRET;

    if (!appId || !appSecret) {
      const error = new Error('META_APP_ID/META_APP_SECRET or FACEBOOK_CLIENT_ID/FACEBOOK_CLIENT_SECRET must be set in environment variables');
      console.error('❌', error.message);
      throw error;
    }

    console.log('   Using App ID:', appId.substring(0, 10) + '...');
    console.log('   API Version: v20.0');

    // Use v20.0 API as requested (User suggested v19.0, but v20.0 is current)
    const url = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;

    console.log('   Requesting long-lived token from Facebook API...');
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      console.error('❌ Token exchange failed:', errorData);
      const errorMsg = errorData.error?.message || 'Unknown error';
      throw new Error(`Token exchange failed: ${errorMsg}. Code: ${errorData.error?.code || 'N/A'}`);
    }

    const data = await response.json();

    if (!data.access_token) {
      console.error('❌ No access_token in exchange response:', data);
      throw new Error('Token exchange succeeded but no access_token returned');
    }

    const expiresInDays = Math.floor(data.expires_in / 86400);
    console.log('✅ Long-lived token obtained successfully!');
    console.log(`   Token length: ${data.access_token.length}`);
    console.log(`   Expires in: ${data.expires_in} seconds (${expiresInDays} days)`);
    console.log(`   Token type: ${data.token_type || 'bearer'}`);

    return {
      accessToken: data.access_token,
      tokenType: data.token_type || 'bearer',
      expiresIn: data.expires_in || 5184000, // 60 days default
      createdAt: new Date()
    };
  } catch (error) {
    console.error('❌ Error exchanging token:', error.message);
    console.error('   This is a CRITICAL error - short-lived tokens cannot be saved!');
    throw error; // Always throw - never return short-lived tokens
  }
}

/**
 * Refresh long-lived token (extends for another 60 days)
 * CRITICAL: This function ONLY works on long-lived tokens
 * Short-lived tokens cannot be refreshed - they must be exchanged first
 * @param {string} longLivedToken - Current long-lived token (MUST be long-lived)
 * @returns {Promise<Object>} - New long-lived token data
 */
export async function refreshLongLivedToken(longLivedToken) {
  try {
    console.log('🔄 Refreshing long-lived Instagram token...');
    console.log('   ⚠️  This function ONLY works on long-lived tokens');
    console.log('   ⚠️  Short-lived tokens must be exchanged first, not refreshed');

    const appId = process.env.META_APP_ID || process.env.FB_APP_ID || process.env.FACEBOOK_CLIENT_ID;
    const appSecret = process.env.META_APP_SECRET || process.env.FB_APP_SECRET || process.env.FACEBOOK_CLIENT_SECRET;

    if (!appId || !appSecret) {
      throw new Error('META_APP_ID/META_APP_SECRET or FACEBOOK_CLIENT_ID/FACEBOOK_CLIENT_SECRET must be set in environment variables');
    }

    console.log('   Using App ID:', appId.substring(0, 10) + '...');
    console.log('   API Version: v20.0');

    // Use v20.0 API for consistency
    const url = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${longLivedToken}`;

    console.log('   Requesting token refresh from Facebook API...');
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      console.error('❌ Token refresh failed:', errorData);

      // Check if token is permanently expired
      if (errorData.error?.code === 190 || errorData.error?.type === 'OAuthException') {
        console.error('   ⚠️  Token is expired or invalid - user must re-authenticate');
        return {
          success: false,
          needReLogin: true,
          error: 'Token expired - user must re-authenticate'
        };
      }

      // Check if token is short-lived (cannot be refreshed)
      if (errorData.error?.message?.includes('short-lived') || errorData.error?.code === 100) {
        console.error('   ⚠️  This appears to be a short-lived token - cannot refresh');
        console.error('   ⚠️  Short-lived tokens must be exchanged for long-lived tokens first');
        return {
          success: false,
          needReLogin: true,
          error: 'Short-lived token cannot be refreshed - must exchange for long-lived token first'
        };
      }

      throw new Error(`Token refresh failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    if (!data.access_token) {
      console.error('❌ No access_token in refresh response:', data);
      throw new Error('Token refresh succeeded but no access_token returned');
    }

    const expiresInDays = Math.floor(data.expires_in / 86400);
    const now = new Date();
    const nextRefresh = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // Refresh in 30 days

    console.log('✅ Long-lived token refreshed successfully!');
    console.log(`   Token length: ${data.access_token.length}`);
    console.log(`   New expiration: ${data.expires_in} seconds (${expiresInDays} days)`);
    console.log(`   ✅ Token extended for another 60 days`);

    return {
      success: true,
      accessToken: data.access_token,
      tokenType: data.token_type || 'bearer',
      expiresIn: data.expires_in || 5184000,
      refreshedAt: now,
      expiresInDays,
      nextRefresh
    };
  } catch (error) {
    console.error('❌ Error refreshing token:', error.message);
    throw error;
  }
}

/**
 * Validate if token is still valid and not expired
 * @param {Object} client - Client document with token info
 * @returns {Promise<Object>} - Validation result
 */
export async function validateToken(client) {
  try {
    if (!client.pageAccessToken) {
      return {
        valid: false,
        needReLogin: true,
        reason: 'No access token found'
      };
    }

    // Check if token has expired based on stored metadata
    if (client.tokenExpiresAt) {
      const now = new Date();
      const expiresAt = new Date(client.tokenExpiresAt);

      // If token expired, return needReLogin
      if (now >= expiresAt) {
        console.log(`❌ Token expired for client ${client.name} at ${expiresAt.toISOString()}`);
        return {
          valid: false,
          needReLogin: true,
          reason: 'Token expired',
          expiredAt: expiresAt
        };
      }

      // If token expires in less than 30 days, mark for refresh (Refresh every ~30 days)
      const daysUntilExpiry = (expiresAt - now) / (1000 * 60 * 60 * 24);
      if (daysUntilExpiry < 30) {
        console.log(`⚠️  Token for ${client.name} expires in ${Math.floor(daysUntilExpiry)} days - should refresh soon`);
        return {
          valid: true,
          shouldRefresh: true,
          daysUntilExpiry: Math.floor(daysUntilExpiry)
        };
      }
    }

    // Test token with a simple API call
    if (client.igUserId) {
      const testUrl = `https://graph.facebook.com/v18.0/${client.igUserId}?fields=id,username&access_token=${client.pageAccessToken}`;
      const response = await fetch(testUrl);
      const data = await response.json(); // Read once

      if (!response.ok) {
        // Token is invalid
        if (data.error?.code === 190 || data.error?.type === 'OAuthException') {
          console.log(`❌ Token validation failed for ${client.name}: ${data.error.message}`);
          return {
            valid: false,
            needReLogin: true,
            reason: data.error.message,
            errorCode: data.error.code
          };
        }
      }

      console.log(`✅ Token valid for ${client.name} (username: ${data.username})`);
    }

    return {
      valid: true,
      shouldRefresh: false
    };
  } catch (error) {
    console.error(`❌ Error validating token for ${client.name}:`, error.message);
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Auto-refresh token if needed (called before API requests)
 * @param {Object} client - Client document
 * @returns {Promise<Object>} - Updated client with fresh token
 */
export async function ensureValidToken(client) {
  try {
    const validation = await validateToken(client);

    // Token expired - user must re-login
    if (validation.needReLogin) {
      console.log(`❌ Token expired for ${client.name} — user must re-login`);
      return {
        success: false,
        needReLogin: true,
        message: 'Instagram token expired. Please reconnect your account.',
        client
      };
    }

    // Token is valid but should be refreshed (< 7 days until expiry)
    if (validation.shouldRefresh) {
      console.log(`🔄 Auto-refreshing token for ${client.name} (expires in ${validation.daysUntilExpiry} days)...`);

      const refreshResult = await refreshLongLivedToken(client.pageAccessToken);

      if (refreshResult.needReLogin) {
        return {
          success: false,
          needReLogin: true,
          message: 'Instagram token expired. Please reconnect your account.',
          client
        };
      }

      if (refreshResult.success) {
        // Update client with new token
        client.pageAccessToken = refreshResult.accessToken;
        client.tokenCreatedAt = refreshResult.refreshedAt;
        client.tokenExpiresIn = refreshResult.expiresIn;
        client.tokenExpiresAt = new Date(refreshResult.refreshedAt.getTime() + (refreshResult.expiresIn * 1000));
        client.lastTokenRefresh = refreshResult.refreshedAt;

        await client.save();

        console.log(`✅ Token auto-refreshed for ${client.name}`);
      }
    }

    // Token is valid
    return {
      success: true,
      client
    };
  } catch (error) {
    console.error(`❌ Error ensuring valid token for ${client.name}:`, error.message);
    return {
      success: false,
      error: error.message,
      client
    };
  }
}

/**
 * Refresh all client tokens (for cron job)
 * @returns {Promise<Object>} - Refresh results
 */
export async function refreshAllClientTokens() {
  try {
    console.log('\n🔄 Starting automatic token refresh for all clients...');
    console.log('='.repeat(60));

    // Find all Instagram clients with tokens
    const clients = await Client.find({
      platform: 'instagram',
      pageAccessToken: { $exists: true, $ne: null }
    });

    console.log(`📊 Found ${clients.length} Instagram client(s) to check`);

    const results = {
      total: clients.length,
      refreshed: 0,
      failed: 0,
      needReLogin: 0,
      upToDate: 0
    };

    for (const client of clients) {
      try {
        console.log(`\n📱 Checking token for: ${client.name}`);

        const validation = await validateToken(client);

        // Token expired - user must re-login
        if (validation.needReLogin) {
          console.log(`   ❌ Token expired — user must re-login`);
          results.needReLogin++;

          // Mark client as needing re-authentication
          client.tokenStatus = {
            state: 'expired',
            expiresInDays: 0,
            lastRefresh: null,
            nextRefresh: null,
            lastRefreshStatus: 'failed'
          };
          client.tokenNeedsRefresh = true;
          await client.save();
          continue;
        }

        // Token valid but doesn't need refresh yet
        if (!validation.shouldRefresh) {
          console.log(`   ✅ Token up-to-date (${validation.daysUntilExpiry || '>7'} days remaining)`);
          results.upToDate++;
          continue;
        }

        // Token should be refreshed
        console.log(`   🔄 Refreshing token (expires in ${validation.daysUntilExpiry} days)...`);

        const refreshResult = await refreshLongLivedToken(client.pageAccessToken);

        if (refreshResult.needReLogin) {
          console.log(`   ❌ Refresh failed — user must re-login`);
          results.needReLogin++;

          client.tokenStatus = 'expired';
          client.tokenNeedsRefresh = true;
          await client.save();
          continue;
        }

        if (refreshResult.success) {
          // Update client with new token
          client.pageAccessToken = refreshResult.accessToken;
          client.tokenCreatedAt = refreshResult.refreshedAt;
          client.tokenExpiresIn = refreshResult.expiresIn;
          client.tokenExpiresAt = new Date(refreshResult.refreshedAt.getTime() + (refreshResult.expiresIn * 1000));
          client.lastTokenRefresh = refreshResult.refreshedAt;

          // Update new tokenStatus object
          client.tokenStatus = {
            state: refreshResult.expiresInDays > 30 ? 'active' : 'expiring',
            expiresInDays: refreshResult.expiresInDays,
            lastRefresh: refreshResult.refreshedAt,
            nextRefresh: refreshResult.nextRefresh,
            lastRefreshStatus: 'success'
          };

          client.tokenNeedsRefresh = false;

          await client.save();

          console.log(`   ✅ Token refreshed successfully`);
          console.log(`      Status: ${client.tokenStatus.state}`);
          console.log(`      Expires in: ${client.tokenStatus.expiresInDays} days`);
          console.log(`      Next Refresh: ${client.tokenStatus.nextRefresh.toISOString().split('T')[0]}`);

          results.refreshed++;
        }
      } catch (error) {
        console.error(`   ❌ Error refreshing token for ${client.name}:`, error.message);
        results.failed++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Token Refresh Summary:');
    console.log(`   Total clients: ${results.total}`);
    console.log(`   ✅ Refreshed: ${results.refreshed}`);
    console.log(`   ✅ Up-to-date: ${results.upToDate}`);
    console.log(`   ⚠️  Need re-login: ${results.needReLogin}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log('='.repeat(60) + '\n');

    return results;
  } catch (error) {
    console.error('❌ Error in refreshAllClientTokens:', error);
    throw error;
  }
}

/**
 * Get debug token info (for debugging)
 * @param {string} accessToken - Access token to debug
 * @returns {Promise<Object>} - Token debug info
 */
export async function getTokenDebugInfo(accessToken) {
  try {
    const appId = process.env.META_APP_ID || process.env.FB_APP_ID;
    const appToken = `${appId}|${process.env.META_APP_SECRET || process.env.FB_APP_SECRET}`;

    const url = `https://graph.facebook.com/v18.0/debug_token?input_token=${accessToken}&access_token=${appToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.data) {
      return {
        appId: data.data.app_id,
        type: data.data.type,
        application: data.data.application,
        expiresAt: data.data.expires_at ? new Date(data.data.expires_at * 1000) : null,
        isValid: data.data.is_valid,
        scopes: data.data.scopes,
        userId: data.data.user_id
      };
    }

    return data;
  } catch (error) {
    console.error('Error getting token debug info:', error);
    return null;
  }
}
