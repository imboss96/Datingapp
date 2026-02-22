import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chat from './models/Chat.js';
import User from './models/User.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

async function testMessageSend() {
  try {
    console.log('[TEST] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[TEST] Connected\n');

    // Get 2 test users
    const user1 = await User.findOne({ email: 'admin@datingapp.com' });
    const allUsers = await User.find({}).limit(5);
    const user2 = allUsers.find(u => u.id !== user1?.id);

    if (!user1 || !user2) {
      console.log('ERROR: Could not find test users');
      process.exit(1);
    }

    console.log('[TEST] User 1:', user1.email, user1.id);
    console.log('[TEST] User 2:', user2.email, user2.id, '\n');

    // Create a test chat with proper participantsKey
    const chatId = uuidv4();
    const participants = [user1.id, user2.id].sort();
    const participantsKey = participants.join('_');
    
    const chat = new Chat({
      id: chatId,
      participants: [user1.id, user2.id],
      participantsKey,
      messages: [],
      lastUpdated: Date.now(),
      requestStatus: 'pending',
      requestInitiator: user1.id
    });

    await chat.save();
    console.log('[TEST] Chat created:', chatId, '\n');

    // Send a message
    const messageId = uuidv4();
    const message = {
      id: messageId,
      senderId: user1.id,
      text: 'Test message',
      timestamp: Date.now(),
      isFlagged: false
    };

    chat.messages.push(message);
    await chat.save();
    console.log('[TEST] Message sent. Chat now has', chat.messages.length, 'messages\n');

    // Retrieve the chat and check messages
    const retrievedChat = await Chat.findOne({ id: chatId });
    console.log('[TEST] Retrieved chat from DB');
    console.log('[TEST] Messages in DB:', retrievedChat?.messages?.length || 0);
    if (retrievedChat?.messages && retrievedChat.messages.length > 0) {
      console.log('[TEST] First message:', {
        id: retrievedChat.messages[0].id,
        text: retrievedChat.messages[0].text,
        senderId: retrievedChat.messages[0].senderId
      });
    }

    await mongoose.disconnect();
    console.log('\n[TEST] ✓ Test completed successfully');
  } catch (err) {
    console.error('[ERROR]:', err.message);
    process.exit(1);
  }
}

testMessageSend();