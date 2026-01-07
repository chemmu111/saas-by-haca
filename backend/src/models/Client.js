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
    instagramAccessToken: { type: String, trim: true },
    instagramRefreshToken: { type: String, trim: true },
    instagramTokenExpiresAt: { type: Date },
    accessToken: { type: String, trim: true }, // OAuth access token (deprecated for Instagram, use pageAccessToken)
    refreshToken: { type: String, trim: true }, // OAuth refresh token (if available)
    socialMediaId: { type: String, trim: true }, // Instagram/Facebook user ID
    // Instagram Graph API specific fields
    pageId: { type: String, trim: true }, // Facebook Page ID
    pageAccessToken: { type: String, trim: true }, // Long-lived Page Access Token for publishing
    igUserId: { type: String, trim: true }, // Instagram Business Account ID
    instagramUsername: { type: String, trim: true }, // Instagram @username
    instagramProfilePicture: { type: String, trim: true }, // Instagram profile picture URL
    instagramConnected: { type: Boolean, default: false }, // Instagram connection status
    longLivedUserToken: { type: String, trim: true }, // Long-lived user token (60 days)
    // Token lifecycle management
    tokenType: { type: String, enum: ['short-lived', 'long-lived'], default: 'long-lived' },
    tokenCreatedAt: { type: Date }, // When token was created/exchanged
    tokenExpiresIn: { type: Number, default: 5184000 }, // Expiration in seconds (60 days default)
    tokenExpiresAt: { type: Date }, // Calculated expiration date
    lastTokenRefresh: { type: Date }, // When token was last refreshed
    tokenRefreshCount: { type: Number, default: 0 }, // How many times token has been refreshed
    tokenStatus: {
      state: { type: String, enum: ['active', 'expiring', 'expired', 'unknown'], default: 'unknown' },
      expiresInDays: { type: Number, default: null },
      lastRefresh: { type: Date, default: null },
      nextRefresh: { type: Date, default: null },
      lastRefreshStatus: { type: String, default: 'unknown' } // success, failed
    },
    tokenNeedsRefresh: { type: Boolean, default: false }, // Flag when token needs refresh
    tokenLastValidated: { type: Date }, // Last time token was validated
    // Follower metrics (from Instagram/Facebook APIs)
    followerCount: { type: Number, default: 0 }, // Current follower count
    followerCountLastUpdated: { type: Date }, // When follower count was last fetched
    totalPosts: { type: Number, default: 0 }, // Total posts count
    totalEngagement: { type: Number, default: 0 }, // Total absolute interactions (likes+comments+shares+saves)
    engagementRate: { type: String, default: '0%' }, // Engagement rate percentage
    statsLastUpdated: { type: Date }, // When stats were last updated
    // Contact & Brand Info
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    logo: { type: String, trim: true }, // URL to logo image
    brandColors: {
      primary: { type: String, default: '#000000' },
      secondary: { type: String, default: '#ffffff' },
      accent: { type: String, default: '#3b82f6' }
    },
    tags: [{ type: String, trim: true }],

    // Sub-resources (Embedded for simplicity, or could be separate models)
    notes: [{
      content: { type: String, required: true },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now }
    }],
    tasks: [{
      title: { type: String, required: true },
      description: { type: String },
      status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
      dueDate: { type: Date },
      assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Could be team member
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now }
    }],
    teamMembers: [{
      name: { type: String, required: true },
      email: { type: String, required: true },
      role: { type: String, default: 'viewer' }, // viewer, editor, admin
      avatar: { type: String }
    }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

const Client = mongoose.model('Client', clientSchema);
export default Client;

