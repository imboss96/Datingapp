import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chat from './models/Chat.js';
import User from './models/User.js';

dotenv.config();

async function consolidateDuplicateChats() {
  try {
    console.log('[CONSOLIDATE] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[CONSOLIDATE] Connected to MongoDB\n');

    // Step 1: Get all unique participants from chats
    const allChats = await Chat.find({});
    const allParticipants = new Set();
    allChats.forEach(chat => {
      chat.participants.forEach(p => allParticipants.add(p));
    });

    console.log(`[CONSOLIDATE] Found ${allChats.length} chats with ${allParticipants.size} unique participants\n`);

    // Step 2: Normalize all participant keys
    console.log('[CONSOLIDATE] Normalizing all participantsKey values...\n');
    let normalized = 0;
    
    for (const chat of allChats) {
      const sortedParticipants = chat.participants.slice().sort();
      const newKey = sortedParticipants.join('_');
      
      if (chat.participantsKey !== newKey) {
        console.log(`  Chat ${chat.id}: "${chat.participantsKey}" -> "${newKey}"`);
        chat.participantsKey = newKey;
        await chat.save();
        normalized++;
      }
    }
    
    console.log(`\n[CONSOLIDATE] Normalized ${normalized} chats\n`);

    // Step 3: Find and consolidate duplicates using the same participant pair
    console.log('[CONSOLIDATE] Scanning for duplicate conversations...\n');
    
    const freshChats = await Chat.find({});
    const chatsByKey = {};
    
    freshChats.forEach(chat => {
      if (!chatsByKey[chat.participantsKey]) {
        chatsByKey[chat.participantsKey] = [];
      }
      chatsByKey[chat.participantsKey].push(chat);
    });

    let duplicatesFixed = 0;
    let totalMessagesConsolidated = 0;

    for (const [key, chats] of Object.entries(chatsByKey)) {
      if (chats.length > 1) {
        console.log(`\n  ✗ DUPLICATE FOUND: ${key}`);
        console.log(`    Count: ${chats.length} chats`);
        
        // Sort by lastUpdated (most recent first) to keep the most active one
        chats.sort((a, b) => b.lastUpdated - a.lastUpdated);
        
        const keepChat = chats[0];
        console.log(`    Keeping: Chat ${keepChat.id} (${keepChat.messages.length} messages, last updated: ${new Date(keepChat.lastUpdated).toISOString()})`);

        // Merge messages from all other chats
        const existingMessageIds = new Set(keepChat.messages.map(m => m.id || m._id.toString()));
        
        for (let i = 1; i < chats.length; i++) {
          const mergeChat = chats[i];
          console.log(`    Merging: Chat ${mergeChat.id} (${mergeChat.messages.length} messages)`);
          
          // Add unique messages
          const newMessages = mergeChat.messages.filter(msg => {
            const msgId = msg.id || msg._id.toString();
            return !existingMessageIds.has(msgId);
          });
          
          if (newMessages.length > 0) {
            keepChat.messages.push(...newMessages);
            totalMessagesConsolidated += newMessages.length;
            console.log(`      Added ${newMessages.length} new messages`);
          }
          
          // Update timestamp if needed
          if (mergeChat.lastUpdated > keepChat.lastUpdated) {
            keepChat.lastUpdated = mergeChat.lastUpdated;
          }
        }

        // Sort messages chronologically
        keepChat.messages.sort((a, b) => a.timestamp - b.timestamp);
        await keepChat.save();
        console.log(`    Result: ${keepChat.messages.length} total messages in consolidated chat`);

        // Delete duplicate chats
        for (let i = 1; i < chats.length; i++) {
          const mergeChat = chats[i];
          await Chat.deleteOne({ _id: mergeChat._id });
          console.log(`    Deleted: Chat ${mergeChat.id}`);
          duplicatesFixed++;
        }
      }
    }

    console.log(`\n[CONSOLIDATE] ✓ Consolidation complete!`);
    console.log(`  - Fixed ${duplicatesFixed} duplicate chats`);
    console.log(`  - Consolidated ${totalMessagesConsolidated} messages`);
    console.log(`  - Total chats remaining: ${await Chat.countDocuments()}\n`);

    await mongoose.disconnect();
    console.log('[CONSOLIDATE] Done!');
  } catch (err) {
    console.error('[ERROR] Consolidation failed:', err);
    process.exit(1);
  }
}

consolidateDuplicateChats();
