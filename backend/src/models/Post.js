import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    content: { type: String, required: true, trim: true },
    platform: {
      type: String,
      enum: ['instagram', 'facebook', 'both'],
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'failed'],
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
      enum: ['post', 'story', 'reel'],
      default: 'post'
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
    // Engagement metrics (from Instagram/Facebook APIs)
    engagement: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      saves: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      lastUpdated: { type: Date } // When engagement data was last fetched
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

