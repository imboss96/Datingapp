import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chat from './models/Chat.js';

dotenv.config();

async function listChats() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const chats = await Chat.find({});
    console.log('Total chats:', chats.length, '\n');
    
    chats.forEach(chat => {
      console.log('Chat ID:', chat.id);
      console.log('  Participants:', chat.participants);
      console.log('  ParticipantsKey:', chat.participantsKey);
      console.log('  Messages:', chat.messages?.length || 0);
      if (chat.messages && chat.messages.length > 0) {
        console.log('  Last message:', {
          text: chat.messages[chat.messages.length - 1].text,
          from: chat.messages[chat.messages.length - 1].senderId
        });
      }
      console.log('  Support Status:', chat.supportStatus);
      console.log('  Assigned Moderator:', chat.assignedModerator || 'None');
      console.log('---');
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

listChats();