# Social Accounts OAuth Setup Guide

This guide explains how to set up OAuth connections for Meta (Facebook/Instagram), LinkedIn, and X (Twitter).

## Environment Variables

Add these to your `backend/.env` file:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/social-media-platform

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5001

# OAuth Redirect Base URL
# For local development with ngrok: https://abc123.ngrok.io
# For production: https://yourdomain.com
OAUTH_REDIRECT_BASE=http://localhost:5000

# Meta (Facebook/Instagram) OAuth
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# X (Twitter) OAuth
X_CLIENT_ID=your_x_client_id
X_CLIENT_SECRET=your_x_client_secret

# Token Encryption Key (32 bytes / 256 bits)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
TOKEN_ENCRYPTION_KEY=your-32-byte-hex-encryption-key-here-change-this

# Redis (optional - for production state storage)
# REDIS_URL=redis://localhost:6379
```

## Generate Encryption Key

Run this command to generate a secure 32-byte encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and set it as `TOKEN_ENCRYPTION_KEY` in your `.env` file.

## Provider Setup

### 1. Meta (Facebook/Instagram)

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app or use an existing one
3. Add products:
   - **Facebook Login**
   - **Instagram Basic Display** (for Instagram)
4. In **Settings → Basic**, note your **App ID** and **App Secret**
5. Add OAuth redirect URI:
   - Go to **Facebook Login → Settings**
   - Add redirect URI: `{OAUTH_REDIRECT_BASE}/oauth/callback/meta`
   - Example: `https://abc123.ngrok.io/oauth/callback/meta`
6. Add test users (if in development mode):
   - Go to **Roles → Test Users**
   - Add yourself as a test user

**Required Scopes:**
- `instagram_basic`
- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_posts`
- `business_management`

### 2. LinkedIn

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create a new app
3. Note your **Client ID** and **Client Secret** from **Auth** tab
4. Add redirect URI:
   - Go to **Auth** tab
   - Add redirect URI: `{OAUTH_REDIRECT_BASE}/oauth/callback/linkedin`
   - Example: `https://abc123.ngrok.io/oauth/callback/linkedin`
5. Request access to required scopes:
   - `r_liteprofile`
   - `r_organization_social`
   - `w_organization_social`

### 3. X (Twitter)

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app or use an existing one
3. Enable OAuth 2.0
4. Note your **Client ID** and **Client Secret**
5. Add callback URI:
   - Go to **User authentication settings**
   - Add callback URI: `{OAUTH_REDIRECT_BASE}/oauth/callback/x`
   - Example: `https://abc123.ngrok.io/oauth/callback/x`
6. Set app permissions:
   - **Read and write** (for posting)
   - **Read** (for reading)

**Note:** X may require elevated access for posting. If your app is in development, you may need to apply for elevated access.

## Testing with ngrok

For local development, use ngrok to expose your local server:

1. **Install ngrok:**
   ```bash
   # macOS
   brew install ngrok
   
   # Or download from https://ngrok.com/
   ```

2. **Start ngrok:**
   ```bash
   ngrok http 5000
   ```

3. **Note the HTTPS URL:**
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:5000
   ```

4. **Update `.env`:**
   ```env
   OAUTH_REDIRECT_BASE=https://abc123.ngrok.io
   ```

5. **Add redirect URIs in provider dashboards:**
   - Meta: `https://abc123.ngrok.io/oauth/callback/meta`
   - LinkedIn: `https://abc123.ngrok.io/oauth/callback/linkedin`
   - X: `https://abc123.ngrok.io/oauth/callback/x`

## API Endpoints

### OAuth Connect
- `GET /oauth/connect/:provider` - Generate OAuth URL
  - Providers: `meta`, `linkedin`, `x`
  - Requires authentication
  - Returns: `{ success: true, redirectUrl: "..." }`

### OAuth Callback
- `GET /oauth/callback/:provider` - Handle OAuth callback
  - Automatically called by provider
  - Redirects to `/dashboard/accounts?connected={provider}` on success

### Accounts Management
- `GET /api/accounts/list` - List connected accounts
  - Requires authentication
  - Returns: `{ success: true, accounts: [...] }`

- `POST /api/accounts/refresh` - Refresh access token
  - Body: `{ accountId: "..." }`
  - Requires authentication

- `POST /api/accounts/disconnect` - Disconnect account
  - Body: `{ accountId: "..." }`
  - Requires authentication

## Testing with curl

```bash
# Get auth token first (login)
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  | jq -r '.token')

# List accounts
curl -X GET http://localhost:5000/api/accounts/list \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Refresh token
curl -X POST http://localhost:5000/api/accounts/refresh \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accountId":"account_id_here"}'

# Disconnect account
curl -X POST http://localhost:5000/api/accounts/disconnect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accountId":"account_id_here"}'
```

## Security Notes

1. **Token Encryption:** All access tokens and refresh tokens are encrypted at rest using AES-256-GCM
2. **State Parameter:** OAuth state is validated to prevent CSRF attacks
3. **HTTPS Required:** Use HTTPS in production (ngrok provides HTTPS for local testing)
4. **Minimal Scopes:** Only request the minimum scopes needed
5. **Token Expiration:** Tokens are automatically refreshed when expired (if refresh token available)

## Troubleshooting

### "Invalid state parameter"
- State token expired (10 minute TTL)
- State was already used (one-time use)
- Try connecting again

### "Token exchange failed"
- Check that client ID and secret are correct
- Verify redirect URI matches exactly in provider dashboard
- Check that app is in correct mode (development/production)

### "Missing code"
- User cancelled OAuth flow
- OAuth flow was interrupted
- Try connecting again

### Popup blocked
- Browser blocked OAuth popup
- Click the link provided in the modal
- Or allow popups for your domain

## Database Schema

The `social_accounts` collection stores:
- `userId` - Reference to user
- `provider` - 'meta', 'linkedin', or 'x'
- `providerAccountId` - Account ID from provider
- `accountName` - Display name
- `accessTokenEncrypted` - Encrypted access token
- `refreshTokenEncrypted` - Encrypted refresh token (if available)
- `expiresAt` - Token expiration date
- `scopes` - Array of granted scopes
- `connectedAt` - Connection timestamp
- `lastSyncAt` - Last sync timestamp
- `meta` - Provider-specific metadata

## Next Steps

1. Set up developer accounts for each provider
2. Configure OAuth apps in provider dashboards
3. Set environment variables
4. Start server with ngrok
5. Test OAuth flow via `/dashboard/accounts` page

