import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chat from './models/Chat.js';

dotenv.config();

async function fixParticipantsKey() {
  try {
    console.log('[FIX] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[FIX] Connected to MongoDB');

    // Get all chats
    const allChats = await Chat.find({});
    console.log(`[FIX] Found ${allChats.length} total chats`);

    let updated = 0;
    let duplicatesFound = 0;

    // Fix participantsKey for all chats
    for (const chat of allChats) {
      const sortedParticipants = chat.participants.slice().sort();
      const expectedKey = sortedParticipants.join('_');

      if (!chat.participantsKey || chat.participantsKey !== expectedKey) {
        console.log(`[FIX] Updating chat ${chat.id}: participantsKey was "${chat.participantsKey}", setting to "${expectedKey}"`);
        chat.participantsKey = expectedKey;
        await chat.save();
        updated++;
      }
    }

    console.log(`[FIX] Updated ${updated} chats with proper participantsKey`);

    // Now find actual duplicates by participantsKey
    const chatsByKey = {};
    const allChatsAfterFix = await Chat.find({});
    
    allChatsAfterFix.forEach(chat => {
      if (!chatsByKey[chat.participantsKey]) {
        chatsByKey[chat.participantsKey] = [];
      }
      chatsByKey[chat.participantsKey].push(chat);
    });

    // Merge any remaining duplicates
    for (const [key, chats] of Object.entries(chatsByKey)) {
      if (chats.length > 1) {
        console.log(`[FIX] Found ${chats.length} duplicate chats for key: ${key}`);
        duplicatesFound += chats.length - 1;
        
        // Sort chats by lastUpdated timestamp (newest first)
        chats.sort((a, b) => b.lastUpdated - a.lastUpdated);
        
        // Keep the chat with the most recent update
        const keepChat = chats[0];
        console.log(`[FIX] Keeping chat: ${keepChat.id} (${keepChat.messages.length} messages)`);

        // Merge messages from other chats
        for (let i = 1; i < chats.length; i++) {
          const mergeChat = chats[i];
          console.log(`[FIX] Merging chat: ${mergeChat.id} (${mergeChat.messages.length} messages)`);
          
          // Add messages that don't already exist
          const existingMessageIds = new Set(keepChat.messages.map(m => m.id || m._id.toString()));
          const newMessages = mergeChat.messages.filter(msg => !existingMessageIds.has(msg.id || msg._id.toString()));
          
          if (newMessages.length > 0) {
            keepChat.messages.push(...newMessages);
            console.log(`[FIX] Added ${newMessages.length} new messages`);
          }
          
          // Update lastUpdated if merging chat is newer
          if (mergeChat.lastUpdated > keepChat.lastUpdated) {
            keepChat.lastUpdated = mergeChat.lastUpdated;
          }
        }

        // Sort messages by timestamp
        keepChat.messages.sort((a, b) => a.timestamp - b.timestamp);
        await keepChat.save();
        console.log(`[FIX] Chat now has ${keepChat.messages.length} total messages`);

        // Delete duplicate chats
        for (let i = 1; i < chats.length; i++) {
          const mergeChat = chats[i];
          await Chat.deleteOne({ _id: mergeChat._id });
          console.log(`[FIX] Deleted duplicate chat: ${mergeChat.id}`);
        }
      }
    }

    console.log(`[FIX] ✓ Fixed participants keys and merged ${duplicatesFound} duplicate chats`);
    console.log('[FIX] Disconnecting from MongoDB...');
    await mongoose.disconnect();
    console.log('[FIX] Done!');
  } catch (err) {
    console.error('[ERROR] Fix failed:', err);
    process.exit(1);
  }
}

fixParticipantsKey();
