# Fixing "Invalid platform app" Error for Instagram OAuth

## The Problem

The error "Invalid Request: Request parameters are invalid: Invalid platform app" occurs when:
1. Instagram Basic Display product is not properly configured
2. The Client ID is from the wrong app/product type
3. The redirect URI doesn't match exactly

## Solution

### Step 1: Verify Your Instagram App Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Select your app
3. Check if "Instagram Basic Display" product is added:
   - If not: Click "Add Product" → Find "Instagram Basic Display" → Set up

### Step 2: Get Correct Credentials

**For Instagram Basic Display:**
1. Go to your app → Instagram Basic Display → Settings
2. You'll see:
   - **Instagram App ID** (this is your CLIENT_ID)
   - **Instagram App Secret** (this is your CLIENT_SECRET)
3. Copy these values (NOT the Facebook App ID/Secret)

### Step 3: Add to .env

```env
INSTAGRAM_CLIENT_ID=your_instagram_app_id_from_instagram_basic_display
INSTAGRAM_CLIENT_SECRET=your_instagram_app_secret_from_instagram_basic_display
```

### Step 4: Configure Redirect URI

In Instagram Basic Display settings:
1. Scroll to "Valid OAuth Redirect URIs"
2. Add exactly:
   ```
   http://localhost:5000/api/oauth/callback/instagram
   ```
3. Save changes

### Step 5: Add Test Users (Important!)

Instagram Basic Display requires test users:
1. Go to Instagram Basic Display → Roles → Roles
2. Click "Add Instagram Testers"
3. Add your Instagram account as a tester
4. The Instagram account must accept the invitation

### Common Issues

**Issue 1: Using Facebook App ID instead of Instagram App ID**
- ❌ Wrong: Using Facebook App ID from "Settings → Basic"
- ✅ Correct: Using Instagram App ID from "Instagram Basic Display → Settings"

**Issue 2: App not in development mode**
- Your app must be in development mode
- Test users must be added and approved

**Issue 3: Redirect URI mismatch**
- Must match EXACTLY (including http vs https, port number)
- Check for trailing slashes or extra characters

**Issue 4: Instagram account not connected to Facebook**
- The Instagram account must be a Business or Creator account
- Must be connected to a Facebook Page

## Alternative: Use Facebook Login for Instagram

If Instagram Basic Display is too complex, you can use Facebook Login which also gives access to Instagram:

1. Use Facebook App ID and Secret (same as Facebook login)
2. Request `instagram_basic` scope in addition to Facebook scopes
3. This requires a Facebook Page connected to Instagram Business account

## Testing

After fixing:
1. Restart your backend server
2. Clear browser cache
3. Try connecting again
4. Make sure you're logged in as a test user

## Quick Checklist

- [ ] Instagram Basic Display product added to app
- [ ] Instagram App ID (not Facebook App ID) in .env
- [ ] Instagram App Secret (not Facebook App Secret) in .env
- [ ] Redirect URI added: `http://localhost:5000/api/oauth/callback/instagram`
- [ ] Test user added and approved
- [ ] Instagram account is Business/Creator type
- [ ] Instagram account connected to Facebook Page
- [ ] Backend server restarted after .env changes

