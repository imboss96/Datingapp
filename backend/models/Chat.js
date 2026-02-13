import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  senderId: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Number, required: true },
  isFlagged: { type: Boolean, default: false },
  flagReason: { type: String },
  isEditedByModerator: { type: Boolean, default: false },
});

const chatSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  participants: [{ type: String, required: true }],
  messages: [messageSchema],
  lastUpdated: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
