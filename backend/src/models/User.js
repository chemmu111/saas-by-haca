import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'social media manager'],
      default: 'social media manager',
      required: true
    },
    bio: { type: String, default: '', maxlength: 500 },
    theme: {
      mode: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
      color: { type: String, default: 'blue' }
    },
    notificationSettings: {
      emailAlerts: { type: Boolean, default: true },
      tokenAlerts: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true },
      weeklyReports: { type: Boolean, default: false }
    },
    preferences: {
      language: { type: String, default: 'en' },
      timezone: { type: String, default: 'UTC' },
      defaultTab: { type: String, default: 'overview' },
      defaultDateRange: { type: String, default: '7days' }
    },
    twoFactorEnabled: { type: Boolean, default: false },
    reportSettings: {
      enabled: { type: Boolean, default: false },
      dayOfMonth: { type: Number, min: 1, max: 28, default: 1 },
      email: { type: String, default: '' },
      lastSentAt: { type: Date },
      updatedAt: { type: Date }
    },
    sessions: [{
      token: String,
      createdAt: { type: Date, default: Date.now },
      expiresAt: Date,
      userAgent: String,
      ip: String
    }]
  },
  { timestamps: true }
);

// Pre-save hook to ensure role is always set (for existing documents without role)
userSchema.pre('save', function (next) {
  if (!this.role) {
    this.role = 'social media manager';
  }
  next();
});

const User = mongoose.model('User', userSchema);
export default User;
