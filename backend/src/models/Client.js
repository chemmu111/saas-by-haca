import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    socialMediaLink: { type: String, trim: true }, // Optional now, can be derived from OAuth
    platform: { 
      type: String, 
      enum: ['instagram', 'facebook', 'manual'],
      default: 'manual'
    },
    accessToken: { type: String, trim: true }, // OAuth access token
    refreshToken: { type: String, trim: true }, // OAuth refresh token (if available)
    socialMediaId: { type: String, trim: true }, // Instagram/Facebook user ID
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

const Client = mongoose.model('Client', clientSchema);
export default Client;

