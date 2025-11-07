# Instagram Graph API OAuth Setup via Facebook OAuth

## ✅ Configuration Complete

This setup uses **Facebook OAuth endpoint** (not instagram.com) to authenticate Instagram Graph API access.

---

## A) EXACT Authorization URL

**With your App ID (773305335749780):**

```
https://www.facebook.com/v18.0/dialog/oauth?client_id=773305335749780&redirect_uri=http://localhost:5000/auth/instagram/callback&scope=pages_show_list,instagram_basic,instagram_content_publish,pages_read_engagement&response_type=code
```

**With placeholders:**

```
https://www.facebook.com/v18.0/dialog/oauth?client_id=APP_ID&redirect_uri=http://localhost:5000/auth/instagram/callback&scope=pages_show_list,instagram_basic,instagram_content_publish,pages_read_engagement&response_type=code
```

---

## B) .env Template

Add these to your `backend/.env` file:

```env
FB_APP_ID=773305335749780
FB_APP_SECRET=11308019339efbb507bb8e2c974acd7e
OAUTH_REDIRECT_URI=http://localhost:5000/auth/instagram/callback
```

---

## C) Express Routes Created

### 1. GET `/auth/instagram/login`
- **Purpose**: Redirects user to Facebook OAuth for Instagram Graph API
- **Usage**: Visit `http://localhost:5000/auth/instagram/login` in browser
- **Response**: 302 redirect to Facebook OAuth URL

### 2. GET `/auth/instagram/callback`
- **Purpose**: Exchanges authorization code for access token
- **Query Parameters**: 
  - `code` - Authorization code from Facebook
  - `error` - Error code (if authorization failed)
- **Response**: JSON with access token and next steps

**Example Response:**
```json
{
  "success": true,
  "access_token": "EAABwzLix...",
  "expires_in": 3600,
  "token_type": "bearer",
  "next_steps": {
    "shortLivedToken": {
      "token": "...",
      "expiresIn": 3600,
      "note": "This is a short-lived token (typically 1 hour). You need to exchange it for a long-lived token."
    },
    "exchangeForLongLived": {
      "endpoint": "https://graph.facebook.com/v18.0/oauth/access_token",
      "method": "GET",
      "params": {
        "grant_type": "fb_exchange_token",
        "client_id": "773305335749780",
        "client_secret": "***",
        "fb_exchange_token": "..."
      },
      "note": "Exchange short-lived token for long-lived token (60 days)"
    },
    "connectInstagramAccount": {
      "step1": "Get user's Facebook Pages: GET /me/accounts",
      "step2": "Get Instagram Business Account ID from Page: GET /{page-id}?fields=instagram_business_account",
      "step3": "Use Instagram Business Account ID for Instagram API calls",
      "note": "The Instagram account must be connected to a Facebook Page"
    }
  }
}
```

---

## D) CURL Command for Token Exchange

**Manual token exchange (replace CODE with actual authorization code):**

```bash
curl -X GET 'https://graph.facebook.com/v18.0/oauth/access_token?client_id=773305335749780&client_secret=11308019339efbb507bb8e2c974acd7e&redirect_uri=http://localhost:5000/auth/instagram/callback&code=CODE'
```

**With placeholders:**

```bash
curl -X GET 'https://graph.facebook.com/v18.0/oauth/access_token?client_id=APP_ID&client_secret=APP_SECRET&redirect_uri=http://localhost:5000/auth/instagram/callback&code=CODE'
```

