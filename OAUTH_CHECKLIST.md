# OAuth Setup Checklist - Complete Guide

## ✅ Step 1: Check Your Server Port

**Check:** What port is your backend server running on?

1. Look at your terminal when you run `npm run dev` in the backend folder
2. It should show: `🚀 API listening on http://localhost:XXXX`
3. Note the port number (usually 5000 or 5001)

**Action:** Write down your port: _______________

---

## ✅ Step 2: Check Your .env File

**Location:** `backend/.env`

**Check these variables exist:**

```env
API_URL=http://localhost:5000  (or 5001 - must match your server port!)

INSTAGRAM_CLIENT_ID=your_instagram_app_id
INSTAGRAM_CLIENT_SECRET=your_instagram_app_secret

FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
```

**Actions:**
- [ ] API_URL matches your server port
- [ ] INSTAGRAM_CLIENT_ID is set (not empty)
- [ ] INSTAGRAM_CLIENT_SECRET is set (not empty)
- [ ] FACEBOOK_CLIENT_ID is set (not empty)
- [ ] FACEBOOK_CLIENT_SECRET is set (not empty)

---

## ✅ Step 3: Check Instagram App Configuration

**Go to:** [Facebook Developers](https://developers.facebook.com/) → Your App

**Checks:**

### 3.1 Product Added
- [ ] Go to "Products" (left sidebar)
- [ ] Look for "Instagram Basic Display"
- [ ] If missing: Click "Add Product" → Find "Instagram Basic Display" → Set up

### 3.2 Get Instagram App ID
- [ ] Go to: **Products → Instagram Basic Display → Settings**
- [ ] Copy the **Instagram App ID** (NOT the Facebook App ID!)
- [ ] Copy the **Instagram App Secret**
- [ ] Verify these are in your `.env` file

### 3.3 Redirect URIs
- [ ] Go to: **Instagram Basic Display → Settings**
- [ ] Scroll to "Valid OAuth Redirect URIs"
- [ ] Add these (replace PORT with your actual port):
  ```
  http://localhost:PORT/api/oauth/callback/instagram
  ```
- [ ] Example for port 5001:
  ```
  http://localhost:5001/api/oauth/callback/instagram
  ```
- [ ] Remove: `http://localhost:PORT/dashboard/clients` (if present)
- [ ] Save changes

### 3.4 Test Users
- [ ] Go to: **Instagram Basic Display → Roles → Roles**
- [ ] Click "Add Instagram Testers"
- [ ] Add your Instagram account
- [ ] Accept the invitation from your Instagram account
- [ ] Verify your account appears in testers list

### 3.5 App Mode
- [ ] Check app is in "Development" mode (top left of app dashboard)
- [ ] Development mode allows test users

---

## ✅ Step 4: Check Facebook App Configuration

**Go to:** [Facebook Developers](https://developers.facebook.com/) → Your App

**Checks:**

### 4.1 Product Added
- [ ] Go to "Products" (left sidebar)
- [ ] Look for "Facebook Login"
- [ ] If missing: Click "Add Product" → Find "Facebook Login" → Set up

### 4.2 Get Facebook App ID
- [ ] Go to: **Settings → Basic**
- [ ] Copy the **App ID** (this is FACEBOOK_CLIENT_ID)
- [ ] Click "Show" next to App Secret
- [ ] Copy the **App Secret** (this is FACEBOOK_CLIENT_SECRET)
- [ ] Verify these are in your `.env` file

### 4.3 Redirect URIs
- [ ] Go to: **Facebook Login → Settings**
- [ ] Scroll to "Valid OAuth Redirect URIs"
- [ ] Add these (replace PORT with your actual port):
  ```
  http://localhost:PORT/api/oauth/callback/facebook
  ```
- [ ] Example for port 5001:
  ```
  http://localhost:5001/api/oauth/callback/facebook
  ```
- [ ] Remove: `http://localhost:PORT/dashboard/clients` (if present)
- [ ] Save changes

### 4.4 App Mode
- [ ] Check app is in "Development" mode
- [ ] Add yourself as a test user if needed

---

## ✅ Step 5: Verify Credentials Match

**Check:** Are you using the RIGHT credentials?

### Instagram:
- ❌ **WRONG:** Facebook App ID from "Settings → Basic"
- ✅ **CORRECT:** Instagram App ID from "Instagram Basic Display → Settings"

### Facebook:
- ✅ **CORRECT:** Facebook App ID from "Settings → Basic"
- ✅ **CORRECT:** Facebook App Secret from "Settings → Basic"

**Action:**
- [ ] Instagram CLIENT_ID = Instagram App ID (not Facebook App ID)
- [ ] Facebook CLIENT_ID = Facebook App ID

---

## ✅ Step 6: Restart Backend Server

**After making ANY changes to .env:**

1. Stop your backend server (Ctrl+C)
2. Restart it:
   ```bash
   cd backend
   npm run dev
   ```
3. Verify it starts without errors
4. Note the port it's running on

**Actions:**
- [ ] Stopped old server
- [ ] Started new server
- [ ] No errors in console
- [ ] Port matches API_URL in .env

---

## ✅ Step 7: Test the OAuth Flow

**Test Steps:**

1. [ ] Open browser and go to your dashboard
2. [ ] Login as a social media manager
3. [ ] Go to Clients page
4. [ ] Click "Add Client"
5. [ ] Enter:
   - Client Name: "Test Client"
   - Email: "test@example.com"
   - Platform: Select "Instagram" or "Facebook"
6. [ ] Click "Connect with [Platform]"
7. [ ] Should redirect to Instagram/Facebook login
8. [ ] Login and authorize
9. [ ] Should redirect back to dashboard
10. [ ] Client should appear in list

**If errors occur:**
- [ ] Check browser console for errors
- [ ] Check backend server logs for errors
- [ ] Verify redirect URI matches exactly
- [ ] Verify credentials are correct

---

## ✅ Quick Verification Checklist

Before testing, verify:

- [ ] Server is running on the port in API_URL
- [ ] API_URL in .env matches server port
- [ ] Instagram App ID is from "Instagram Basic Display" (not Facebook App)
- [ ] Redirect URIs match exactly (including port)
- [ ] No trailing slashes in redirect URIs
- [ ] Test users added for Instagram Basic Display
- [ ] Backend server restarted after .env changes
- [ ] No typos in CLIENT_ID or CLIENT_SECRET

---

## 🚨 Common Issues

### Issue: "Invalid platform app"
- ✅ Check: Instagram App ID is from Instagram Basic Display (not Facebook App ID)
- ✅ Check: Instagram Basic Display product is added
- ✅ Check: Redirect URI matches exactly

### Issue: "Redirect URI mismatch"
- ✅ Check: Redirect URI in app settings matches exactly
- ✅ Check: Port number matches
- ✅ Check: No trailing slashes

### Issue: "Button disabled"
- ✅ Check: Client name is filled
- ✅ Check: Email is filled and valid format
- ✅ Check: Platform is selected

### Issue: "OAuth cancelled"
- ✅ Check: User clicked "Cancel" on Instagram/Facebook
- ✅ Check: Test user accepted invitation

---

## 📝 Summary

**Your Redirect URIs should be:**
```
http://localhost:YOUR_PORT/api/oauth/callback/instagram
http://localhost:YOUR_PORT/api/oauth/callback/facebook
```

**NOT:**
```
http://localhost:YOUR_PORT/dashboard/clients  ❌
```

Replace `YOUR_PORT` with your actual server port (5000 or 5001).

