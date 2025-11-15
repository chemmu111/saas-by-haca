import mongoose from 'mongoose';

const passwordResetSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// TTL index for auto-deletion of expired tokens
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for faster queries
passwordResetSchema.index({ email: 1, used: 1 });
passwordResetSchema.index({ token: 1, used: 1 });

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);
export default PasswordReset;

