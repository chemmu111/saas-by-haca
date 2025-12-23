import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    content: { type: String, required: false, trim: true },
    platform: {
      type: String,
      enum: ['instagram', 'facebook', 'both'],
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'processing', 'published', 'failed'],
      default: 'draft'
    },
    scheduledTime: { type: Date },
    publishedTime: { type: Date },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true
    },
    mediaUrls: [{ type: String }], // Array of image/video URLs
    coverUrl: { type: String, trim: true }, // Cover photo URL for reels/videos
    thumbnailUrl: { type: String, trim: true }, // Thumbnail URL for videos
    musicUrl: { type: String, trim: true }, // Music/audio URL for posts and stories
    musicTitle: { type: String, trim: true }, // Music title
    musicArtist: { type: String, trim: true }, // Music artist
    caption: { type: String, trim: true },
    hashtags: [{ type: String }], // Array of hashtags
    tags: [{
      name: { type: String, trim: true, required: true },
      color: { type: String, trim: true, default: '#8b5cf6' }
    }], // Array of tags with colors
    location: { type: String, trim: true },
    postType: {
      type: String,
      enum: ['post', 'story', 'reel', 'carousel', 'video'],
      default: 'post'
    },
    format: {
      type: String,
      enum: ['square', 'portrait', 'landscape', 'reel', 'story', 'carousel-square', 'carousel-vertical'],
      default: 'square'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    instagramPostId: { type: String, trim: true }, // Instagram post ID after publishing
    facebookPostId: { type: String, trim: true }, // Facebook post ID after publishing
    instagramPostUrl: { type: String, trim: true }, // Instagram post URL after publishing
    facebookPostUrl: { type: String, trim: true }, // Facebook post URL after publishing
    publishingErrors: [{ type: String }], // Array of error messages if publishing fails
    errorMessage: { type: String, trim: true }, // Error message if publishing fails (backward compatibility)
    folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' }, // Organize posts
    isTemplate: { type: Boolean, default: false }, // Save as template
    bestTime: {
      score: { type: Number }, // 0-100 score
      reason: { type: String } // "High engagement time"
    },
    // Engagement metrics (from Instagram/Facebook APIs)
    engagement: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      saves: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      interactions: { type: Number, default: 0 }, // Total interactions
      watchTime: { type: Number, default: 0 }, // Avg watch time for reels
      impressions: { type: Number, default: 0 }, // Deprecated but kept for history
      lastUpdated: { type: Date }, // When engagement data was last fetched

      // Detailed Metrics (New)
      profileVisits: { type: Number, default: 0 },
      websiteClicks: { type: Number, default: 0 },
      engagementRate: { type: Number, default: 0 }, // Calculated rate

      // Video Specific
      videoViewsBreakdown: {
        total: { type: Number, default: 0 },
        organic: { type: Number, default: 0 },
        paid: { type: Number, default: 0 },
        autoplay: { type: Number, default: 0 },
        clickToPlay: { type: Number, default: 0 }
      },

      // Raw API Data (for fallback/debugging)
      metricsRaw: { type: mongoose.Schema.Types.Mixed }
    }
  },
  { timestamps: true }
);

// Index for faster queries
postSchema.index({ createdBy: 1, createdAt: -1 });
postSchema.index({ client: 1 });
postSchema.index({ status: 1 });
postSchema.index({ scheduledTime: 1 });

const Post = mongoose.model('Post', postSchema);
export default Post;

