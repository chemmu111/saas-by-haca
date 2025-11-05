# OAuth Setup for Instagram and Facebook

## Overview

The Add Client feature now supports Instagram and Facebook OAuth authentication. Clients can be added by connecting their social media accounts instead of manually entering links.

## Environment Variables Required

Add these to your `backend/.env` file:

```env
# API Base URL (for OAuth redirects)
API_URL=http://localhost:5000

# Instagram OAuth Credentials
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret

# Facebook OAuth Credentials
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
```

## Setting Up Instagram OAuth

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use existing app
3. Add Instagram Basic Display product
4. Configure OAuth Redirect URIs:
   - `http://localhost:5000/api/oauth/callback/instagram` (development)
   - `https://yourdomain.com/api/oauth/callback/instagram` (production)
5. Get your Client ID and Client Secret

## Setting Up Facebook OAuth

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use existing app
3. Add Facebook Login product
4. Configure OAuth Redirect URIs:
   - `http://localhost:5000/api/oauth/callback/facebook` (development)
   - `https://yourdomain.com/api/oauth/callback/facebook` (production)
5. Get your App ID and App Secret

## Features

✅ **Platform Selection**
   - Choose between Manual Entry, Instagram, or Facebook

✅ **OAuth Flow**
   - Click "Connect with Instagram" or "Connect with Facebook"
   - Redirects to social media platform for authorization
   - Returns to app with access token

✅ **Client Data Storage**
   - Client name and email
   - Platform type (instagram/facebook/manual)
   - Access token (encrypted in database)
   - Social media ID and link

✅ **Visual Indicators**
   - Shows platform badges on client cards
   - Instagram: Purple/Pink gradient badge
   - Facebook: Blue badge

## How It Works

1. **User clicks "Add Client"**
   - Form opens with name, email, and platform selection

2. **User selects platform (Instagram/Facebook)**
   - OAuth button appears
   - User enters name and email first

3. **User clicks "Connect with [Platform]"**
   - Frontend calls `/api/oauth/authorize`
   - Backend generates OAuth URL with client data in state
   - User redirected to Instagram/Facebook

4. **User authorizes on platform**
   - Platform redirects to `/api/oauth/callback/[platform]`
   - Backend exchanges code for access token
   - Fetches user info from platform
   - Creates client record with OAuth data

5. **Redirect back to clients page**
   - Client appears in list immediately
   - Dashboard count updates automatically

## API Routes

### POST /api/oauth/authorize
Initiates OAuth flow. Returns authorization URL.

**Request:**
```json
{
  "platform": "instagram" | "facebook",
  "name": "Client Name",
  "email": "client@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "authUrl": "https://api.instagram.com/oauth/authorize?..."
}
```

### GET /api/oauth/callback/:platform
OAuth callback handler. Processes authorization code and creates client.

**Query Params:**
- `code`: Authorization code from platform
- `state`: Base64 encoded client data

**Redirects:**
- Success: `/dashboard/clients?success=client_added&platform=instagram`
- Error: `/dashboard/clients?error=oauth_failed`

## Client Model Updates

The Client model now includes:
- `platform`: 'instagram' | 'facebook' | 'manual'
- `accessToken`: OAuth access token
- `refreshToken`: OAuth refresh token (if available)
- `socialMediaId`: Platform user ID
- `socialMediaLink`: Optional (can be derived from OAuth)

## Security Notes

- Access tokens are stored securely in database
- Tokens are never sent to frontend
- All OAuth routes require authentication
- Client data is encoded in OAuth state parameter

## Testing

1. Set up Instagram/Facebook apps in developers portal
2. Add credentials to `.env` file
3. Start backend server
4. Go to Clients page
5. Click "Add Client"
6. Select platform and enter client details
7. Click OAuth button
8. Complete OAuth flow
9. Client should appear in list

## Troubleshooting

**OAuth redirect fails:**
- Check redirect URI matches in app settings
- Verify API_URL in .env is correct
- Check CORS settings

**Token exchange fails:**
- Verify client ID and secret are correct
- Check app permissions in developers portal
- Ensure app is in development mode or approved

**Client not created:**
- Check backend logs for errors
- Verify database connection
- Check authentication token is valid

