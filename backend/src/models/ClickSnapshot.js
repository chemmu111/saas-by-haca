import mongoose from 'mongoose';

const clickSnapshotSchema = new mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    website_clicks: {
        type: Number,
        default: 0
    },
    email_contacts: {
        type: Number,
        default: 0
    },
    phone_call_clicks: {
        type: Number,
        default: 0
    },
    text_message_clicks: {
        type: Number,
        default: 0
    },
    get_directions_clicks: {
        type: Number,
        default: 0
    },
    source: {
        type: String,
        enum: ['instagram', 'facebook'],
        default: 'instagram'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 * 30 // Auto-delete after 30 days to save space (optional)
    }
});

// Compound index for efficient querying
clickSnapshotSchema.index({ client: 1, date: 1 });

const ClickSnapshot = mongoose.model('ClickSnapshot', clickSnapshotSchema);

export default ClickSnapshot;
