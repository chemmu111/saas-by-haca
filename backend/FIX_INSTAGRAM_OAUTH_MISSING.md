# 🔧 Fix: Instagram OAuth Still Blocked

## ❌ The Problem

You've configured **Facebook Login** settings, but the error is coming from **Instagram OAuth**. These are **two separate settings pages**!

The error shows:
- `redirect_uri=https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback`

But you only configured:
- Facebook Login: `https://geneva-incapacious-romana.ngrok-free.dev/auth/facebook/callback`

---

## ✅ Solution: Configure Instagram Settings

You need to configure **Instagram Business Login** settings separately.

### Step 1: Go to Instagram Business Login Settings

**Direct Link:**
```
https://developers.facebook.com/apps/2239325129806324/instagram-business/API-Setup/
```

**OR navigate:**
1. Go to: https://developers.facebook.com/apps/2239325129806324/
2. Click: **Products** → **Instagram** → **Business Login** → **API Setup**
3. Click: **"Business login settings"** button

---

### Step 2: Add Instagram OAuth Redirect URIs

In the "Business login settings" modal:

**OAuth redirect URIs section:**
Add these TWO URLs:
```
http://localhost:5000/auth/instagram/callback
https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback
```

**Important:** 
- These are for **Instagram** (`/auth/instagram/callback`)
- Different from Facebook (`/auth/facebook/callback`)

---

### Step 3: Update Deauthorize & Data Deletion URLs

**Deauthorize callback URL:**
```
https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback
```

**Data deletion request URL:**
```
https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback
```

---

### Step 4: Save and Wait

1. Click **"Save"** in the modal
2. **Wait 2-3 minutes** for Facebook to update
3. Try OAuth again

---

## 📋 Complete Checklist

### ✅ Facebook Login (Already Done):
- [x] Valid OAuth Redirect URIs: `https://geneva-incapacious-romana.ngrok-free.dev/auth/facebook/callback`
- [x] Deauthorize callback URL: `https://geneva-incapacious-romana.ngrok-free.dev/auth/facebook/callback`

### ❌ Instagram Business Login (Need to Do):
- [ ] OAuth redirect URIs: 
  - [ ] `http://localhost:5000/auth/instagram/callback`
  - [ ] `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback`
- [ ] Deauthorize callback URL: `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback`
- [ ] Data deletion request URL: `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback`

---

## 🔍 Key Differences

| Setting | Facebook Login | Instagram Business Login |
|---------|---------------|-------------------------|
| **Path** | `/auth/facebook/callback` | `/auth/instagram/callback` |
| **Settings Page** | Products → Facebook Login → Settings | Products → Instagram → Business Login → API Setup → Business login settings |
| **Status** | ✅ Configured | ❌ Missing |

---

## 🎯 Quick Action

1. **Click this link:** https://developers.facebook.com/apps/2239325129806324/instagram-business/API-Setup/
2. **Click "Business login settings" button**
3. **Add the Instagram redirect URIs** (see Step 2 above)
4. **Save**
5. **Wait 2-3 minutes**
6. **Try OAuth again**

---

## ⚠️ Common Mistake

Many people configure Facebook Login but forget Instagram Business Login. They are **separate products** with **separate settings**!

---

## ✅ After Configuration

Once you've added Instagram OAuth redirect URIs:
- The "URL blocked" error should be resolved
- Instagram OAuth will work
- You can connect Instagram accounts

