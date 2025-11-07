# Configure Localhost OAuth for Instagram Business API

## Step 1: Update Facebook App Settings

### A. Add localhost to App Domains

1. Go to: https://developers.facebook.com/apps/2239325129806324/settings/basic/
2. Find **"App domains"** field
3. Add:
   ```
   localhost
   ```
   (You can have both `localhost` and your ngrok domain if needed)
4. Click **"Save Changes"**

### B. Add Localhost Redirect URI

1. Go to: **Products** → **Instagram** → **Business Login** → **API Setup**
2. In **"OAuth redirect URIs"** field, add:
   ```
   http://localhost:5001/api/oauth/callback/instagram
   ```
   (Make sure to include `http://` not `https://` for localhost)
3. Click **"Save"**

### Optional: Add Both Localhost and Ngrok

You can add BOTH redirect URIs for flexibility:
- `http://localhost:5001/api/oauth/callback/instagram` (for local testing)
- `https://kody-electrochemical-semisentimentally.ngrok-free.dev/api/oauth/callback/instagram` (for external testing)

## Step 2: Verify .env Configuration

Your `.env` file should have:
```env
API_URL=http://localhost:5001
```

## Step 3: Restart Backend Server

After updating `.env`:
```bash
# Stop server (Ctrl+C)
# Restart:
npm run dev
```

## Step 4: Test OAuth Flow

1. Make sure your backend is running on port 5001
2. Open your app in browser
3. Click "Connect with Instagram"
4. Should redirect to Facebook OAuth

## Important Notes

- **For localhost**: Use `http://` (not `https://`)
- **Port must match**: Make sure the port in redirect URI (5001) matches where your server is running
- **App Domains**: Just add `localhost` (no port number)
- **OAuth Redirect URIs**: Full URL with port: `http://localhost:5001/api/oauth/callback/instagram`

## Troubleshooting

If you get "Can't load URL" error:
- Check that `localhost` is in App Domains
- Check that the full redirect URI is in OAuth Redirect URIs
- Verify port 5001 matches your server port
- Wait 1-2 minutes after saving changes
- Clear browser cache

