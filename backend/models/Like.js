import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  // Profile that is being liked
  profileUserId: { type: String, required: true, index: true },
  // User who is doing the liking
  likerUserId: { type: String, required: true, index: true },
  // Type of like: 'like' or 'superlike'
  likeType: { 
    type: String, 
    enum: ['like', 'superlike'], 
    default: 'like' 
  },
  // When the like was created
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});

// Create compound index for fast lookups
likeSchema.index({ profileUserId: 1, likerUserId: 1 }, { unique: true });

const Like = mongoose.model('Like', likeSchema);

export default Like;
