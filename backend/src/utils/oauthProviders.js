import axios from 'axios';

const ALLOWED_PROVIDERS = ['meta', 'linkedin', 'x'];

/**
 * Get OAuth configuration for a provider
 */
export function getProviderConfig(provider) {
  if (!ALLOWED_PROVIDERS.includes(provider)) {
    throw new Error(`Invalid provider: ${provider}`);
  }

  const redirectBase = process.env.OAUTH_REDIRECT_BASE || 'http://localhost:5000';
  const redirectUri = `${redirectBase}/oauth/callback/${provider}`;

  switch (provider) {
    case 'meta':
      return {
        clientId: process.env.META_APP_ID,
        clientSecret: process.env.META_APP_SECRET,
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v22.0/oauth/access_token',
        redirectUri,
        scopes: [
          'instagram_basic',
          'pages_show_list',
          'pages_read_engagement',
          'pages_manage_posts',
          'business_management'
        ].join(',')
      };

    case 'linkedin':
      return {
        clientId: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
        redirectUri,
        scopes: [
          'r_liteprofile',
          'r_organization_social',
          'w_organization_social'
        ].join(' ')
      };

    case 'x':
      return {
        clientId: process.env.X_CLIENT_ID,
        clientSecret: process.env.X_CLIENT_SECRET,
        authUrl: 'https://twitter.com/i/oauth2/authorize',
        tokenUrl: 'https://api.twitter.com/2/oauth2/token',
        redirectUri,
        scopes: [
          'tweet.read',
          'tweet.write',
          'users.read',
          'offline.access'
        ].join(' ')
      };

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Build OAuth authorization URL
 */
export function buildAuthUrl(provider, state) {
  const config = getProviderConfig(provider);
  
  if (!config.clientId || !config.clientSecret) {
    const missing = !config.clientId ? 'client ID' : 'client secret';
    throw new Error(`${provider} OAuth not configured. Missing ${missing}. Please set ${provider.toUpperCase()}_APP_ID and ${provider.toUpperCase()}_APP_SECRET in .env file.`);
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes,
    state: state
  });

  // X (Twitter) uses different parameter name
  if (provider === 'x') {
    params.set('code_challenge', 'challenge');
    params.set('code_challenge_method', 'plain');
  }

  return `${config.authUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(provider, code) {
  const config = getProviderConfig(provider);

  if (!config.clientId || !config.clientSecret) {
    throw new Error(`${provider} OAuth not configured. Missing credentials.`);
  }

  try {
    const tokenData = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      redirect_uri: config.redirectUri
    };

    let response;

    switch (provider) {
      case 'meta':
        tokenData.grant_type = 'authorization_code';
        response = await axios.post(config.tokenUrl, new URLSearchParams(tokenData), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return {
          accessToken: response.data.access_token,
          expiresIn: response.data.expires_in,
          tokenType: response.data.token_type || 'Bearer'
        };

      case 'linkedin':
        tokenData.grant_type = 'authorization_code';
        response = await axios.post(config.tokenUrl, new URLSearchParams(tokenData), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresIn: response.data.expires_in,
          tokenType: response.data.token_type || 'Bearer'
        };

      case 'x':
        tokenData.grant_type = 'authorization_code';
        tokenData.code_verifier = 'challenge'; // For X OAuth 2.0
        response = await axios.post(config.tokenUrl, new URLSearchParams(tokenData), {
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        });
        return {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresIn: response.data.expires_in,
          tokenType: response.data.token_type || 'Bearer'
        };

      default:
        throw new Error(`Token exchange not implemented for ${provider}`);
    }
  } catch (error) {
    console.error(`Token exchange error for ${provider}:`, error.response?.data || error.message);
    throw new Error(`Failed to exchange code for token: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Fetch user profile from provider
 */
export async function fetchUserProfile(provider, accessToken) {
  try {
    switch (provider) {
      case 'meta':
        // Fetch user info
        const userResponse = await axios.get('https://graph.facebook.com/v22.0/me', {
          params: {
            fields: 'id,name',
            access_token: accessToken
          }
        });
        
        // Fetch pages
        let pages = [];
        try {
          const pagesResponse = await axios.get('https://graph.facebook.com/v22.0/me/accounts', {
            params: {
              access_token: accessToken
            }
          });
          pages = pagesResponse.data.data || [];
        } catch (err) {
          console.warn('Failed to fetch pages:', err.message);
        }

        return {
          providerAccountId: userResponse.data.id,
          accountName: userResponse.data.name,
          meta: {
            pages: pages.map(page => ({
              id: page.id,
              name: page.name,
              accessToken: page.access_token // Will be encrypted separately if storing
            }))
          }
        };

      case 'linkedin':
        const linkedinResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        return {
          providerAccountId: linkedinResponse.data.sub,
          accountName: linkedinResponse.data.name || linkedinResponse.data.email,
          meta: {}
        };

      case 'x':
        const xResponse = await axios.get('https://api.twitter.com/2/users/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          params: {
            'user.fields': 'id,name,username'
          }
        });
        const user = xResponse.data.data;
        return {
          providerAccountId: user.id,
          accountName: user.name || user.username,
          meta: {
            username: user.username
          }
        };

      default:
        throw new Error(`Profile fetch not implemented for ${provider}`);
    }
  } catch (error) {
    console.error(`Profile fetch error for ${provider}:`, error.response?.data || error.message);
    throw new Error(`Failed to fetch profile: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(provider, refreshToken) {
  const config = getProviderConfig(provider);

  try {
    const tokenData = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    };

    let response;

    switch (provider) {
      case 'meta':
        // Meta long-lived token exchange
        response = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token', {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: config.clientId,
            client_secret: config.clientSecret,
            fb_exchange_token: refreshToken
          }
        });
        return {
          accessToken: response.data.access_token,
          expiresIn: response.data.expires_in
        };

      case 'linkedin':
        response = await axios.post(config.tokenUrl, new URLSearchParams(tokenData), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresIn: response.data.expires_in
        };

      case 'x':
        tokenData.code_verifier = 'challenge';
        response = await axios.post(config.tokenUrl, new URLSearchParams(tokenData), {
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        });
        return {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresIn: response.data.expires_in
        };

      default:
        throw new Error(`Token refresh not implemented for ${provider}`);
    }
  } catch (error) {
    console.error(`Token refresh error for ${provider}:`, error.response?.data || error.message);
    throw new Error(`Failed to refresh token: ${error.response?.data?.error || error.message}`);
  }
}

