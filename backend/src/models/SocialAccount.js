import mongoose from 'mongoose';

const socialAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    provider: {
      type: String,
      enum: ['meta', 'linkedin', 'x'],
      required: true,
      index: true
    },
    providerAccountId: {
      type: String,
      required: true,
      index: true
    },
    accountName: {
      type: String,
      required: true
    },
    accessTokenEncrypted: {
      type: String,
      required: true
    },
    refreshTokenEncrypted: {
      type: String,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    },
    scopes: {
      type: [String],
      default: []
    },
    connectedAt: {
      type: Date,
      default: Date.now
    },
    lastSyncAt: {
      type: Date,
      default: Date.now
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    requiresManualSetup: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Compound index for unique provider account per user
socialAccountSchema.index({ userId: 1, provider: 1, providerAccountId: 1 }, { unique: true });

// Index for active accounts
socialAccountSchema.index({ userId: 1, isActive: 1 });

const SocialAccount = mongoose.model('SocialAccount', socialAccountSchema);
export default SocialAccount;

