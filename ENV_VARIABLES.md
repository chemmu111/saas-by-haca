# Environment Variables Configuration

Add these variables to your `backend/.env` file:

## Required Variables

```env
# Server Configuration
PORT=5000
API_URL=http://localhost:5000

# Database
MONGODB_URI=your_mongodb_connection_string

# JWT Secret
JWT_SECRET=your-secret-key-change-this-in-production

# Instagram OAuth Configuration
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret

# Facebook OAuth Configuration
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
```

## How to Add to .env File

1. Open `backend/.env` file in your editor
2. Add the following lines at the end of the file:

```env
# API URL for OAuth redirects
API_URL=http://localhost:5000

# Instagram OAuth
INSTAGRAM_CLIENT_ID=your_instagram_client_id_here
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret_here

# Facebook OAuth
FACEBOOK_CLIENT_ID=your_facebook_app_id_here
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret_here
```

## Getting OAuth Credentials

### Instagram OAuth Setup
1. Go to https://developers.facebook.com/
2. Create a new app or select existing app
3. Add "Instagram Basic Display" product
4. Configure OAuth Redirect URIs:
   - Development: `http://localhost:5000/api/oauth/callback/instagram`
   - Production: `https://yourdomain.com/api/oauth/callback/instagram`
5. Copy Client ID and Client Secret

### Facebook OAuth Setup
1. Go to https://developers.facebook.com/
2. Create a new app or select existing app
3. Add "Facebook Login" product
4. Configure OAuth Redirect URIs:
   - Development: `http://localhost:5000/api/oauth/callback/facebook`
   - Production: `https://yourdomain.com/api/oauth/callback/facebook`
5. Copy App ID and App Secret

## Production Configuration

For production, update:
```env
API_URL=https://yourdomain.com
```

Replace `yourdomain.com` with your actual domain.

## Notes

- Keep your `.env` file secure and never commit it to git
- Use strong, unique values for JWT_SECRET
- OAuth credentials are sensitive - keep them secure
- The API_URL must match your server's public URL for OAuth to work

