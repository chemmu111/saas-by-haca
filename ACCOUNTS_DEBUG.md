# Accounts Backend Debugging Guide

## 🔍 Quick Check

### 1. Check if backend is running
```bash
curl http://localhost:5000/health
```
Should return: `{"ok":true}`

### 2. Check configuration
```bash
cd backend
node check-accounts-setup.js
```

### 3. Check if routes are registered
```bash
# Test OAuth connect endpoint (requires auth token)
curl -X GET http://localhost:5000/oauth/connect/meta \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Check browser console
- Open `/dashboard/accounts` page
- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for failed requests

## 🐛 Common Issues

### Issue 1: "OAuth not configured"
**Problem:** Missing environment variables

**Solution:**
1. Check `backend/.env` file exists
2. Add required variables:
   ```env
   META_APP_ID=your_app_id
   META_APP_SECRET=your_app_secret
   OAUTH_REDIRECT_BASE=http://localhost:5000
   TOKEN_ENCRYPTION_KEY=your_32_byte_key
   ```
3. Restart backend server

### Issue 2: "401 Unauthorized"
**Problem:** Authentication token missing or invalid

**Solution:**
1. Make sure you're logged in
2. Check `localStorage.getItem('auth_token')` in browser console
3. If token is missing, login again
4. If token is invalid, clear localStorage and login again

### Issue 3: "Failed to generate OAuth URL"
**Problem:** Backend error in OAuth configuration

**Solution:**
1. Check backend console for error messages
2. Verify environment variables are set correctly
3. Check if provider credentials are valid
4. Make sure `OAUTH_REDIRECT_BASE` matches your server URL

### Issue 4: "Invalid state parameter"
**Problem:** OAuth state expired or already used

**Solution:**
1. Try connecting again
2. State tokens expire after 10 minutes
3. Each state token can only be used once

### Issue 5: Routes not found (404)
**Problem:** Routes not registered in Express

**Solution:**
1. Check `backend/src/index.js` has:
   ```javascript
   app.use('/oauth', accountsOAuthRouter);
   app.use('/api/accounts', accountsRouter);
   ```
2. Restart backend server
3. Verify routes are imported at the top

## 📝 Testing Steps

### Step 1: Verify Backend
```bash
cd backend
npm run dev
```

Check output:
```
🚀 API listening on http://localhost:5000
```

### Step 2: Test Authentication
1. Login to get token
2. In browser console:
   ```javascript
   localStorage.getItem('auth_token')
   ```
3. Should return a JWT token

### Step 3: Test OAuth Connect
1. Go to `/dashboard/accounts`
2. Click "Connect Facebook / Instagram"
3. Check browser console for errors
4. Check backend console for errors

### Step 4: Check Database
```bash
# Connect to MongoDB
mongosh "your_mongodb_uri"

# Check if social_accounts collection exists
use your_database_name
show collections

# Check accounts
db.social_accounts.find()
```

## 🔧 Manual Testing

### Test OAuth Connect Endpoint
```bash
# First, login to get token
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  | jq -r '.token')

# Test connect endpoint
curl -X GET "http://localhost:5000/oauth/connect/meta" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "redirectUrl": "https://www.facebook.com/v18.0/dialog/oauth?..."
}
```

### Test Accounts List Endpoint
```bash
curl -X GET "http://localhost:5000/api/accounts/list" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "accounts": []
}
```

## 📋 Environment Variables Checklist

Required:
- [ ] `MONGODB_URI`
- [ ] `JWT_SECRET`
- [ ] `OAUTH_REDIRECT_BASE`
- [ ] `TOKEN_ENCRYPTION_KEY`

At least one provider:
- [ ] `META_APP_ID` + `META_APP_SECRET`
- [ ] `LINKEDIN_CLIENT_ID` + `LINKEDIN_CLIENT_SECRET`
- [ ] `X_CLIENT_ID` + `X_CLIENT_SECRET`

## 🚨 Still Not Working?

1. **Check backend logs:**
   - Look for error messages in console
   - Check for missing imports
   - Verify all files exist

2. **Check browser console:**
   - Network tab for failed requests
   - Console tab for JavaScript errors
   - Application tab for localStorage

3. **Verify file structure:**
   ```
   backend/src/
   ├── routes/
   │   ├── accountsOAuth.js ✅
   │   └── accounts.js ✅
   ├── controllers/
   │   └── socialAccountsController.js ✅
   ├── utils/
   │   ├── crypto.js ✅
   │   └── oauthProviders.js ✅
   └── models/
       └── SocialAccount.js ✅
   ```

4. **Restart everything:**
   ```bash
   # Stop backend (Ctrl+C)
   # Restart backend
   cd backend
   npm run dev
   
   # Clear browser cache
   # Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
   ```

