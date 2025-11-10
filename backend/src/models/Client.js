import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    socialMediaLink: { type: String, trim: true }, // Optional now, can be derived from OAuth
    platform: { 
      type: String, 
      enum: ['instagram', 'facebook', 'manual'],
      default: 'manual'
    },
    accessToken: { type: String, trim: true }, // OAuth access token (deprecated for Instagram, use pageAccessToken)
    refreshToken: { type: String, trim: true }, // OAuth refresh token (if available)
    socialMediaId: { type: String, trim: true }, // Instagram/Facebook user ID
    // Instagram Graph API specific fields
    pageId: { type: String, trim: true }, // Facebook Page ID
    pageAccessToken: { type: String, trim: true }, // Long-lived Page Access Token for publishing
    igUserId: { type: String, trim: true }, // Instagram Business Account ID
    longLivedUserToken: { type: String, trim: true }, // Long-lived user token (60 days)
    // Follower metrics (from Instagram/Facebook APIs)
    followerCount: { type: Number, default: 0 }, // Current follower count
    followerCountLastUpdated: { type: Date }, // When follower count was last fetched
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

const Client = mongoose.model('Client', clientSchema);
export default Client;

