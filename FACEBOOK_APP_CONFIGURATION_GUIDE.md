# Facebook App Configuration Guide

## Fixing "Facebook Login is currently unavailable for this app" Error

This error occurs when your Facebook App is not properly configured or is in Development mode. Follow these steps to fix it:

### Step 1: Access Facebook Developer Console

1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Log in with your Facebook account
3. Select your app (App ID: Check your `.env` file for `FACEBOOK_CLIENT_ID`)

### Step 2: Complete Basic App Settings

1. Go to **Settings > Basic**
2. Fill in all required fields:
   - **App Display Name**: Your app name
   - **App Domain**: Your domain (e.g., `yourdomain.com`)
   - **Privacy Policy URL**: Required for production
   - **Terms of Service URL**: Required for production
   - **User Data Deletion URL**: Required for production
   - **Category**: Select appropriate category
   - **Contact Email**: Your contact email

### Step 3: Configure OAuth Redirect URIs

1. Go to **Settings > Basic**
2. Scroll down to **Add Platform**
3. Add **Website** platform if not already added
4. In **Valid OAuth Redirect URIs**, add:
   ```
   https://yourdomain.com/api/oauth/callback/instagram
   https://yourdomain.com/api/oauth/callback/facebook
   http://localhost:5001/api/oauth/callback/instagram (for development)
   http://localhost:5001/api/oauth/callback/facebook (for development)
   ```
   Replace `yourdomain.com` with your actual domain and `5001` with your backend port.

### Step 4: Configure Instagram Basic Display (for Instagram)

1. Go to **Products** in the left sidebar
2. Find **Instagram Basic Display** and click **Set Up**
3. Complete the setup wizard
4. Add **Valid OAuth Redirect URIs** (same as above)

### Step 5: Request Required Permissions

1. Go to **App Review > Permissions and Features**
2. Request the following permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
   - `instagram_manage_insights`
   - `instagram_manage_comments`
   - `business_management`

### Step 6: Switch to Live Mode

1. Go to **App Review > App Review**
2. Click **Switch Mode** button
3. Select **Live** mode
4. Complete any required verifications

### Step 7: Add Test Users (for Development)

If your app is in Development mode:
1. Go to **Roles > Test Users**
2. Add test users who can test the OAuth flow
3. Make sure your Facebook account is added as a developer/admin

### Step 8: Verify Environment Variables

Make sure your `.env` file has the correct values:

```env
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
API_URL=https://yourdomain.com
```

### Common Issues and Solutions

#### Issue: "App is updating additional details"
**Solution**: Complete all required fields in Settings > Basic, especially Privacy Policy URL and Terms of Service URL.

#### Issue: "Invalid Redirect URI"
**Solution**: Make sure the redirect URI in your code matches exactly what's configured in Facebook App Settings. Check for:
- Protocol (http vs https)
- Port number
- Trailing slashes
- Case sensitivity

#### Issue: "App not in Live mode"
**Solution**: Switch your app to Live mode in App Review. For development, you can use Development mode but you need to add test users.

#### Issue: "Permissions not approved"
**Solution**: Some permissions require App Review. For development, you can use them with test users. For production, you need to submit your app for review.

### Testing the OAuth Flow

1. Make sure your backend server is running
2. Make sure your `.env` file is configured correctly
3. Try connecting an Instagram/Facebook account
4. Check the browser console and server logs for errors
5. Verify the redirect URI is accessible (not blocked by firewall)

### Additional Resources

- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/)
- [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api/)
- [Facebook App Review](https://developers.facebook.com/docs/app-review/)

### Need Help?

If you're still experiencing issues:
1. Check the server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Make sure your redirect URIs are accessible
4. Check Facebook App Dashboard for any pending requirements
5. Review Facebook's error codes and messages

