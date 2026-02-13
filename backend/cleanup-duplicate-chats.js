import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chat from './models/Chat.js';

dotenv.config();

async function cleanupDuplicateChats() {
  try {
    console.log('[CLEANUP] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[CLEANUP] Connected to MongoDB');

    // Get all chats
    const allChats = await Chat.find({});
    console.log(`[CLEANUP] Found ${allChats.length} total chats`);

    // Group chats by sorted participant pair
    const chatsByPair = {};
    allChats.forEach(chat => {
      const sortedParticipants = chat.participants.sort().join(',');
      if (!chatsByPair[sortedParticipants]) {
        chatsByPair[sortedParticipants] = [];
      }
      chatsByPair[sortedParticipants].push(chat);
    });

    // Find and merge duplicates
    let duplicatesFixed = 0;
    for (const [pair, chats] of Object.entries(chatsByPair)) {
      if (chats.length > 1) {
        console.log(`[CLEANUP] Found ${chats.length} duplicate chats for pair: ${pair}`);
        
        // Sort chats by lastUpdated timestamp (newest first)
        chats.sort((a, b) => b.lastUpdated - a.lastUpdated);
        
        // Keep the chat with the most recent update
        const keepChat = chats[0];
        console.log(`[CLEANUP] Keeping chat: ${keepChat.id} (${keepChat.messages.length} messages, updated at ${new Date(keepChat.lastUpdated).toISOString()})`);

        // Ensure the keeper has participantsKey set
        const sortedParticipants = keepChat.participants.slice().sort();
        keepChat.participantsKey = sortedParticipants.join('_');

        // Merge messages from other chats
        for (let i = 1; i < chats.length; i++) {
          const mergeChat = chats[i];
          console.log(`[CLEANUP] Merging chat: ${mergeChat.id} (${mergeChat.messages.length} messages)`);
          
          // Add messages that don't already exist
          const existingMessageIds = new Set(keepChat.messages.map(m => m.id || m._id.toString()));
          const newMessages = mergeChat.messages.filter(msg => !existingMessageIds.has(msg.id || msg._id.toString()));
          
          if (newMessages.length > 0) {
            keepChat.messages.push(...newMessages);
            console.log(`[CLEANUP] Added ${newMessages.length} new messages`);
          }
          
          // Update lastUpdated if merging chat is newer
          if (mergeChat.lastUpdated > keepChat.lastUpdated) {
            keepChat.lastUpdated = mergeChat.lastUpdated;
          }
        }

        // Sort messages by timestamp
        keepChat.messages.sort((a, b) => a.timestamp - b.timestamp);
        await keepChat.save();
        console.log(`[CLEANUP] Chat now has ${keepChat.messages.length} total messages`);

        // Delete duplicate chats
        for (let i = 1; i < chats.length; i++) {
          const mergeChat = chats[i];
          await Chat.deleteOne({ _id: mergeChat._id });
          console.log(`[CLEANUP] Deleted duplicate chat: ${mergeChat.id}`);
          duplicatesFixed++;
        }
      }
    }

    console.log(`[CLEANUP] ✓ Fixed ${duplicatesFixed} duplicate chats`);
    console.log('[CLEANUP] Disconnecting from MongoDB...');
    await mongoose.disconnect();
    console.log('[CLEANUP] Done!');
  } catch (err) {
    console.error('[ERROR] Cleanup failed:', err);
    process.exit(1);
  }
}

cleanupDuplicateChats();
