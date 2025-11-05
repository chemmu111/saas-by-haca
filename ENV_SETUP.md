# Environment Variables Setup

## Backend .env File Configuration

Add these to your `backend/.env` file:

```env
# Server Configuration
PORT=5000
API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5001

# Database
MONGODB_URI=your_mongodb_connection_string

# JWT Secret
JWT_SECRET=your-secret-key-change-this-in-production

# Instagram OAuth Configuration
INSTAGRAM_APP_ID=1346813250144728
INSTAGRAM_APP_SECRET=YOUR_INSTAGRAM_APP_SECRET
INSTAGRAM_REDIRECT_URI=http://localhost:5000/auth/instagram/callback

# Facebook OAuth Configuration
FACEBOOK_APP_ID=YOUR_FACEBOOK_APP_ID
FACEBOOK_APP_SECRET=YOUR_FACEBOOK_APP_SECRET
FACEBOOK_REDIRECT_URI=http://localhost:5000/auth/facebook/callback
```

## Important Notes

1. **INSTAGRAM_APP_ID**: Your Instagram App ID from Instagram Basic Display → Settings (NOT Facebook App ID)
2. **INSTAGRAM_APP_SECRET**: Your Instagram App Secret from Instagram Basic Display → Settings
3. **FACEBOOK_APP_ID**: Your Facebook App ID from Settings → Basic
4. **FACEBOOK_APP_SECRET**: Your Facebook App Secret from Settings → Basic

## Redirect URIs in Meta Developer Console

### Instagram Basic Display → Settings
Add this redirect URI:
```
http://localhost:5000/auth/instagram/callback
```

### Facebook Login → Settings
Add this redirect URI:
```
http://localhost:5000/auth/facebook/callback
```

## Routes Available

- **Instagram OAuth Start**: `http://localhost:5000/auth/instagram?name=Client&email=client@example.com`
- **Instagram OAuth Callback**: `http://localhost:5000/auth/instagram/callback`
- **Facebook OAuth Start**: `http://localhost:5000/auth/facebook?name=Client&email=client@example.com`
- **Facebook OAuth Callback**: `http://localhost:5000/auth/facebook/callback`

