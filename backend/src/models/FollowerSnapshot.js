import mongoose from 'mongoose';

const followerSnapshotSchema = new mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    followerCount: {
        type: Number,
        required: true,
        min: 0
    },
    date: {
        type: Date,
        required: true
    },
    source: {
        type: String,
        enum: ['instagram', 'facebook'],
        required: true,
        default: 'instagram'
    },
    gained: {
        type: Number,
        default: 0
    },
    lost: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for efficient querying
followerSnapshotSchema.index({ client: 1, date: -1 });
followerSnapshotSchema.index({ client: 1, createdAt: -1 });

// Ensure one snapshot per client per day per source
followerSnapshotSchema.index({ client: 1, date: 1, source: 1 }, { unique: true });

const FollowerSnapshot = mongoose.model('FollowerSnapshot', followerSnapshotSchema);

export default FollowerSnapshot;
