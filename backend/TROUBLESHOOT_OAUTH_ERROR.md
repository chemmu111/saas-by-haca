# 🔧 Troubleshoot "URL blocked" Error - Step by Step

## ❌ Still Getting Error?

Even after adding the redirect URI, you might still see the error. Here's how to fix it:

---

## ✅ Complete Checklist

### Step 1: Verify Instagram OAuth Redirect URIs

1. **Go to:** https://developers.facebook.com/apps/2239325129806324/instagram-business/API-Setup/
2. **Click:** "Business login settings" button
3. **Check "OAuth redirect URIs" field:**
   - Must have: `http://localhost:5000/auth/instagram/callback`
   - Must have: `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback`
   - **Exact match:** No trailing slashes, exact case
4. **Click "Save"** (even if you didn't change anything)

---

### Step 2: Check App Domains

1. **Go to:** https://developers.facebook.com/apps/2239325129806324/settings/basic/
2. **Find "App domains" field**
3. **Must include:**
   - `localhost` (for local development)
   - `geneva-incapacious-romana.ngrok-free.dev` (for ngrok)
4. **Important:** 
   - NO `https://` or `http://`
   - NO paths (just domain)
   - Example: `geneva-incapacious-romana.ngrok-free.dev`
5. **Click "Save Changes"**

---

### Step 3: Enable OAuth Features

1. **Go to:** https://developers.facebook.com/apps/2239325129806324/fb-login/settings/
2. **Enable these toggles:**
   - ✅ **Client OAuth Login** → ON
   - ✅ **Web OAuth Login** → ON
3. **Click "Save Changes"**

---

### Step 4: Check Instagram Product Status

1. **Go to:** https://developers.facebook.com/apps/2239325129806324/
2. **Check left sidebar:** Products → Instagram
3. **Make sure Instagram product is:**
   - ✅ Added to your app
   - ✅ Enabled/Active

---

### Step 5: Verify App Mode

1. **Check App Mode:**
   - Should be "Development" for testing
   - If "Live", you need App Review approval

2. **For Development Mode:**
   - Make sure you're using a **Test User** account
   - Go to: Roles → Test Users
   - Add yourself as a test user
   - Use test user account for OAuth

---

### Step 6: Wait and Clear Cache

1. **Wait 3-5 minutes** after saving settings
2. **Clear browser cache:**
   - Press `Ctrl + Shift + Delete`
   - Clear cached images and files
   - Or use Incognito/Private window
3. **Try OAuth again**

---

## 🔍 Debug: Check Backend Logs

Check your backend console logs when you try OAuth. You should see:

```
Base URL detected: https://geneva-incapacious-romana.ngrok-free.dev
Redirect URI: https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback
```

**Verify:**
- The redirect URI in logs **exactly matches** what you added in Facebook
- No extra characters, no trailing slashes

---

## ⚠️ Common Issues

### Issue 1: Didn't Save Properly
- **Fix:** Go back to settings, click "Save" again
- **Verify:** Refresh page, check if URLs are still there

### Issue 2: Wrong Domain in App Domains
- **Fix:** Add `geneva-incapacious-romana.ngrok-free.dev` (no https://)
- **Check:** Should be in "App domains" field, not OAuth redirect URIs

### Issue 3: OAuth Features Not Enabled
- **Fix:** Enable "Client OAuth Login" and "Web OAuth Login"
- **Location:** Facebook Login → Settings

### Issue 4: Using Wrong Account
- **Fix:** Use a Test User account (if app is in Development mode)
- **Location:** Roles → Test Users

### Issue 5: Cache Issues
- **Fix:** Clear browser cache or use Incognito mode
- **Wait:** 3-5 minutes after saving settings

---

## 🎯 Quick Fix Steps (Try These Now)

1. **Verify URLs are saved:**
   - Go to Instagram Business Login settings
   - Confirm both URLs are there
   - Click "Save" again

2. **Check App Domains:**
   - Go to App Basic Settings
   - Add `geneva-incapacious-romana.ngrok-free.dev` (no https://)
   - Save

3. **Enable OAuth:**
   - Go to Facebook Login Settings
   - Enable "Client OAuth Login" and "Web OAuth Login"
   - Save

4. **Wait 5 minutes**

5. **Clear browser cache** or use Incognito

6. **Try OAuth again**

---

## 📋 Final Verification

Before trying OAuth, verify:

- [ ] Instagram OAuth redirect URIs: Both localhost and ngrok URLs present
- [ ] App Domains: `geneva-incapacious-romana.ngrok-free.dev` added (no https://)
- [ ] Client OAuth Login: Enabled
- [ ] Web OAuth Login: Enabled
- [ ] All changes saved
- [ ] Waited 3-5 minutes
- [ ] Cleared browser cache or using Incognito
- [ ] Using Test User account (if Development mode)

---

## 🆘 Still Not Working?

If still getting error after all steps:

1. **Check backend logs** - verify redirect URI matches exactly
2. **Try with localhost** - test if `http://localhost:5000/auth/instagram/callback` works
3. **Check ngrok status** - make sure ngrok is still running
4. **Verify App ID** - make sure it's `2239325129806324` in all places
5. **Contact Facebook Support** - if all else fails

