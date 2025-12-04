import mongoose from 'mongoose';

const reportScheduleSchema = new mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    interval: {
        type: String,
        enum: ['weekly', 'monthly'],
        default: 'monthly'
    },
    templateId: {
        type: String, // Filename of the template
        default: null
    },
    format: {
        type: String,
        enum: ['pdf', 'json', 'html'],
        default: 'pdf'
    },
    emailRecipients: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    lastRun: {
        type: Date,
        default: null
    },
    nextRun: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for efficient querying by nextRun
reportScheduleSchema.index({ nextRun: 1, isActive: 1 });

const ReportSchedule = mongoose.model('ReportSchedule', reportScheduleSchema);

export default ReportSchedule;
