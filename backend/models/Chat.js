import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  id: { type: String, required: false }, // optional for backwards compatibility
  senderId: { type: String, required: true },
  text: { type: String, required: false },
  timestamp: { type: Number, required: true },
  isFlagged: { type: Boolean, default: false },
  flagReason: { type: String },
  isEditedByModerator: { type: Boolean, default: false },
  isRead: { type: Boolean, default: false },
  readAt: { type: Number },
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Number },
  originalText: { type: String },
  // Media fields
  media: {
    url: { type: String },
    type: { type: String, enum: ['image', 'video', 'pdf', 'file', 'audio'] },
    name: { type: String },
    size: { type: Number },
    mimetype: { type: String },
    duration: { type: Number }, // for videos/audio in seconds
    width: { type: Number }, // for images/videos
    height: { type: Number }, // for images/videos
    thumbnail: { type: String }, // thumbnail URL for videos
  }
}, { _id: true });

const chatSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  participants: [{ type: String, required: true }],
  // Stable key generated from sorted participants to ensure uniqueness
  participantsKey: { type: String, required: true, index: true },
  messages: [messageSchema],
  lastUpdated: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  // Chat request system
  requestStatus: {
    type: String,
    enum: ['pending', 'accepted', 'blocked'],
    default: 'accepted', // set to 'pending' for new chats if needed
  },
  requestInitiator: { type: String }, // User ID who initiated the chat request
  requestInitiatorFirstMessage: { type: Boolean, default: false }, // track if initiator sent a message
  blockedBy: [{ type: String }], // Array of user IDs who blocked this chat
  deletedBy: [{ type: String }], // Array of user IDs who deleted this chat
  // Track unread counts per participant and last opened timestamp per participant
  unreadCounts: {
    type: Map,
    of: Number,
    default: {}
  },
  lastOpened: {
    type: Map,
    of: Number,
    default: {}
  }
});

// Use participantsKey to enforce uniqueness across participant combinations
chatSchema.index({ participantsKey: 1 }, { unique: true, sparse: true });

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
