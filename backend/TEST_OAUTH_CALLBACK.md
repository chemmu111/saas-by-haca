# Testing OAuth Callback Route

## The Problem
Getting `{"error":"Unauthorized"}` when OAuth callback is called.

## Possible Causes

### 1. Server Not Restarted
**Solution:** Restart the backend server to load the new code without `requireAuth` on callback route.

### 2. Check Server Logs
When you click "Connect with Instagram", check your backend console for:
- `📥 OAuth callback received` - This confirms the route is being hit
- Any error messages about state parsing or userId

### 3. Verify Changes Were Applied
The callback route should now be:
```javascript
router.get('/callback/:platform', async (req, res) => {
  // NO requireAuth here!
```

## Steps to Fix

### Step 1: Restart Backend Server
```bash
# Stop the server (Ctrl+C)
# Then restart:
cd backend
npm run dev
```

### Step 2: Check Backend Logs
When testing OAuth, you should see in backend logs:
```
📥 OAuth callback received
  Platform: instagram
  Query params: {"code":"...","state":"..."}
  📦 Decoding state parameter...
  ✅ User ID extracted from state: ...
```

If you DON'T see these logs, the callback route isn't being hit (maybe wrong URL or server not running).

### Step 3: Verify State Parameter Has userId
The `/authorize` route should include userId in state:
```javascript
const state = Buffer.from(JSON.stringify({ 
  name, 
  email, 
  userId: userId.toString() 
})).toString('base64');
```

### Step 4: Test the Flow
1. Click "Connect with Instagram" in your app
2. Authorize on Facebook
3. Should redirect back to your callback
4. Check backend logs for the callback logs
5. Should redirect to `/dashboard/clients?success=client_added`

## If Still Getting "Unauthorized"

1. **Check if server was restarted** - Look at server start time
2. **Check backend logs** - See what error is actually happening
3. **Verify the callback URL** - Make sure it's `/api/oauth/callback/instagram` not something else
4. **Check if there's another middleware** intercepting the request

## Debug Steps

1. Add this test route to verify callback is accessible:
```javascript
// Add this temporarily to test
router.get('/callback/test', async (req, res) => {
  res.json({ message: 'Callback route is accessible without auth!' });
});
```

2. Visit: `https://your-ngrok-url/api/oauth/callback/test`
3. Should return JSON (not "Unauthorized")

