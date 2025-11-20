# Fix Instagram Access Token & Media URLs

## Problem Summary

1. **Instagram Access Token Expired** - Posts failing with "Session has expired" error
2. **Old Media URLs** - Images showing 404 errors because ngrok URLs changed

## Solution

### Step 1: Update API_URL in .env

Edit `backend/.env` and set:

```env
API_URL=https://geneva-incapacious-romana.ngrok-free.dev
```

**Important:** Every time ngrok restarts and gets a new URL, you must:
1. Update `API_URL` in `.env`
2. Restart the backend server
3. Run the update script to fix media URLs in database

### Step 2: Run the Update Script

The script will:
- ✅ Update Instagram access tokens for all clients
- ✅ Update media URLs in posts to use current ngrok URL

```bash
cd backend
npm run update:token
```

### Step 3: Restart Backend

After updating, restart your backend server:

```bash
npm run dev
```

## Manual Update (Alternative)

If you prefer to update manually:

### Update Access Token via MongoDB

```javascript
// In MongoDB shell or Compass
db.clients.updateMany(
  { platform: "instagram", igUserId: { $exists: true } },
  { $set: { pageAccessToken: "YOUR_NEW_TOKEN_HERE" } }
)
```

### Update Media URLs

```javascript
// Update all posts with old ngrok URLs
db.posts.updateMany(
  { mediaUrls: { $regex: "kody-electrochemical-semisentimentally.ngrok-free.dev" } },
  { $set: { 
    "mediaUrls.$[elem]": { 
      $replaceOne: { 
        input: "$mediaUrls", 
        find: "kody-electrochemical-semisentimentally.ngrok-free.dev",
        replacement: "geneva-incapacious-romana.ngrok-free.dev"
      }
    }
  } }
)
```

## Verification

1. Check Instagram posts work - try creating a new post
2. Check images load - refresh dashboard and verify no 404 errors
3. Check console - no more "Stream Refused" errors

## Future Prevention

### For Production:
- Deploy backend to permanent hosting (Render, Railway, AWS)
- Use cloud storage (S3, Cloudinary) for media files
- Set up token refresh automation

### For Development:
- Use ngrok paid plan for stable URLs
- Or set up a script to auto-update URLs when ngrok restarts

