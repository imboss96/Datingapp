import mongoose from 'mongoose';

const storySchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  // User who created the story
  userId: { type: String, required: true, index: true },
  userName: { type: String },
  userAvatar: { type: String },
  // Image or video URL
  mediaUrl: { type: String, required: true },
  // Media type: 'image' or 'video'
  mediaType: { 
    type: String, 
    enum: ['image', 'video'], 
    default: 'image' 
  },
  // Duration in seconds (for videos)
  duration: { type: Number, default: 5 },
  // When the story was created
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  // When the story expires (24 hours from creation)
  expiresAt: { 
    type: Date, 
    index: true 
  },
  // View count
  viewCount: { type: Number, default: 0 },
  // Users who have viewed this story
  viewedBy: [{ type: String }],
});

// Set expiration to 24 hours after creation
storySchema.pre('save', function(next) {
  if (this.isNew) {
    this.expiresAt = new Date(this.createdAt.getTime() + 24 * 60 * 60 * 1000);
  }
  next();
});

// Index for finding active stories
storySchema.index({ userId: 1, expiresAt: 1 });

const Story = mongoose.model('Story', storySchema);

export default Story;
