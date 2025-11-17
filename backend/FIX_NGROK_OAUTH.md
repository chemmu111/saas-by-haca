# Fix Facebook OAuth with ngrok

## The Problem
When accessing your app via ngrok, Facebook OAuth shows:
**"URL blocked. This redirect failed because the redirect URI is not white-listed in the app's client OAuth settings."**

## The Solution

You need to add your ngrok URL to Facebook Developer Console in **two places**:

### Step 1: Add ngrok Domain to App Domains

1. Go to: https://developers.facebook.com/apps/2239325129806324/settings/basic/
2. Find **"App domains"** field
3. Add your ngrok domain (without `https://`):
   ```
   geneva-incapacious-romana.ngrok-free.dev
   ```
4. Click **"Save Changes"**

### Step 2: Add ngrok Redirect URI to OAuth Settings

#### For Instagram OAuth:
1. Go to: **Products** → **Instagram** → **Business Login** → **API Setup**
2. In **"OAuth redirect URIs"** field, add:
   ```
   https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback
   ```
3. Click **"Save"**

#### For Facebook OAuth:
1. Go to: **Products** → **Facebook Login** → **Settings**
2. In **"Valid OAuth Redirect URIs"** field, add:
   ```
   https://geneva-incapacious-romana.ngrok-free.dev/auth/facebook/callback
   ```
3. Click **"Save Changes"**

### Step 3: Enable OAuth Features

Make sure these are enabled:
- **Facebook Login**: Products → Facebook Login → Settings → Enable "Client OAuth Login" and "Web OAuth Login"
- **Instagram**: Products → Instagram → Business Login → API Setup → Make sure it's enabled

## Important Notes

- **App Domains**: Just the domain name (no `https://`, no path)
  - ✅ `geneva-incapacious-romana.ngrok-free.dev`
  - ❌ `https://geneva-incapacious-romana.ngrok-free.dev`
  - ❌ `geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback`

- **OAuth Redirect URIs**: Full URL with protocol and path
  - ✅ `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback`
  - ❌ `geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback`

- **Wait Time**: After saving, wait 1-2 minutes for changes to propagate

- **Multiple URLs**: You can add BOTH localhost and ngrok URLs:
  - `http://localhost:5001/auth/instagram/callback` (for local testing)
  - `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback` (for ngrok)

## Backend Changes Made

The backend code has been updated to:
1. ✅ Detect ngrok requests automatically
2. ✅ Use the correct ngrok URL for redirect URIs
3. ✅ Trust proxy headers from ngrok

**No code changes needed** - just update Facebook Developer Console settings!

## Testing

After updating Facebook settings:
1. Restart your backend server (if running)
2. Try connecting Instagram/Facebook via ngrok URL
3. Should redirect to Facebook OAuth without errors

