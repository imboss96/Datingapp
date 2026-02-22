import mongoose from 'mongoose';
import Chat from '../models/Chat.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://joshuanyandieka3_db_user:MyVision%402040@lunesaprod.5pt7jzr.mongodb.net/';

async function markStalledChats() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const STALLED_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();

    // Find chats with messages older than threshold
    const chats = await Chat.find({
      lastUpdated: { $lt: now - STALLED_THRESHOLD },
      supportStatus: { $ne: 'resolved' }
    });

    let stalledCount = 0;

    for (const chat of chats) {
      if (!chat.messages || chat.messages.length === 0) continue;

      // Check if the last message is unanswered
      const lastMessage = chat.messages[chat.messages.length - 1];
      const otherParticipant = chat.participants.find(p => p !== lastMessage.senderId);

      if (otherParticipant) {
        // Mark as stalled
        chat.isStalled = true;
        chat.stalledSince = chat.lastUpdated;
        await chat.save();
        stalledCount++;
        console.log(`Marked chat ${chat.id} as stalled`);
      }
    }

    console.log(`Marked ${stalledCount} chats as stalled`);
  } catch (error) {
    console.error('Error marking stalled chats:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  markStalledChats();
}

export { markStalledChats };