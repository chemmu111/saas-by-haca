# OAuth Redirect URIs - Complete List

## 📋 All Redirect URIs You Need to Add

### For Localhost Development:

#### Instagram OAuth:
```
http://localhost:5000/auth/instagram/callback
```

#### Facebook OAuth:
```
http://localhost:5000/auth/facebook/callback
```

---

### For ngrok (Your Current Setup):

#### Instagram OAuth:
```
https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback
```

#### Facebook OAuth:
```
https://geneva-incapacious-romana.ngrok-free.dev/auth/facebook/callback
```

---

### For Production (When Deployed):

Replace `yourdomain.com` with your actual domain:

#### Instagram OAuth:
```
https://yourdomain.com/auth/instagram/callback
```

#### Facebook OAuth:
```
https://yourdomain.com/auth/facebook/callback
```

---

## 🔧 Where to Add These in Facebook Developer Console

### Step 1: Instagram OAuth Redirect URIs

1. **Go to:** https://developers.facebook.com/apps/2239325129806324/instagram-basic-display/basic/
   - OR: **Products** → **Instagram** → **Business Login** → **API Setup**

2. **Find:** "OAuth redirect URIs" field

3. **Add all relevant URIs:**
   - `http://localhost:5000/auth/instagram/callback` (for local testing)
   - `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback` (for ngrok)
   - `https://yourdomain.com/auth/instagram/callback` (for production)

4. **Click "Save"**

---

### Step 2: Facebook OAuth Redirect URIs

1. **Go to:** https://developers.facebook.com/apps/2239325129806324/fb-login/settings/
   - OR: **Products** → **Facebook Login** → **Settings**

2. **Find:** "Valid OAuth Redirect URIs" field

3. **Add all relevant URIs:**
   - `http://localhost:5000/auth/facebook/callback` (for local testing)
   - `https://geneva-incapacious-romana.ngrok-free.dev/auth/facebook/callback` (for ngrok)
   - `https://yourdomain.com/auth/facebook/callback` (for production)

4. **Click "Save Changes"**

---

## ⚠️ Important Notes

### Format Requirements:
- ✅ **Include protocol:** `https://` or `http://`
- ✅ **Include full path:** `/auth/instagram/callback` or `/auth/facebook/callback`
- ✅ **Exact match:** Must match exactly (case-sensitive)
- ❌ **No trailing slash:** Don't add `/` at the end

### Examples:
- ✅ **Correct:** `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback`
- ❌ **Wrong:** `geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback` (missing https://)
- ❌ **Wrong:** `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback/` (trailing slash)
- ❌ **Wrong:** `https://geneva-incapacious-romana.ngrok-free.dev/` (missing path)

---

## 🔄 If Your ngrok URL Changes

If you restart ngrok and get a new URL:

1. **Update Facebook settings** with the new ngrok URL
2. **Wait 1-2 minutes** for changes to propagate
3. **Try OAuth again**

---

## 📝 Quick Copy-Paste List

### For Instagram (OAuth Redirect URIs):
```
http://localhost:5000/auth/instagram/callback
https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback
```

### For Facebook (Valid OAuth Redirect URIs):
```
http://localhost:5000/auth/facebook/callback
https://geneva-incapacious-romana.ngrok-free.dev/auth/facebook/callback
```

---

## ✅ Verification

After adding, verify in your backend logs:
```
Base URL detected: https://geneva-incapacious-romana.ngrok-free.dev
Redirect URI: https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback
```

Make sure the redirect URI in logs **exactly matches** what you added in Facebook settings.

