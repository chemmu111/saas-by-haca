import mongoose from 'mongoose';

const viewSnapshotSchema = new mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    totalViews: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    reelViews: {
        type: Number,
        min: 0,
        default: 0
    },
    videoViews: {
        type: Number,
        min: 0,
        default: 0
    },
    viewsGained: {
        type: Number,
        default: 0
    },
    postCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for efficient querying
viewSnapshotSchema.index({ client: 1, date: -1 });
viewSnapshotSchema.index({ client: 1, createdAt: -1 });

// Ensure one snapshot per client per day
viewSnapshotSchema.index({ client: 1, date: 1 }, { unique: true });

const ViewSnapshot = mongoose.model('ViewSnapshot', viewSnapshotSchema);

export default ViewSnapshot;
