import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    color: { type: String, default: '#3b82f6' }, // For UI badges
    icon: { type: String, default: 'folder' }, // Lucide icon name
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isSystem: { type: Boolean, default: false } // e.g., "All Posts", "Trash"
}, { timestamps: true });

// Compound index to ensure unique folder names per user
folderSchema.index({ name: 1, createdBy: 1 }, { unique: true });

const Folder = mongoose.model('Folder', folderSchema);
export default Folder;