**Expected Response:**
```json
{
  "access_token": "EAABwzLix...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

---

## Next Steps After Getting Access Token

### 1. Exchange Short-Lived Token for Long-Lived Token

Short-lived tokens expire in ~1 hour. Exchange for a 60-day token:

```bash
curl -X GET 'https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=773305335749780&client_secret=11308019339efbb507bb8e2c974acd7e&fb_exchange_token=SHORT_LIVED_TOKEN'
```

### 2. Get User's Facebook Pages

```bash
curl -X GET 'https://graph.facebook.com/v18.0/me/accounts?access_token=ACCESS_TOKEN'
```

### 3. Get Instagram Business Account ID from Page

```bash
curl -X GET 'https://graph.facebook.com/v18.0/{page-id}?fields=instagram_business_account&access_token=ACCESS_TOKEN'
```

### 4. Use Instagram Business Account ID for API Calls

```bash
curl -X GET 'https://graph.facebook.com/v18.0/{instagram-business-account-id}?fields=id,username&access_token=ACCESS_TOKEN'
```

---

## ✅ CHECKLIST

- [ ] **App type = Business**
  - Go to Meta Developers → Settings → Advanced
  - Verify App Type is set to "Business"

- [ ] **Add Redirect URI to Valid OAuth Redirect URIs**
  - Go to: Products → Facebook Login → Settings
  - Scroll to "Valid OAuth Redirect URIs"
  - Add: `http://localhost:5000/auth/instagram/callback`
  - Click "Save Changes"

- [ ] **Add Instagram Tester and accept invite in Instagram**
  - Go to: Products → Instagram Basic Display → Roles
  - Click "Add Instagram Testers"
  - Add your Instagram account username
  - Accept invitation in Instagram app

- [ ] **Use Business/Creator IG connected to a Facebook Page**
  - Your Instagram account must be a Business or Creator account
  - It must be connected to a Facebook Page
  - Check: Instagram App → Settings → Account → Linked Accounts → Facebook

- [ ] **Use Facebook OAuth URL (not instagram.com)**
  - ✅ Using: `https://www.facebook.com/v18.0/dialog/oauth`
  - ❌ NOT using: `https://api.instagram.com/oauth/authorize`

- [ ] **Set Environment Variables**
  - Add `FB_APP_ID`, `FB_APP_SECRET`, `OAUTH_REDIRECT_URI` to `backend/.env`
  - Restart backend server

- [ ] **Test the Flow**
  1. Visit: `http://localhost:5000/auth/instagram/login`
  2. Authorize the app on Facebook
  3. Check callback response for access token
  4. Exchange for long-lived token
  5. Connect Instagram Business Account

---

## Testing

1. **Start backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Visit login endpoint:**
   ```
   http://localhost:5000/auth/instagram/login
   ```

3. **Authorize on Facebook:**
   - You'll be redirected to Facebook login
   - Grant permissions
   - You'll be redirected back with a code

4. **Check callback:**
   - The callback will exchange the code for an access token
   - Check the JSON response for the token and next steps

---

## Troubleshooting

### "Invalid platform app" Error
- ✅ Verify app type is "Business" (not Consumer)
- ✅ Check redirect URI matches exactly in Meta Console
- ✅ Ensure using Facebook OAuth URL (not Instagram Basic Display)

### "Redirect URI mismatch" Error
- ✅ Verify redirect URI in `.env` matches Meta Console exactly
- ✅ No trailing slashes
- ✅ Exact protocol (http vs https)

### "Invalid OAuth access token" Error
- ✅ Token might be expired (short-lived tokens last ~1 hour)
- ✅ Exchange for long-lived token
- ✅ Verify token hasn't been revoked

---

## Files Created/Modified

- ✅ `backend/src/routes/instagramGraphAuth.js` - New Instagram Graph API OAuth routes
- ✅ `backend/src/index.js` - Added route: `/auth/instagram`
- ✅ `backend/.env` - Add `FB_APP_ID`, `FB_APP_SECRET`, `OAUTH_REDIRECT_URI`

---

## Scopes Explained

- **`pages_show_list`**: Access to list of Facebook Pages
- **`instagram_basic`**: Basic Instagram account info
- **`instagram_content_publish`**: Publish content to Instagram
- **`pages_read_engagement`**: Read engagement metrics from Pages

---

**Ready to test!** 🚀


