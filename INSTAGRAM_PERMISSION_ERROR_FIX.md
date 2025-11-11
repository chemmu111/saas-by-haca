# Fix Instagram API Permission Error (#10)

## Error Message
```
Instagram API Permission Error: Application does not have permission for this action.
Error Code: #10
```

## What This Error Means

This error occurs when your Facebook App doesn't have the required permissions to publish to Instagram, or the app is in Development Mode without proper test user configuration.

## Common Causes

1. **App is in Development Mode** - Only app admins, developers, and test users can use the app
2. **Permissions not approved** - `pages_manage_posts` and `instagram_content_publish` need Facebook review
3. **User not added as test user** - In Development Mode, users must be added as test users
4. **Page Access Token missing permissions** - Token doesn't have the required scopes

## Step-by-Step Fix

### Step 1: Check App Mode
1. Go to [Facebook App Dashboard](https://developers.facebook.com/apps/)
2. Select your app
3. Check the app mode (Development or Live) in the top navigation

### Step 2: Add Test Users (Development Mode)
If your app is in Development Mode:
1. Go to **Roles → Test Users**
2. Click **Add Test Users**
3. Add the Facebook account that owns the Instagram Business Account
4. Or add yourself as a test user if you're the app admin

### Step 3: Request Permission Review
1. Go to **App Review → Permissions and Features**
2. Find these permissions:
   - `pages_manage_posts`
   - `instagram_content_publish`
3. Click **Request** for each permission
4. Fill out the required information:
   - **Use Case**: Explain why you need these permissions
   - **Video**: Record a video showing how your app uses the permissions
   - **Screenshots**: Provide screenshots of your app
5. Submit for review

### Step 4: Switch to Live Mode (After Approval)
1. Once permissions are approved, go to **App Review → Permissions and Features**
2. Switch the app from **Development** to **Live** mode
3. This allows all users to use the app (not just test users)

### Step 5: Re-authenticate Instagram Account
1. After permissions are approved and app is Live:
2. Go to your dashboard → Clients
3. Disconnect the Instagram account
4. Reconnect the Instagram account (this will request the new permissions)

## Required Permissions

Your app needs these permissions:
- `pages_manage_posts` - Required to publish content to Instagram via Page
- `instagram_content_publish` - Required to publish to Instagram
- `pages_show_list` - Required to list user's Facebook Pages
- `pages_read_engagement` - Required to read page engagement metrics
- `instagram_basic` - Required for basic Instagram account info
- `business_management` - Required for managing business assets

## Verify Permissions

### Check if permissions are working:
1. Go to your dashboard → Posts
2. Try to create and publish a test post
3. If you still get the error, check the error message for specific guidance

### Use Diagnostic Endpoint:
```bash
GET /api/posts/clients/:clientId/permissions
```

This endpoint will check if your Page Access Token has the required permissions.

## Quick Checklist

- [ ] App is in Development Mode or Live Mode
- [ ] Test users added (if Development Mode)
- [ ] `pages_manage_posts` permission requested and approved
- [ ] `instagram_content_publish` permission requested and approved
- [ ] App switched to Live Mode (after approval)
- [ ] Instagram account re-authenticated after permissions approved
- [ ] Facebook Page connected to Instagram Business Account

## Still Having Issues?

1. **Check App Status**: Make sure your app is not restricted or suspended
2. **Check Token Expiry**: Page Access Tokens can expire - re-authenticate if needed
3. **Verify Page Connection**: Ensure Facebook Page is properly connected to Instagram Business Account
4. **Check Instagram Account Type**: Must be Instagram Business Account (not personal account)
5. **Review Facebook App Settings**: Ensure all required products are added (Instagram Graph API)

## Additional Resources

- [Facebook App Review Guide](https://developers.facebook.com/docs/app-review)
- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-api)
- [Facebook App Dashboard](https://developers.facebook.com/apps/)
- [Permission Reference](https://developers.facebook.com/docs/permissions/reference)

## Contact Support

If you continue to experience issues after following these steps:
1. Check the error message in the dashboard for specific guidance
2. Review Facebook App Dashboard for any additional requirements
3. Check Facebook Developer Community for similar issues

