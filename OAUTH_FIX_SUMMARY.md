# OAuth Implementation - Fixed

## ✅ What Was Fixed

1. **Simplified OAuth routes** - Removed complex state handling, using simple redirects
2. **Fixed redirect paths** - Now redirects to `/clients` instead of `/dashboard/clients`
3. **Correct Meta API endpoints** - Using `api.instagram.com` and `graph.facebook.com/v20.0`
4. **Proper error handling** - Better error messages and redirects

## 📋 Routes Available

### Instagram OAuth
- **Start**: `http://localhost:5000/auth/instagram`
- **Callback**: `http://localhost:5000/auth/instagram/callback`

### Facebook OAuth
- **Start**: `http://localhost:5000/auth/facebook`
- **Callback**: `http://localhost:5000/auth/facebook/callback`

## 🔧 Environment Variables Required

Add to `backend/.env`:

```env
INSTAGRAM_APP_ID=1346813250144728
INSTAGRAM_APP_SECRET=YOUR_INSTAGRAM_APP_SECRET
INSTAGRAM_REDIRECT_URI=http://localhost:5000/auth/instagram/callback

FACEBOOK_APP_ID=YOUR_FACEBOOK_APP_ID
FACEBOOK_APP_SECRET=YOUR_FACEBOOK_APP_SECRET
FACEBOOK_REDIRECT_URI=http://localhost:5000/auth/facebook/callback

FRONTEND_URL=http://localhost:5001
```

## 🎯 Meta Developer Console Setup

### Instagram Basic Display
1. Go to: Products → Instagram Basic Display → Settings
2. Add Redirect URI: `http://localhost:5000/auth/instagram/callback`
3. Get **Instagram App ID** (NOT Facebook App ID)
4. Get **Instagram App Secret**

### Facebook Login
1. Go to: Products → Facebook Login → Settings
2. Add Redirect URI: `http://localhost:5000/auth/facebook/callback`
3. Get **Facebook App ID** from Settings → Basic
4. Get **Facebook App Secret** from Settings → Basic

### Important Notes
- **Instagram App ID ≠ Facebook App ID**
- Instagram App ID comes from **Instagram Basic Display → Settings**
- Facebook App ID comes from **Settings → Basic**
- Both redirect URIs must match EXACTLY (including http:// and port)

## 🧪 Testing

1. **Test Instagram OAuth:**
   ```
   Visit: http://localhost:5000/auth/instagram
   Should redirect to Instagram login
   After login, should redirect back to: http://localhost:5001/clients?connected=instagram
   ```

2. **Test Facebook OAuth:**
   ```
   Visit: http://localhost:5000/auth/facebook
   Should redirect to Facebook login
   After login, should redirect back to: http://localhost:5001/clients?connected=facebook
   ```

## 🚨 Common Issues Fixed

### "Invalid platform app" Error
- **Cause**: Using wrong App ID (Facebook App ID instead of Instagram App ID)
- **Fix**: Use Instagram App ID from Instagram Basic Display → Settings

### Redirect URI Mismatch
- **Cause**: Redirect URI doesn't match exactly in Meta Console
- **Fix**: Ensure exact match: `http://localhost:5000/auth/instagram/callback`

### Port Mismatch
- **Cause**: Backend running on different port than .env
- **Fix**: Ensure `INSTAGRAM_REDIRECT_URI` matches actual backend port

## ✅ Checklist

- [ ] Instagram Basic Display product added to Meta app
- [ ] Instagram App ID copied from Instagram Basic Display → Settings
- [ ] Instagram App Secret copied
- [ ] Redirect URI added: `http://localhost:5000/auth/instagram/callback`
- [ ] Facebook Login product added to Meta app
- [ ] Facebook App ID copied from Settings → Basic
- [ ] Facebook App Secret copied
- [ ] Redirect URI added: `http://localhost:5000/auth/facebook/callback`
- [ ] All credentials added to `backend/.env`
- [ ] Backend server restarted
- [ ] Test Instagram OAuth flow
- [ ] Test Facebook OAuth flow

