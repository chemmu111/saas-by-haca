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
    }
  },
  { timestamps: true }
);

// Pre-save hook to ensure role is always set (for existing documents without role)
userSchema.pre('save', function(next) {
  if (!this.role) {
    this.role = 'social media manager';
  }
  next();
});


const User = mongoose.model('User', userSchema);
export default User;


