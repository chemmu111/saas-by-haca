import mongoose from 'mongoose';

const pendingUserSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, index: true },
        passwordHash: { type: String, required: true },
        avatar: { type: String, default: '' },
        gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
        verificationCode: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        role: { type: String, default: 'social media manager' }
    },
    { timestamps: true }
);

// Auto-delete expired pending users - TTL index
pendingUserSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PendingUser = mongoose.model('PendingUser', pendingUserSchema);
export default PendingUser;
