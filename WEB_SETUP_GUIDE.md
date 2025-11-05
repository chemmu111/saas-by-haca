# Complete Web Setup Guide - Facebook Developer Console

## 🎯 Step-by-Step Instructions for Facebook Developer Console

---

## PART 1: Instagram Basic Display Setup

### Step 1: Go to Facebook Developers
1. Open browser
2. Go to: https://developers.facebook.com/
3. Login with your Facebook account

### Step 2: Create or Select App
1. Click "My Apps" (top right)
2. Either:
   - **Create New App** → Click "Create App" → Choose "Consumer" → Fill app name → Create
   - **Or Select Existing App** → Click on your app name

### Step 3: Add Instagram Basic Display Product
1. In your app dashboard, look at left sidebar
2. Find "Products" section
3. Look for "Instagram Basic Display"
4. If NOT present:
   - Click "+ Add Product" (or "Add a Product" button)
   - Find "Instagram Basic Display" in the list
   - Click "Set Up" button
5. If already present: ✅ Skip to next step

### Step 4: Get Instagram App ID and Secret
1. In left sidebar, click: **"Products" → "Instagram Basic Display"**
2. Click on **"Settings"** tab
3. You'll see:
   - **Instagram App ID** (this is your INSTAGRAM_CLIENT_ID)
   - **Instagram App Secret** (click "Show" to reveal, this is your INSTAGRAM_CLIENT_SECRET)
4. **Copy these values** - you'll need them for your `.env` file

