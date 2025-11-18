# 🔗 Direct Links to OAuth Settings

## 📍 Quick Access Links

### 1. Instagram Business Login Settings (OAuth Redirect URIs)
**Click this link to configure Instagram OAuth:**
```
https://developers.facebook.com/apps/2239325129806324/instagram-business/API-Setup/
```

Then click the **"Business login settings"** button on that page.

**OR direct link to settings modal:**
- Go to: Products → Instagram → Business Login → API Setup
- Click "Business login settings" button

---

### 2. Facebook Login Settings (OAuth Redirect URIs)
**Direct link:**
```
https://developers.facebook.com/apps/2239325129806324/fb-login/settings/
```

---

### 3. App Basic Settings (App Domains)
**Direct link:**
```
https://developers.facebook.com/apps/2239325129806324/settings/basic/
```

---

### 4. App Review (For Permissions)
**Direct link:**
```
https://developers.facebook.com/apps/2239325129806324/app-review/permissions/
```

---

## 🎯 What You Need to Do Right Now

### Step 1: Click "Business login settings" Button

On the page you're currently viewing:
1. **Find the "Business login settings" button** (it's on the same page you're looking at)
2. **Click it** - This opens the modal where you configure OAuth redirect URIs

### Step 2: Update the Settings

In the "Business login settings" modal:

**OAuth redirect URIs:**
- Remove: `https://kody-electrochemical-semisentimentally.ngrok-free.dev/api/oauth/ca...`
- Keep: `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback`
- Add: `http://localhost:5000/auth/instagram/callback`

**Deauthorize callback URL:**
- Update to: `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback`

**Data deletion request URL:**
- Update to: `https://geneva-incapacious-romana.ngrok-free.dev/auth/instagram/callback`

### Step 3: Save

Click "Save" button in the modal.

---

## 📋 Complete Checklist

- [ ] Click "Business login settings" button on current page
- [ ] Remove old ngrok URL (`kody-electrochemical-semisentimentally`)
- [ ] Add localhost URL (`http://localhost:5000/auth/instagram/callback`)
- [ ] Keep current ngrok URL (`geneva-incapacious-romana.ngrok-free.dev`)
- [ ] Update Deauthorize callback URL
- [ ] Update Data deletion request URL
- [ ] Click "Save"
- [ ] Wait 1-2 minutes
- [ ] Try OAuth again

---

## 🔍 Note About the Embed URL

The "Embed URL" field showing `redirect_uri=https://ge` is truncated in the display - this is normal. The actual redirect URI used will be the one you configure in "Business login settings".

---

## ✅ After Configuration

Once you've updated the settings:
1. The OAuth flow will use the correct redirect URIs
2. The "URL blocked" error should be resolved
3. You can test the OAuth connection

