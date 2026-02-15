import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Chat from './models/Chat.js';

dotenv.config();

async function findEzra() {
  try {
    console.log('[FIND] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[FIND] Connected to MongoDB\n');

    // Find Ezra Bosire
    const ezra = await User.findOne({ name: /ezra/i });
    
    if (!ezra) {
      console.log('[FIND] Ezra Bosire not found. Searching all users...\n');
      const allUsers = await User.find({});
      console.log('[FIND] All users:');
      allUsers.forEach(u => {
        console.log(`  ${u.id}: ${u.name}`);
      });
      await mongoose.disconnect();
      return;
    }

    console.log(`[FIND] Found Ezra Bosire:`);
    console.log(`  ID: ${ezra.id}`);
    console.log(`  Name: ${ezra.name}`);
    console.log(`  Role: ${ezra.role}\n`);

    // Find all chats involving Ezra
    const ezrasChats = await Chat.find({ participants: ezra.id });
    console.log(`[FIND] Ezra is in ${ezrasChats.length} chats:\n`);

    // Group by other participant
    const chatsByOtherUser = {};
    
    for (const chat of ezrasChats) {
      const otherUserId = chat.participants.find(p => p !== ezra.id);
      
      if (!chatsByOtherUser[otherUserId]) {
        chatsByOtherUser[otherUserId] = [];
      }
      chatsByOtherUser[otherUserId].push(chat);
    }

    // Display grouped chats
    for (const [otherUserId, chats] of Object.entries(chatsByOtherUser)) {
      const otherUser = await User.findOne({ id: otherUserId });
      const otherName = otherUser?.name || otherUserId;
      
      console.log(`  ${otherName} (ID: ${otherUserId})`);
      
      if (chats.length > 1) {
        console.log(`    ⚠️  DUPLICATE: ${chats.length} separate chats!`);
      }
      
      chats.forEach((chat, idx) => {
        const lastMsg = chat.messages[chat.messages.length - 1];
        const lastMsgText = lastMsg?.text?.substring(0, 30) || '(no messages)';
        const lastMsgTime = lastMsg ? new Date(lastMsg.timestamp).toLocaleString() : 'N/A';
        
        console.log(`      [${idx + 1}] Chat ID: ${chat.id.substring(0, 8)}...`);
        console.log(`          Messages: ${chat.messages.length}`);
        console.log(`          Last message: "${lastMsgText}" (${lastMsgTime})`);
        console.log(`          Key: ${chat.participantsKey}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n[FIND] Done!');
  } catch (err) {
    console.error('[ERROR]:', err);
    process.exit(1);
  }
}

findEzra();