### Step 5: Configure Redirect URIs for Instagram
1. Still in **Instagram Basic Display → Settings**
2. Scroll down to **"Valid OAuth Redirect URIs"** section
3. **Remove any invalid URIs** (like `http://localhost:5001/dashboard/clients`)
4. Click **"Add URI"** or the input field
5. Add these (replace PORT with your server port - 5000 or 5001):
   ```
   http://localhost:5000/api/oauth/callback/instagram
   http://localhost:5001/api/oauth/callback/instagram
   ```
   (Add both if you're unsure which port you use)
6. Click **"Save Changes"**

### Step 6: Add Instagram Test Users
1. In left sidebar: **"Products" → "Instagram Basic Display"**
2. Click **"Roles"** tab (or "Roles" in the menu)
3. Click **"Add Instagram Testers"** button
4. Enter your Instagram username (the Instagram account you want to test with)
5. Click **"Submit"**
6. **Important:** Check your Instagram account notifications
7. Accept the tester invitation from Instagram
8. Verify your account appears in the "Instagram Testers" list

### Step 7: Verify Instagram Setup
- [ ] Instagram Basic Display product is added
- [ ] Instagram App ID is copied
- [ ] Instagram App Secret is copied
- [ ] Redirect URIs are added correctly
- [ ] Test user is added and invitation accepted

---

## PART 2: Facebook Login Setup

### Step 1: Add Facebook Login Product
1. In your app dashboard, look at left sidebar
2. Find "Products" section
3. Look for "Facebook Login"
4. If NOT present:
   - Click "+ Add Product" (or "Add a Product" button)
   - Find "Facebook Login" in the list
   - Click "Set Up" button
5. If already present: ✅ Skip to next step

### Step 2: Get Facebook App ID and Secret
1. In left sidebar, click: **"Settings" → "Basic"**
2. You'll see:
   - **App ID** (this is your FACEBOOK_CLIENT_ID)
   - **App Secret** (click "Show" to reveal, this is your FACEBOOK_CLIENT_SECRET)
3. **Copy these values** - you'll need them for your `.env` file

### Step 3: Configure Redirect URIs for Facebook
1. In left sidebar: **"Products" → "Facebook Login"**
2. Click **"Settings"** tab
3. Scroll down to **"Valid OAuth Redirect URIs"** section
4. **Remove any invalid URIs** (like `http://localhost:5001/dashboard/clients`)
5. Click **"Add URI"** or the input field
6. Add these (replace PORT with your server port - 5000 or 5001):
   ```
   http://localhost:5000/api/oauth/callback/facebook
   http://localhost:5001/api/oauth/callback/facebook
   ```
   (Add both if you're unsure which port you use)
7. Click **"Save Changes"**

### Step 4: Configure Facebook Login Settings
1. Still in **Facebook Login → Settings**
2. Check these settings:
   - ✅ **Client OAuth Login**: Enabled
   - ✅ **Web OAuth Login**: Enabled
   - ✅ **Embedded browser OAuth login**: Enabled (optional, for mobile)
   - ✅ **Use Strict Mode for redirect URIs**: Enabled (recommended)
3. Scroll to **"Allowed Domains for the JavaScript SDK"**
   - Add: `localhost` (if you want to use Facebook SDK)
4. Click **"Save Changes"**

### Step 5: Verify Facebook Setup
- [ ] Facebook Login product is added
- [ ] Facebook App ID is copied
- [ ] Facebook App Secret is copied
- [ ] Redirect URIs are added correctly
- [ ] Settings are configured

---

## PART 3: App Settings

### Step 1: Check App Mode
1. Look at top of your app dashboard
2. You should see "Development" mode (or "Live" mode)
3. For testing, **Development mode** is fine
4. Note: In Development mode, only test users can use the app

### Step 2: Add App Domains (Optional)
1. Go to **"Settings" → "Basic"**
2. Scroll to **"App Domains"**
3. Add: `localhost` (for development)
4. For production, add your actual domain

### Step 3: Add Platform (Optional)
1. Go to **"Settings" → "Basic"**
2. Scroll to **"Add Platform"**
3. Click **"Add Platform"**
4. Select **"Website"**
5. Site URL: `http://localhost:5000` (or your port)

---

## PART 4: Copy All Credentials

### What to Copy:

**From Instagram Basic Display → Settings:**
- [ ] Instagram App ID → Goes to `INSTAGRAM_CLIENT_ID` in `.env`
- [ ] Instagram App Secret → Goes to `INSTAGRAM_CLIENT_SECRET` in `.env`

**From Settings → Basic:**
- [ ] App ID → Goes to `FACEBOOK_CLIENT_ID` in `.env`
- [ ] App Secret → Goes to `FACEBOOK_CLIENT_SECRET` in `.env`

---

## PART 5: Redirect URIs Summary

### What to Add (Instagram):
```
http://localhost:5000/api/oauth/callback/instagram
http://localhost:5001/api/oauth/callback/instagram
```

### What to Add (Facebook):
```
http://localhost:5000/api/oauth/callback/facebook
http://localhost:5001/api/oauth/callback/facebook
```

### What to REMOVE:
```
http://localhost:5000/dashboard/clients  ❌
http://localhost:5001/dashboard/clients  ❌
```
(These are NOT OAuth callback URLs)

---

## ✅ Final Checklist

After completing all steps:

- [ ] Instagram Basic Display product added
- [ ] Instagram App ID copied
- [ ] Instagram App Secret copied
- [ ] Instagram redirect URIs added
- [ ] Instagram test user added and accepted
- [ ] Facebook Login product added
- [ ] Facebook App ID copied
- [ ] Facebook App Secret copied
- [ ] Facebook redirect URIs added
- [ ] All invalid URIs removed
- [ ] App is in Development mode
- [ ] All credentials saved to `.env` file

---

## 🚨 Important Notes

1. **Instagram App ID ≠ Facebook App ID**
   - Instagram: From "Instagram Basic Display → Settings"
   - Facebook: From "Settings → Basic"

2. **Redirect URIs must match exactly**
   - Include `http://` (not `https://` for localhost)
   - Include port number
   - Include full path: `/api/oauth/callback/[platform]`
   - No trailing slashes

3. **Test Users Required**
   - Instagram Basic Display requires test users
   - Must accept invitation in Instagram app

4. **Development Mode**
   - App must be in Development mode for testing
   - Only test users can use the app

5. **Save Changes**
   - Always click "Save Changes" after updating settings

---

## 📝 Quick Reference URLs

**Facebook Developers:** https://developers.facebook.com/

**Your App Dashboard:** https://developers.facebook.com/apps/

**Instagram Basic Display Settings:**
- Products → Instagram Basic Display → Settings

**Facebook Login Settings:**
- Products → Facebook Login → Settings

**App Basic Settings:**
- Settings → Basic

