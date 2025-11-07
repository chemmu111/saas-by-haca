# Fixing "Invalid platform app" Error

## The Problem
The error "Invalid Request: Request parameters are invalid: Invalid platform app" occurs when:
1. You're using a **Facebook App ID** instead of an **Instagram App ID**
2. The redirect URI doesn't match what's configured in Instagram Basic Display settings
3. Instagram Basic Display product is not properly set up

## Solution

### Step 1: Get the Correct Instagram App ID

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Select your app
3. Go to **Products** → **Instagram** → **Basic Display**
4. If you don't see "Instagram Basic Display":
   - Click **"Add Product"** or **"Set Up"**
   - Find **"Instagram Basic Display"** and click **"Set Up"**
5. Go to **Instagram Basic Display** → **Settings**
6. You'll see:
   - **Instagram App ID** ← This is what you need (NOT the Facebook App ID)
   - **Instagram App Secret** ← This is what you need (NOT the Facebook App Secret)

### Step 2: Update Your .env File

Replace the Client ID in your `backend/.env` file:

```env
INSTAGRAM_CLIENT_ID=your_instagram_app_id_from_step_1
INSTAGRAM_CLIENT_SECRET=your_instagram_app_secret_from_step_1
```

**Important:** The Instagram App ID is DIFFERENT from the Facebook App ID!

### Step 3: Configure Redirect URI

1. In **Instagram Basic Display** → **Settings**
2. Scroll down to **"Valid OAuth Redirect URIs"**
3. Add your redirect URI exactly as shown:
   - For local development: `http://localhost:5000/api/oauth/callback/instagram`
   - For production: `https://yourdomain.com/api/oauth/callback/instagram`
4. **Important:** The URI must match EXACTLY (including http/https, port number, and path)
5. Click **"Save Changes"**

### Step 4: Add Test Users (If App is in Development Mode)

If your app is in development mode:
1. Go to **Instagram Basic Display** → **Roles** → **Roles**
2. Click **"Add Instagram Testers"**
3. Add your Instagram account username
4. The Instagram account must **accept the invitation** (check Instagram app notifications)

### Step 5: Verify Your Configuration

Check your backend logs when you click "Connect with Instagram". You should see:
```
Instagram Basic Display OAuth Configuration:
  Client ID: [your_instagram_app_id]
  Redirect URI: [your_redirect_uri]
  ⚠️  Make sure this redirect URI is configured in Instagram Basic Display settings: [your_redirect_uri]
```

Make sure the redirect URI in the logs matches what you configured in Step 3.

## Common Mistakes

❌ **Wrong:** Using Facebook App ID from "Settings → Basic"  
✅ **Correct:** Using Instagram App ID from "Instagram Basic Display → Settings"

❌ **Wrong:** Redirect URI: `http://localhost:5000/oauth/callback/instagram`  
✅ **Correct:** Redirect URI: `http://localhost:5000/api/oauth/callback/instagram` (must match exactly)

❌ **Wrong:** Using Facebook App Secret  
✅ **Correct:** Using Instagram App Secret from "Instagram Basic Display → Settings"

## Still Having Issues?

1. **Check your backend logs** - Look for the redirect URI being used
2. **Verify in Facebook Console** - Make sure the redirect URI is added in Instagram Basic Display settings
3. **Restart your backend server** after updating .env file
4. **Clear browser cache** and try again

