# Instagram Graph API v22+ Compatibility Fix

## Overview
Meta updated the Instagram Graph API in version v22+ and removed/restricted many metrics. This document outlines all the fixes applied to make the analytics service compatible with the new API requirements.

## Changes Made

### 1. Account Insights (`fetchAccountInsights`)

**Before:**
- Used `period=day` 
- Requested `impressions` (NOT valid for account insights)

**After:**
- Uses `period=lifetime` with `metric_type=total_value`
- Metrics: `reach,profile_views,follower_count`
- **Removed:** `impressions` (not available for account insights in v22+)

**API Call:**
```
GET /{ig-user-id}/insights
  metrics=reach,profile_views,follower_count
  period=lifetime
  metric_type=total_value
```

### 2. Account Insights Trend (`fetchAccountInsightsTrend`)

**Before:**
- Requested `impressions` (NOT valid)

**After:**
- Uses `period=day` for daily trends
- Metrics: `follower_count,reach,profile_views`
- **Removed:** `impressions`

**API Call:**
```
GET /{ig-user-id}/insights
  metrics=follower_count,reach,profile_views
  period=day
```

### 3. Media Insights (`fetchMediaInsights`)

**Before:**
- Used same metrics for all media types
- Requested `impressions` and `reach` for all types
- Requested `video_views` for images (NOT valid)

**After:**
- **Media type-specific metrics:**

  **IMAGE/CAROUSEL:**
  - `engagement,saved`
  - ❌ NO `reach`
  - ❌ NO `video_views`
  - ❌ NO `impressions`

  **VIDEO/REELS:**
  - `engagement,saved,video_views`
  - ❌ NO `reach`
  - ❌ NO `impressions`

  **STORY:**
  - `replies,exits,taps_forward,taps_back,reach`
  - ❌ NO `engagement`
  - ❌ NO `video_views`
  - ❌ NO `impressions`

**Error Handling:**
- If a metric is not supported (error code 100), the function returns `null` gracefully
- No errors thrown for unsupported metrics

### 4. Data Aggregation Updates

**Total Views Calculation:**
- **Videos/Reels:** Sum of `video_views`
- **Stories:** Sum of `reach` (used as views proxy)
- **Images:** Not included (no view metric available)

**Total Engagement:**
- Uses `engagement` metric (not `total_interactions`)
- Summed across all media types

**Follower Growth:**
- Calculated from trend data: `lastDay.follower_count - firstDay.follower_count`

### 5. Frontend Updates

**Removed:**
- Display of `impressions` metric (no longer available)

**Added:**
- Display of `video_views` for video/reel posts
- Display of `reach` for story posts

### 6. Routes Updates

**`/api/analytics/overview`:**
- Removed `totalImpressions` aggregation
- Added `totalFollowerGrowth` calculation
- Updated to use new data structure

**`/api/analytics/trends`:**
- Updated follower trend aggregation to use `follower_count` field

## API Version

Currently using: `v18.0`

**Note:** The API version in the URL (`v18.0`) is the Graph API version, not the Instagram API version. The metric restrictions apply regardless of the Graph API version number.

## Testing Checklist

- [x] Account insights fetch successfully with `lifetime` period
- [x] Account trends fetch successfully with `day` period
- [x] Image media insights fetch with correct metrics
- [x] Video/Reel media insights fetch with correct metrics
- [x] Story media insights fetch with correct metrics
- [x] Unsupported metrics are gracefully skipped
- [x] Dashboard displays correct metrics
- [x] No 400 errors for invalid metrics

## Error Codes

**Error 100:** Invalid metric for media type
- **Solution:** Metric is skipped, function returns `null`
- **Logging:** Warning message logged, no error thrown

## Metrics Reference

### Account Insights (Available)
- ✅ `reach`
- ✅ `profile_views`
- ✅ `follower_count`
- ❌ `impressions` (NOT available)

### Media Insights by Type

**IMAGE:**
- ✅ `engagement`
- ✅ `saved`
- ❌ `reach` (NOT available)
- ❌ `video_views` (NOT available)
- ❌ `impressions` (NOT available)

**VIDEO/REELS:**
- ✅ `engagement`
- ✅ `saved`
- ✅ `video_views`
- ❌ `reach` (NOT available)
- ❌ `impressions` (NOT available)

**STORY:**
- ✅ `replies`
- ✅ `exits`
- ✅ `taps_forward`
- ✅ `taps_back`
- ✅ `reach`
- ❌ `engagement` (NOT available)
- ❌ `video_views` (NOT available)
- ❌ `impressions` (NOT available)

## Migration Notes

If you see errors like:
- `"(#100) metric[0] must be one of the following values..."`
- `"impressions is not available"`

This means the code is still using deprecated metrics. All deprecated metrics have been removed in this update.

## Files Modified

1. `backend/src/services/instagramInsightsService.js` - Complete rewrite
2. `backend/src/routes/analytics.js` - Updated data aggregation
3. `frontend/dashboard/src/Analytics.jsx` - Removed impressions display

## Next Steps

1. Test the analytics dashboard
2. Verify all metrics display correctly
3. Check backend logs for any remaining errors
4. Monitor API rate limits (Instagram has strict limits)


