import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true, lowercase: true, index: true },
  passwordHash: { type: String },
  googleId: { type: String, sparse: true },
  name: { type: String, required: true },
  username: { type: String, unique: true, sparse: true, lowercase: true, index: true },
  age: { type: Number, required: true },
  bio: { type: String },
  images: [{ type: String }],
  profilePicture: { type: String },
  isPremium: { type: Boolean, default: false },
  role: { type: String, enum: ['USER', 'MODERATOR', 'ADMIN'], default: 'USER' },
  location: { type: String },
  // GeoJSON coordinates: [longitude, latitude]
  coordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  interests: [{ type: String }],
  coins: { type: Number, default: 10 },
  swipes: [{ type: String }], // User IDs they've liked/disliked
  matches: [{ type: String }], // User IDs they've matched with
  notifications: {
    newMatches: { type: Boolean, default: true },
    newMessages: { type: Boolean, default: true },
    activityUpdates: { type: Boolean, default: true },
    promotions: { type: Boolean, default: false }
  },
  // Legal & Verification Fields
  termsOfServiceAccepted: { type: Boolean, default: false },
  privacyPolicyAccepted: { type: Boolean, default: false },
  cookiePolicyAccepted: { type: Boolean, default: false },
  legalAcceptanceDate: { type: Date },
  emailVerified: { type: Boolean, default: false },
  emailVerifiedAt: { type: Date },
  isPhotoVerified: { type: Boolean, default: false },
  photoVerifiedAt: { type: Date },
  // Trust & Badges
  badges: [{ type: String }], // e.g. ['email_verified','photo_verified','premium']
  trustScore: { type: Number, default: 0 }, // 0-100 computed from verification/badges/activity
  // Account Management
  suspended: { type: Boolean, default: false },
  suspendedReason: { type: String },
  suspendedAt: { type: Date },
  banned: { type: Boolean, default: false },
  bannedReason: { type: String },
  bannedAt: { type: Date },
  warningCount: { type: Number, default: 0 },
  lastActiveAt: { type: Date, default: Date.now },
  resetToken: { type: String, sparse: true },
  resetTokenExpiry: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes to speed up discovery queries
userSchema.index({ coordinates: '2dsphere' });
userSchema.index({ interests: 1 });

const User = mongoose.model('User', userSchema);
export default User;
