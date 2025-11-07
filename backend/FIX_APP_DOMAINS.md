# Fix "Can't load URL" - Add Domain to App Domains

## The Problem
Facebook OAuth is showing this error:
**"The domain of this URL isn't included in the app's domains. To be able to load this URL, add all domains and sub-domains of your app to the App Domains field in your app settings."**

## The Solution

You need to add your ngrok domain to the **App Domains** field in your Facebook App's Basic settings.

## Step-by-Step Instructions

### Step 1: Go to App Basic Settings
1. Go to https://developers.facebook.com/
2. Select your app: **hacatechApp** (App ID: 2239325129806324)
3. In the left sidebar, click **"App settings"** → **"Basic"**

### Step 2: Find "App Domains" Field
1. Scroll down to find the **"App domains"** field
2. This field is different from "Valid OAuth Redirect URIs"

### Step 3: Add Your ngrok Domain
1. In the **"App domains"** field, add:
   ```
   kody-electrochemical-semisentimentally.ngrok-free.dev
   ```
   **Important:** 
   - Add only the domain (without `https://`)
   - Add only the domain (without `/api/oauth/callback/instagram`)
   - Just the domain name: `kody-electrochemical-semisentimentally.ngrok-free.dev`

2. Click **"Save Changes"** at the bottom of the page

### Step 4: Verify Redirect URI is Also Added
Make sure you've also added the full redirect URI in Instagram Business API settings:
- Go to: **Products** → **Instagram** → **Business Login** → **API Setup**
- Add this in "OAuth redirect URIs":
  ```
  https://kody-electrochemical-semisentimentally.ngrok-free.dev/api/oauth/callback/instagram
  ```

## Important Notes

### Two Different Settings:
1. **App Domains** (Basic settings):
   - Domain only: `kody-electrochemical-semisentimentally.ngrok-free.dev`
   - No `https://`, no path

2. **OAuth Redirect URIs** (Instagram Business API settings):
   - Full URL: `https://kody-electrochemical-semisentimentally.ngrok-free.dev/api/oauth/callback/instagram`
   - Includes `https://` and full path

### If Your ngrok URL Changes:
If your ngrok URL changes (ngrok URLs can change), you'll need to:
1. Update `API_URL` in your `.env` file
2. Update **App Domains** in Facebook App Basic settings
3. Update **OAuth Redirect URIs** in Instagram Business API settings

## After Making Changes:

1. **Wait a few minutes** - Facebook settings can take 1-2 minutes to propagate
2. **Clear your browser cache** - Or use incognito/private mode
3. **Try the OAuth flow again** - Click "Connect with Instagram" in your app

## Quick Checklist:

- [ ] Added domain to **App Domains** field: `kody-electrochemical-semisentimentally.ngrok-free.dev`
- [ ] Added full URL to **OAuth Redirect URIs**: `https://kody-electrochemical-semisentimentally.ngrok-free.dev/api/oauth/callback/instagram`
- [ ] Clicked "Save Changes" for both settings
- [ ] Waited 1-2 minutes for changes to propagate
- [ ] Cleared browser cache or used incognito mode
- [ ] Restarted backend server (if needed)
- [ ] Tested OAuth flow again

