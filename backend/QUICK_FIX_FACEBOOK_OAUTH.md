# 🚨 QUICK FIX: Facebook OAuth Error with ngrok

## The Error
**"URL blocked. This redirect failed because the redirect URI is not white-listed in the app's client OAuth settings."**

## ✅ Your Backend is Working!
The logs show your backend is correctly detecting ngrok:
```
Base URL detected: https://geneva-incapacious-romana.ngrok-free.dev
Redirect URI: https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback
```

## 🔧 What You Need to Do (5 minutes)

### Step 1: Add Domain to App Domains

1. **Go to Facebook App Settings:**
   - Direct link: https://developers.facebook.com/apps/2239325129806324/settings/basic/

2. **Find "App domains" field** (scroll down)

3. **Add your ngrok domain:**
   ```
   geneva-incapacious-romana.ngrok-free.dev
   ```
   ⚠️ **Important:** 
   - NO `https://`
   - NO path (no `/auth/instagram/callback`)
   - Just the domain: `geneva-incapacious-romana.ngrok-free.dev`

4. **Click "Save Changes"** at the bottom

### Step 2: Add Redirect URI for Instagram

1. **Go to Instagram Settings:**
   - Direct link: https://developers.facebook.com/apps/2239325129806324/instagram-basic-display/basic/
   - OR: Products → Instagram → Business Login → API Setup

2. **Find "OAuth redirect URIs" field**

3. **Add the full redirect URI:**
   ```
   https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback
   ```
   ⚠️ **Important:**
   - Include `https://`
   - Include the full path: `/auth/instagram/callback`
   - Exact match: `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback`

4. **Click "Save"**

### Step 3: Enable OAuth Features

1. **Go to Facebook Login Settings:**
   - Direct link: https://developers.facebook.com/apps/2239325129806324/fb-login/settings/

2. **Enable these:**
   - ✅ **Client OAuth Login** → Toggle ON
   - ✅ **Web OAuth Login** → Toggle ON

3. **Click "Save Changes"**

### Step 4: Wait and Test

1. **Wait 1-2 minutes** for Facebook to update settings
2. **Refresh your app page**
3. **Try connecting Instagram again**

## 📋 Checklist

- [ ] Added `geneva-incapacious-romana.ngrok-free.dev` to App Domains
- [ ] Added `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback` to OAuth Redirect URIs
- [ ] Enabled "Client OAuth Login" in Facebook Login settings
- [ ] Enabled "Web OAuth Login" in Facebook Login settings
- [ ] Waited 1-2 minutes after saving
- [ ] Tried connecting again

## 🔍 Verify Your Settings

After adding, you should see:
- **App Domains:** `geneva-incapacious-romana.ngrok-free.dev` (and possibly `localhost`)
- **OAuth Redirect URIs:** `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback`

## ⚠️ Common Mistakes

❌ **Wrong:** `https://geneva-incapacious-romana.ngrok-free.dev` in App Domains
✅ **Correct:** `geneva-incapacious-romana.ngrok-free.dev` (no https://)

❌ **Wrong:** `geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback` in App Domains
✅ **Correct:** Just the domain in App Domains, full URL in OAuth Redirect URIs

❌ **Wrong:** `http://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback` (http instead of https)
✅ **Correct:** `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback`

## 🆘 Still Not Working?

1. **Check the exact redirect URI in your backend logs:**
   - Look for: `Redirect URI: https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback`
   - Make sure it matches EXACTLY in Facebook settings

2. **Clear browser cache** and try again

3. **Check if ngrok URL changed:**
   - If you restarted ngrok, the URL might have changed
   - Update Facebook settings with the new URL

4. **Verify Facebook App is in correct mode:**
   - Development mode: Only works for test users
   - Live mode: Works for everyone (requires app review)

## 📞 Need Help?

If still not working after following all steps:
1. Check backend logs for the exact redirect URI being used
2. Verify it matches exactly in Facebook Developer Console
3. Make sure you saved changes in Facebook (wait 1-2 minutes)

