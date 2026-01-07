import mongoose from 'mongoose';

const dailyAnalyticsSchema = new mongoose.Schema(
    {
        client: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Client',
            required: true
        },
        date: { type: Date, required: true }, // Normalized to start of day (UTC)
        platform: {
            type: String,
            enum: ['instagram', 'facebook'],
            required: true
        },
        // Account Metrics
        followers: { type: Number, default: 0 },
        impressions: { type: Number, default: 0 },
        reach: { type: Number, default: 0 },
        profileViews: { type: Number, default: 0 },

        // Click/Contact Metrics
        websiteClicks: { type: Number, default: 0 },
        emailContacts: { type: Number, default: 0 },
        phoneCallClicks: { type: Number, default: 0 },
        textMessageClicks: { type: Number, default: 0 },
        getDirectionsClicks: { type: Number, default: 0 },

        // Messaging Analytics (if available)
        messaging: {
            sent: { type: Number, default: 0 },
            received: { type: Number, default: 0 },
            newConversations: { type: Number, default: 0 }
        },

        // Aggregated Engagement (Sum of all posts activity for this day + account level)
        engagement: {
            total: { type: Number, default: 0 },
            likes: { type: Number, default: 0 },
            comments: { type: Number, default: 0 },
            shares: { type: Number, default: 0 },
            saves: { type: Number, default: 0 }
        },

        // Content Activity
        postsPublished: { type: Number, default: 0 },
        storiesPublished: { type: Number, default: 0 },

        // Reach Breakdown (Aggregated or Estimated)
        reachBreakdown: {
            feed: { type: Number, default: 0 },
            explore: { type: Number, default: 0 },
            reels: { type: Number, default: 0 },
            other: { type: Number, default: 0 }
        }
    },
    { timestamps: true }
);

// Compound index to ensure one entry per client per platform per day
dailyAnalyticsSchema.index({ client: 1, platform: 1, date: 1 }, { unique: true });
dailyAnalyticsSchema.index({ date: -1 });

const DailyAnalytics = mongoose.model('DailyAnalytics', dailyAnalyticsSchema);
export default DailyAnalytics;
