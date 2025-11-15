# Test "Post Now" - Quick Guide

## ✅ All Fixes Applied!

### What Was Fixed
1. ✅ `/api/images` now redirects to `/uploads` (simple & reliable)
2. ✅ Enhanced logging for Post Now flow
3. ✅ Media URL verification already in place
4. ✅ Static file serving with proper headers

---

## 🚀 TEST NOW (3 Steps)

### Step 1: Verify Backend & Ngrok Running

```bash
# Check backend
curl http://localhost:5000/health
# Should return: {"ok":true}

# Check ngrok
curl http://localhost:4040/api/tunnels | findstr public_url
# Should show: https://geneva-incapacious-romana.ngrok-free.dev
```

**✅ Both running? Proceed to Step 2**

---

### Step 2: Test File Serving

```bash
# List recent uploads
Get-ChildItem backend\uploads | Sort-Object LastWriteTime -Descending | Select-Object -First 3

# Pick a video file and test
curl -I https://geneva-incapacious-romana.ngrok-free.dev/uploads/YOUR_FILE.mp4
```

**Expected Response:**
```
HTTP/2 200
content-type: video/mp4
accept-ranges: bytes
content-length: 5849655
```

**✅ Returns 200 OK? Proceed to Step 3**

---

### Step 3: Post Now via Frontend

**In your dashboard:**

1. **Select Client:** Choose Instagram-connected client
2. **Upload Video:** Click upload, select video (max 90s)
3. **Add Caption:** Type your reel caption
4. **Set Post Type:** Select "Reel"
5. **Click "Post Now"** (or enable "Publish Immediately")

---

## 📊 **WATCH THE LOGS**

Backend will show:

```
============================================================
🚀 PUBLISH IMMEDIATELY: Post created, publishing now
============================================================
  Post ID: 673abc123def456789
  Post Type: reel
  Platform: instagram
  Media URLs: ['https://ngrok.dev/uploads/image-xxx.mp4']

============================================================
📸 INSTAGRAM REEL UPLOAD STARTED
============================================================
  
  📡 Verifying media URL is publicly accessible...
  URL to verify: https://ngrok.dev/uploads/image-xxx.mp4
  Response received in 234ms
  ✅ Media URL is accessible (HTTP 200)
  ✅ Content-Type: video/mp4
  File size: 5.58MB
  
  📦 STEP 1: Creating Instagram Media Container
  ✅ Container Created Successfully!
  Container ID: 18012345678901234
  
  📊 STEP 2: Waiting for Video Processing
  Video status: IN_PROGRESS - attempt 1/60
  Video status: IN_PROGRESS - attempt 5/60
  Video status: FINISHED - attempt 10/60
  ✅ Video processing completed (attempt 10)
  
  🚀 STEP 3: Publishing Reel
  🎉 Instagram REEL Published Successfully!
  Post ID: 18087654321098765
  🎥 Reel URL: https://instagram.com/reel/18087654321098765

============================================================
✅ INSTAGRAM REEL UPLOAD COMPLETED
============================================================
```

---

## ✅ **SUCCESS CHECKLIST**

- [ ] Logs show "PUBLISH IMMEDIATELY"
- [ ] Logs show "Media URL is accessible (HTTP 200)"
- [ ] Logs show "Container Created Successfully"
- [ ] Logs show "Video processing completed"
- [ ] Logs show "REEL Published Successfully"
- [ ] Post status in DB changes to "published"
- [ ] Reel appears on Instagram

---

## 🐛 **IF IT FAILS**

### See "Media URL returned status 404"?

```bash
# Check file exists
ls -la backend/uploads/ | findstr YOUR_FILE

# Test URL manually
curl -I https://geneva-incapacious-romana.ngrok-free.dev/uploads/YOUR_FILE.mp4

# Should return HTTP 200
```

**If 404:** File wasn't uploaded or filename is wrong

---

### See "Post saved as DRAFT"?

**Possible causes:**
1. Backend logs show error → Check error message
2. No backend logs → Request didn't reach server
3. Timeout → Video too large or wrong codec

**Debug:**
```bash
# Check video properties
ffprobe YOUR_FILE.mp4

# Should show:
# - H.264 video codec
# - AAC audio codec
# - Duration: 3-90 seconds
# - Size: < 100MB
```

---

### See "Instagram API Permission Error"?

**Solution:**
1. Go to https://developers.facebook.com/apps/
2. Select your app
3. App Review → Permissions and Features
4. Request review for:
   - `pages_manage_posts`
   - `instagram_content_publish`
5. Wait for approval
6. Switch app to Live mode
7. Re-authenticate Instagram account

---

## 🎯 **QUICK COMMANDS**

```powershell
# Check backend running
curl http://localhost:5000/health

# Check ngrok URL
(Invoke-WebRequest -Uri http://localhost:4040/api/tunnels -UseBasicParsing).Content | ConvertFrom-Json | Select-Object -ExpandProperty tunnels | Select-Object public_url

# List recent uploads
Get-ChildItem backend\uploads | Sort-Object LastWriteTime -Descending | Select-Object -First 5 Name, Length, LastWriteTime

# Test file serving (replace YOUR_FILE)
curl -I https://geneva-incapacious-romana.ngrok-free.dev/uploads/YOUR_FILE.mp4

# Check backend logs (if running in terminal)
# Just look at the terminal window where npm start is running
```

---

## 📋 **VIDEO REQUIREMENTS**

| Requirement | Value | Notes |
|-------------|-------|-------|
| Duration | 3-90 seconds | For Reels |
| Aspect Ratio | 9:16 | Vertical (auto-fixed) |
| Format | MP4, MOV | MP4 recommended |
| Codec | H.264 + AAC | Check with ffprobe |
| Max Size | 100MB | Compress if needed |
| Min Size | 1MB | ✅ |

---

## 🔧 **IF VIDEO NEEDS RE-ENCODING**

```bash
# Install ffmpeg (if not installed)
# Download from: https://ffmpeg.org/download.html

# Re-encode video
ffmpeg -i input.mp4 -vcodec h264 -acodec aac -crf 23 output.mp4

# Compress large video
ffmpeg -i input.mp4 -vcodec h264 -acodec aac -crf 28 -maxrate 5M output.mp4

# Convert to 9:16 (vertical)
ffmpeg -i input.mp4 -vf "crop=ih*9/16:ih" -vcodec h264 -acodec aac output.mp4
```

---

## 📚 **DOCUMENTATION**

- `POST_NOW_FIXED.md` - Complete fix documentation
- `INSTAGRAM_STORY_FIXED.md` - Story upload fixes
- `MEDIA_SERVING_FIXED.md` - Media serving fixes

---

**Test it now! Upload a video with "Post Now" and watch the detailed logs.** 🎉



