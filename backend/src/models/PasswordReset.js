import mongoose from 'mongoose';

const passwordResetSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    used: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Index for faster queries
passwordResetSchema.index({ email: 1, used: 1 });
passwordResetSchema.index({ token: 1, used: 1, expiresAt: 1 });

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);
export default PasswordReset;

