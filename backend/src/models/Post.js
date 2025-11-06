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
    caption: { type: String, trim: true },
    hashtags: [{ type: String }], // Array of hashtags
    location: { type: String, trim: true },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    instagramPostId: { type: String, trim: true }, // Instagram post ID after publishing
    facebookPostId: { type: String, trim: true }, // Facebook post ID after publishing
    errorMessage: { type: String, trim: true } // Error message if publishing fails
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

