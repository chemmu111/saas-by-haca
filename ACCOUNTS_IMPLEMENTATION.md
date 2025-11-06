# Social Accounts Implementation Summary

## Overview

Complete implementation of social accounts OAuth connection system for Meta (Facebook/Instagram), LinkedIn, and X (Twitter).

## Files Created

### Backend

1. **`backend/src/models/SocialAccount.js`**
   - MongoDB schema for social accounts
   - Fields: userId, provider, providerAccountId, encrypted tokens, expiration, scopes, metadata

2. **`backend/src/utils/crypto.js`**
   - AES-256-GCM encryption/decryption for tokens
   - Secure state token generation
   - Uses `TOKEN_ENCRYPTION_KEY` from environment

3. **`backend/src/utils/oauthProviders.js`**
   - Provider-specific OAuth configuration
   - Token exchange logic
   - Profile fetching
   - Token refresh logic

4. **`backend/src/controllers/socialAccountsController.js`**
   - Connect account logic
   - List accounts
   - Refresh tokens
   - Disconnect accounts
   - In-memory state store (for development)

5. **`backend/src/routes/accountsOAuth.js`**
   - `GET /oauth/connect/:provider` - Generate OAuth URL
   - `GET /oauth/callback/:provider` - Handle OAuth callback

6. **`backend/src/routes/accounts.js`**
   - `GET /api/accounts/list` - List connected accounts
   - `POST /api/accounts/refresh` - Refresh token
   - `POST /api/accounts/disconnect` - Disconnect account

### Frontend

1. **`frontend/public/accounts.html`**
   - Main accounts page UI
   - Connect buttons for each provider
   - List of connected accounts
   - OAuth modal

2. **`frontend/public/accounts.css`**
   - Styling matching login/signup theme
   - Responsive design
   - Modal and toast notifications

3. **`frontend/public/accounts.js`**
   - OAuth flow handling
   - Account list rendering
   - Refresh/disconnect functionality
   - Popup handling with fallback

### Documentation

1. **`ACCOUNTS_SETUP.md`**
   - Complete setup guide
   - Provider configuration instructions
   - ngrok testing guide
   - API endpoint documentation

2. **`backend/test-accounts-api.sh`**
   - Test script for API endpoints
   - Demonstrates authentication and API calls

## Routes

### OAuth Routes
- `GET /oauth/connect/:provider` - Generate OAuth URL (requires auth)
- `GET /oauth/callback/:provider` - Handle OAuth callback (no auth needed)

### Accounts API Routes
- `GET /api/accounts/list` - List accounts (requires auth)
- `POST /api/accounts/refresh` - Refresh token (requires auth)
- `POST /api/accounts/disconnect` - Disconnect account (requires auth)

## Frontend Routes

- `GET /dashboard/accounts` - Accounts management page
- `GET /dashboard/accounts.html` - Same as above

## Environment Variables Required

See `ACCOUNTS_SETUP.md` for complete list. Key variables:
- `META_APP_ID`, `META_APP_SECRET`
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`
- `X_CLIENT_ID`, `X_CLIENT_SECRET`
- `OAUTH_REDIRECT_BASE` - Your ngrok URL or production domain
- `TOKEN_ENCRYPTION_KEY` - 32-byte hex key for token encryption

## Security Features

1. **Token Encryption**: All tokens encrypted at rest using AES-256-GCM
2. **State Validation**: OAuth state parameter validated to prevent CSRF
3. **HTTPS Required**: Use ngrok for local testing (provides HTTPS)
4. **Minimal Scopes**: Only request necessary permissions
5. **Token Expiration**: Automatic token refresh when expired

## Testing

### Using Test Script

```bash
cd backend
./test-accounts-api.sh
```

### Manual Testing

1. Start backend server
2. Start ngrok: `ngrok http 5000`
3. Set `OAUTH_REDIRECT_BASE` to ngrok URL
4. Add redirect URIs in provider dashboards
5. Visit `/dashboard/accounts`
6. Click "Connect" for a provider
7. Complete OAuth flow
8. Verify account appears in list

## Database Schema

The `social_accounts` collection includes:
- User reference
- Provider and account ID
- Encrypted tokens
- Expiration dates
- Scopes granted
- Connection timestamps
- Provider-specific metadata

## Next Steps

1. **Set up provider apps** in each platform's developer console
2. **Configure environment variables** in `backend/.env`
3. **Generate encryption key** using Node.js crypto
4. **Set up ngrok** for local testing
5. **Add redirect URIs** in provider dashboards
6. **Test OAuth flows** via `/dashboard/accounts` page

## Known Limitations / Future Enhancements

1. **X OAuth 2.0 PKCE**: Currently uses placeholder code_verifier. Should implement proper PKCE flow.
2. **LinkedIn API**: Profile endpoint may need adjustment based on LinkedIn API version.
3. **State Storage**: Currently in-memory. For production, use Redis.
4. **Token Revocation**: Not implemented yet. Should revoke tokens on disconnect.
5. **Page Selection**: For Meta, currently connects first available page. Could add page selection UI.

## Troubleshooting

### "Invalid state parameter"
- State token expired (10 minute TTL)
- State already used (one-time use)
- Try connecting again

### "Token exchange failed"
- Check client ID and secret are correct
- Verify redirect URI matches exactly
- Check app mode (development/production)

### "Missing code"
- User cancelled OAuth
- OAuth flow interrupted
- Try connecting again

## Support

For detailed setup instructions, see `ACCOUNTS_SETUP.md`.
For API documentation, see the inline comments in route files.

