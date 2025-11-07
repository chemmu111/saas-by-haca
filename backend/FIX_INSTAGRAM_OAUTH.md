# Fix "Invalid platform app" Error - Step by Step

## The Problem
When you click "Connect with Instagram", you get: **"Invalid Request: Request parameters are invalid: Invalid platform app"**

This means Instagram doesn't recognize your app configuration.

## Root Cause
The Client ID `773305335749780` is likely a **Facebook App ID**, but you need an **Instagram App ID** from Instagram Basic Display.

## Step-by-Step Fix

### Step 1: Get the Correct Instagram App ID

1. Go to https://developers.facebook.com/
2. Select your app
3. In the left sidebar, look for **"Products"**
4. Find **"Instagram"** → **"Basic Display"**
   - If you don't see it, click **"Add Product"** and add "Instagram Basic Display"
5. Click on **"Instagram Basic Display"**
6. Go to **"Settings"** tab
7. You'll see:
   - **Instagram App ID** ← Copy THIS (NOT the Facebook App ID)
   - **Instagram App Secret** ← Copy THIS (NOT the Facebook App Secret)

### Step 2: Update Your .env File

Open `backend/.env` and update:

```env
INSTAGRAM_CLIENT_ID=your_instagram_app_id_from_step_1
INSTAGRAM_CLIENT_SECRET=your_instagram_app_secret_from_step_1
```

**Important:** The Instagram App ID is DIFFERENT from the Facebook App ID!

### Step 3: Configure Redirect URI

1. Still in **Instagram Basic Display** → **Settings**
2. Scroll down to **"Valid OAuth Redirect URIs"**
3. Add this EXACT URI (check your backend logs to see what URI is being used):
   ```
   http://localhost:5000/api/oauth/callback/instagram
   ```
   OR if you're using a different port/URL, use whatever shows in your backend logs
4. Click **"Save Changes"**

### Step 4: Check Your Backend Logs

When you click "Connect with Instagram", check your backend console. You should see:

```
Instagram Basic Display OAuth Configuration:
  Client ID: [your_client_id]
  Redirect URI: [your_redirect_uri]
  ⚠️  Make sure this redirect URI is configured in Instagram Basic Display settings: [your_redirect_uri]
```

**Copy the exact redirect URI from the logs** and make sure it's added in Instagram Basic Display settings.

### Step 5: Add Test Users (If App is in Development)

1. Go to **Instagram Basic Display** → **Roles** → **Roles**
2. Click **"Add Instagram Testers"**
3. Add your Instagram username
4. **Accept the invitation** from your Instagram app

### Step 6: Restart Backend Server

After updating `.env`:
1. Stop your backend server (Ctrl+C)
2. Restart it: `npm run dev`
3. Try connecting again

## Quick Checklist

- [ ] Instagram Basic Display product is added to your app
- [ ] You're using Instagram App ID (not Facebook App ID) in .env
- [ ] You're using Instagram App Secret (not Facebook App Secret) in .env
- [ ] Redirect URI is added in Instagram Basic Display settings
- [ ] Redirect URI matches EXACTLY what's in backend logs (including http/https, port)
- [ ] Test users added (if app is in development mode)
- [ ] Backend server restarted after .env changes

## How to Verify

1. Check backend logs - the Client ID and Redirect URI will be printed
2. The Client ID should be different from your Facebook App ID
3. The Redirect URI must match exactly in Instagram Basic Display settings

## Still Not Working?

Check these common issues:

1. **Wrong Client ID**: Make sure you're using Instagram App ID from "Instagram Basic Display → Settings", NOT from "Settings → Basic"

2. **Redirect URI Mismatch**: 
   - Check backend logs for the exact URI
   - Make sure it matches EXACTLY in Instagram Basic Display settings
   - Check for trailing slashes, http vs https, port number

3. **App Not Set Up**: Make sure Instagram Basic Display product is added and configured

4. **Test Users**: If in development mode, make sure test users are added and approved

