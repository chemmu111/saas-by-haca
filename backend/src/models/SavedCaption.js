import mongoose from 'mongoose';

const savedCaptionSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    tags: [{ type: String }],
    category: { type: String, default: 'General' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    usageCount: { type: Number, default: 0 },
    lastUsed: { type: Date }
}, { timestamps: true });

const SavedCaption = mongoose.model('SavedCaption', savedCaptionSchema);
export default SavedCaption;
