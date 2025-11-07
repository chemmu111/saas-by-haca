# Fix "Can't load URL" Error - Add Domain to App Domains

## The Error
Facebook is showing: **"The domain of this URL isn't included in the app's domains"**

This means you need to add your ngrok domain to the **App Domains** field in Facebook App settings.

## Step-by-Step Solution

### Step 1: Go to Facebook App Basic Settings
1. Open: https://developers.facebook.com/
2. Click on your app: **hacatechApp** (or search for App ID: 2239325129806324)
3. In the left sidebar, click: **"App settings"** → **"Basic"**

### Step 2: Find "App Domains" Field
1. Scroll down on the Basic settings page
2. Look for the field labeled **"App domains"**
3. This field is usually near the top, below "App ID" and "App Secret"

### Step 3: Add Your ngrok Domain
1. In the **"App domains"** field, type:
   ```
   kody-electrochemical-semisentimentally.ngrok-free.dev
   ```
   
   **IMPORTANT:**
   - ✅ Add ONLY the domain (no `https://`)
   - ✅ Add ONLY the domain (no `/api/oauth/callback/instagram`)
   - ✅ Just: `kody-electrochemical-semisentimentally.ngrok-free.dev`
   - ❌ DON'T add: `https://kody-electrochemical-semisentimentally.ngrok-free.dev`
   - ❌ DON'T add: `kody-electrochemical-semisentimentally.ngrok-free.dev/api/oauth/callback/instagram`

2. Click **"Save Changes"** button at the bottom of the page

### Step 4: Verify OAuth Redirect URI is Also Added
Make sure you've also added the FULL redirect URI in Instagram Business API settings:

1. Go to: **Products** → **Instagram** → **Business Login** → **API Setup**
2. In **"OAuth redirect URIs"** field, add:
   ```
   https://kody-electrochemical-semisentimentally.ngrok-free.dev/api/oauth/callback/instagram
   ```
   (This one needs the full URL with `https://` and path)
3. Click **"Save"**

## Summary - Two Different Settings:

| Setting | Location | What to Add |
|---------|----------|-------------|
| **App Domains** | App settings → Basic | `kody-electrochemical-semisentimentally.ngrok-free.dev` (domain only) |
| **OAuth Redirect URIs** | Products → Instagram → Business Login → API Setup | `https://kody-electrochemical-semisentimentally.ngrok-free.dev/api/oauth/callback/instagram` (full URL) |

## After Adding:

1. **Wait 1-2 minutes** for Facebook to update
2. **Clear browser cache** or use **Incognito/Private mode**
3. **Try again** - Click "Connect with Instagram"

## Still Not Working?

If you still see the error after adding the domain:
- Make sure you clicked "Save Changes"
- Wait a few more minutes
- Try in a different browser or incognito mode
- Check that the domain is exactly: `kody-electrochemical-semisentimentally.ngrok-free.dev` (no typos)

