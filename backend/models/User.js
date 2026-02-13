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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
export default User;
