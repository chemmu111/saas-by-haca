# 🔧 Fix "This app isn't available" - Facebook Permissions Error

## 🚨 The Error

**"This app isn't available. This app needs at least one supported permission."**

This error occurs because your Facebook app is requesting **advanced permissions** that require **Facebook App Review**, but your app is still in **Development Mode**.

## ✅ Solution: Two Options

### Option 1: Development Mode (Quick Fix - Recommended for Testing)

Use minimal scopes that don't require App Review. This allows you to test OAuth flow immediately.

**Steps:**

1. **Update `.env` file:**
   ```env
   FACEBOOK_DEV_MODE=true
   ```

2. **Restart your backend server**

3. **Try OAuth again** - Should work now!

**What you can do with minimal scopes:**
- ✅ Connect Instagram/Facebook accounts
- ✅ View basic account info
- ✅ List Facebook Pages
- ❌ **Cannot publish posts** (requires full permissions)
- ❌ **Cannot access insights** (requires full permissions)

---

### Option 2: Submit for Facebook App Review (Production)

If you need full publishing features, you must submit your app for Facebook App Review.

**Required Permissions to Submit:**

1. **Go to Facebook App Dashboard:**
   - https://developers.facebook.com/apps/2239325129806324/app-review/permissions/

2. **Submit these permissions for review:**
   - ✅ `instagram_basic` - Basic Instagram account info
   - ✅ `instagram_content_publish` - Publish to Instagram
   - ✅ `pages_show_list` - List Facebook Pages
   - ✅ `pages_read_engagement` - Read page metrics
   - ✅ `pages_manage_posts` - Manage posts on Pages
   - ✅ `instagram_manage_insights` - Access Instagram insights
   - ✅ `instagram_manage_comments` - Manage comments
   - ✅ `business_management` - Manage business assets

3. **After approval:**
   - Update `.env`:
     ```env
     FACEBOOK_DEV_MODE=false
     NODE_ENV=production
     ```
   - Restart backend
   - Full features will be available

---

## 🔄 How It Works Now

The code automatically detects which mode to use:

- **Development Mode** (`FACEBOOK_DEV_MODE=true` or `NODE_ENV=development`):
  - Uses minimal scopes: `public_profile`, `email`, `pages_show_list`, `instagram_basic`
  - No App Review needed
  - Limited functionality

- **Production Mode** (`FACEBOOK_DEV_MODE=false` and `NODE_ENV=production`):
  - Uses full scopes: All Instagram publishing permissions
  - Requires App Review
  - Full functionality

---

## 📋 Quick Checklist

### For Development/Testing:
- [ ] Add `FACEBOOK_DEV_MODE=true` to `.env`
- [ ] Restart backend server
- [ ] Try OAuth - should work!

### For Production:
- [ ] Submit permissions for Facebook App Review
- [ ] Wait for approval (usually 1-7 days)
- [ ] Set `FACEBOOK_DEV_MODE=false` in `.env`
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Restart backend server
- [ ] Full features available

---

## 🆘 Still Having Issues?

1. **Check your Facebook App Mode:**
   - Go to: https://developers.facebook.com/apps/2239325129806324/settings/basic/
   - Make sure app is in "Development" mode (for testing)

2. **Add Test Users:**
   - Go to: Roles → Test Users
   - Add yourself as a test user
   - Use test user account for OAuth

3. **Verify OAuth Settings:**
   - Check redirect URIs are correct
   - Check App Domains are set
   - See `QUICK_FIX_FACEBOOK_OAUTH.md` for details

4. **Check Backend Logs:**
   - Look for "Using DEVELOPMENT MODE scopes" or "Using PRODUCTION MODE scopes"
   - Verify which scopes are being requested

---

## 📝 Notes

- **Development Mode** is perfect for testing OAuth flow and basic features
- **App Review** is required for production use with full publishing capabilities
- You can switch between modes by changing `FACEBOOK_DEV_MODE` in `.env`
- App Review typically takes 1-7 business days

