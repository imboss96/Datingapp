import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chat from './models/Chat.js';

dotenv.config();

async function diagnosticCheck() {
  try {
    console.log('[DIAG] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[DIAG] Connected to MongoDB');

    // Get all chats
    const allChats = await Chat.find({});
    console.log(`\n[DIAG] Total chats in database: ${allChats.length}\n`);

    // Group by participantsKey to see duplicates
    const chatsByKey = {};
    allChats.forEach(chat => {
      if (!chatsByKey[chat.participantsKey]) {
        chatsByKey[chat.participantsKey] = [];
      }
      chatsByKey[chat.participantsKey].push(chat);
    });

    console.log('[DIAG] Chats grouped by participantsKey:');
    for (const [key, chats] of Object.entries(chatsByKey)) {
      console.log(`\n  Key: ${key}`);
      console.log(`  Count: ${chats.length}`);
      chats.forEach((chat, idx) => {
        console.log(`    [${idx}] Chat ID: ${chat.id}, Messages: ${chat.messages.length}, LastUpdated: ${new Date(chat.lastUpdated).toISOString()}`);
      });
    }

    // Show per-user distribution
    console.log('\n\n[DIAG] Participant distribution:');
    const participantCounts = {};
    allChats.forEach(chat => {
      chat.participants.forEach(p => {
        if (!participantCounts[p]) {
          participantCounts[p] = 0;
        }
        participantCounts[p]++;
      });
    });
    Object.entries(participantCounts).forEach(([user, count]) => {
      console.log(`  ${user}: ${count} chats`);
    });

    console.log('\n[DIAG] Disconnecting from MongoDB...');
    await mongoose.disconnect();
  } catch (err) {
    console.error('[ERROR] Diagnostic failed:', err);
    process.exit(1);
  }
}

diagnosticCheck();
