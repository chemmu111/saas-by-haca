# 🔧 Fix OAuth Settings - Current Issues

## ❌ Issues Found in Your Facebook Settings

Based on your current Facebook Developer Console settings:

### 1. **Old ngrok URL Present**
- You have: `https://kody-electrochemical-semisentimentally.ngrok-free.dev/api/oauth/ca...`
- **Problem:** This is an old ngrok URL that no longer works
- **Action:** Remove this URL

### 2. **Missing Localhost URL**
- **Problem:** No localhost URL for local development
- **Action:** Add `http://localhost:5000/auth/instagram/callback`

### 3. **Incorrect Deauthorize/Data Deletion URLs**
- Current: Using old ngrok domain
- **Action:** Update to current ngrok domain

---

## ✅ Correct OAuth Redirect URIs

### For Instagram OAuth Redirect URIs:

**Remove:**
- ❌ `https://kody-electrochemical-semisentimentally.ngrok-free.dev/api/oauth/ca...` (old, delete this)

**Keep:**
- ✅ `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback` (current, keep this)

**Add:**
- ✅ `http://localhost:5000/auth/instagram/callback` (for local development)

**Final List Should Be:**
```
http://localhost:5000/auth/instagram/callback
https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback
```

---

## 🔧 Step-by-Step Fix

### Step 1: Update OAuth Redirect URIs

1. **In the "OAuth redirect URIs" section:**
   - **Delete:** `https://kody-electrochemical-semisentimentally.ngrok-free.dev/api/oauth/ca...`
   - **Keep:** `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback`
   - **Add:** `http://localhost:5000/auth/instagram/callback`

2. **Click "Save"**

---

### Step 2: Update Deauthorize Callback URL

**Current:** `https://kody-electrochemical-semisentimentally.ngrok-free.dev/api/oauth/callback/insta`

**Should be:** `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback`

**Or for localhost:** `http://localhost:5000/auth/instagram/callback`

---

### Step 3: Update Data Deletion Request URL

**Current:** `https://kody-electrochemical-semisentimentally.ngrok-free.dev/api/oauth/callback/insta`

**Should be:** `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback`

**Or for localhost:** `http://localhost:5000/auth/instagram/callback`

**Note:** Data deletion callback typically uses the same endpoint as OAuth callback.

---

## 📋 Complete Settings Summary

### OAuth redirect URIs:
```
http://localhost:5000/auth/instagram/callback
https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback
```

### Deauthorize callback URL:
```
https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback
```

### Data deletion request URL:
```
https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback
```

---

## ⚠️ Important Notes

1. **Remove old ngrok URLs** - They won't work and can cause confusion
2. **Add localhost** - Essential for local development
3. **Use current ngrok URL** - Only `geneva-incapacious-romana.ngrok-free.dev`
4. **Exact paths matter** - Must be `/auth/instagram/callback` (not `/api/oauth/...`)

---

## ✅ After Making Changes

1. **Click "Save"** in the modal
2. **Wait 1-2 minutes** for Facebook to update
3. **Try OAuth again** - should work now!

---

## 🔄 If ngrok URL Changes Again

If you restart ngrok and get a new URL:
1. Remove old ngrok URLs
2. Add new ngrok URL
3. Update all three fields (OAuth, Deauthorize, Data Deletion)
4. Save and wait 1-2 minutes

