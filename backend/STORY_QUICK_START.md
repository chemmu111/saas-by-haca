# Instagram Story Upload - Quick Start Guide

## ✅ All Issues Fixed!

### What Was Broken
1. ❌ Processed images returned `/api/images/` URLs (404 errors)
2. ❌ CSP blocked blob URLs for preview
3. ❌ No detailed logging for debugging

### What's Fixed Now
1. ✅ All URLs use `/uploads/` route
2. ✅ CSP allows blob URLs and media
3. ✅ Comprehensive logging for every step

---

## 🚀 Test Story Upload NOW

### Step 1: Verify Setup
```bash
# Backend should auto-reload (nodemon watching)
# If not, restart manually:
cd backend
npm start
```

### Step 2: Hard Refresh Browser
```
Press: Ctrl + Shift + R  (or Ctrl + F5)
```

### Step 3: Upload a Story

**In your dashboard:**
1. Select a client (Instagram connected)
2. Upload an image (any size - will auto-resize to 9:16)
3. **Set Post Type: "Story"**
4. Click "Publish"

---

## 📊 What You'll See in Backend Logs

```
============================================================
📸 INSTAGRAM STORY UPLOAD STARTED
============================================================
  Post Type: story
  Original Media URL: https://ngrok-url/uploads/image-xxx.png
  
  🖼️ Processing image for Instagram...
    Original dimensions: 1000x1000
    ⚠️ Story requires 9:16, resizing to 1080x1920
    ✅ Image processed: instagram-processed-xxx.jpg
    📤 Processed URL: https://ngrok-url/uploads/instagram-processed-xxx.jpg
  
  📡 Verifying media URL is publicly accessible...
  ✅ Media URL is accessible (HTTP 200)
  ✅ Content-Type: image/jpeg
  
  📦 STEP 1: Creating Instagram Media Container
  🖼️  Story Type: IMAGE
  ✅ Container Created Successfully!
  
  📊 STEP 2: Waiting for Image Processing
  ✅ Image processing completed
  
  🚀 STEP 3: Publishing Story
  🎉 Instagram STORY Published Successfully!
  📱 Story URL: https://instagram.com/stories/.../...
============================================================
✅ INSTAGRAM STORY UPLOAD COMPLETED
============================================================
```

---

## 🐛 If Something Goes Wrong

### See "Media URL returned status 404"?
```bash
# Check file exists
ls -lt backend/uploads/ | head -5

# Test URL manually
curl -I https://YOUR-NGROK-URL/uploads/YOUR-FILE.png

# Should return: HTTP 200
```

### See CSP Error in Browser?
```
Error: "Loading media from 'blob:...' violates CSP"
```

**Solution:** Hard refresh browser (Ctrl+Shift+R)

The CSP fix is already applied - just need to clear cache.

### Backend Not Responding?
```bash
# Check if running
curl http://localhost:5000/health

# Check ngrok
curl http://localhost:4040/api/tunnels | jq '.tunnels[0].public_url'

# Should show: https://geneva-incapacious-romana.ngrok-free.dev
```

---

## 📋 Story Requirements

### Image Stories ✅
- Any image size (auto-resized to 9:16)
- JPG, PNG supported
- Max 8MB

### Video Stories ✅
- Max 15 seconds
- 9:16 aspect ratio (vertical)
- MP4 format
- Max 100MB

### ⚠️ Important
- Stories **do NOT support captions** via API
- Stories expire after 24 hours
- Use Reels for permanent videos with captions

---

## 🎯 Frontend Request Format

```javascript
const postData = {
  content: "", // Ignored for Stories (no caption support)
  platform: "instagram",
  client: clientId,
  mediaUrls: ["https://ngrok-url/uploads/image-xxx.png"],
  postType: "story",  // ⚠️ MUST be exactly "story"
  publishImmediately: true
};

fetch('/api/posts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(postData)
});
```

---

## ✅ Success Checklist

- [ ] Backend logs show "INSTAGRAM STORY UPLOAD STARTED"
- [ ] Sees "🖼️  Story Type: IMAGE"
- [ ] Sees "✅ Media URL is accessible (HTTP 200)"
- [ ] Sees "✅ Container Created Successfully!"
- [ ] Sees "✅ Image processing completed"
- [ ] Sees "🎉 Instagram STORY Published Successfully!"
- [ ] Story appears on Instagram

---

## 📚 Full Documentation

- `INSTAGRAM_STORY_FIXED.md` - Complete fix documentation
- `MEDIA_SERVING_FIXED.md` - Media serving fixes
- `INSTAGRAM_UPLOAD_FIXES.md` - Original fixes

---

## 🆘 Still Not Working?

1. Check backend logs for specific error
2. Verify ngrok URL in `.env` matches actual tunnel
3. Test file access with curl
4. Make sure Instagram account is connected
5. Verify app has required permissions

---

**Try it now! Upload a Story and watch the detailed logs.** 🎉





