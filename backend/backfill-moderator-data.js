import mongoose from 'mongoose';
import Chat from './models/Chat.js';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';

mongoose.connect(mongoUri).then(async () => {
  try {
    console.log('\n=== BACKFILLING MODERATOR DATA FOR REPLIED CHATS ===\n');
    
    // Get the admin user
    const admin = await User.findOne({ role: 'ADMIN' });
    if (!admin) {
      console.error('No admin user found. Please create an admin first.');
      process.exit(1);
    }
    
    console.log(`Admin found: ${admin.name} (${admin.email})`);
    console.log(`Admin ID: ${admin.id}\n`);
    
    // Find all replied chats without an assignedModerator
    const repliedChats = await Chat.find({
      $or: [
        { isReplied: true },
        { replyStatus: 'replied' }
      ],
      assignedModerator: { $exists: false }
    });
    
    console.log(`Found ${repliedChats.length} replied chats without moderator assignment\n`);
    
    if (repliedChats.length === 0) {
      console.log('✓ No chats need updating');
      process.exit(0);
    }
    
    // Update all these chats with the admin as moderator
    const updateResult = await Chat.updateMany(
      {
        $or: [
          { isReplied: true },
          { replyStatus: 'replied' }
        ],
        assignedModerator: { $exists: false }
      },
      {
        $set: { assignedModerator: admin.id }
      }
    );
    
    console.log(`Updated ${updateResult.modifiedCount} chats with moderator assignment`);
    console.log(`\nBackfill complete! Now when you view the PENDING tab, chats will be grouped by moderator.\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}).catch(error => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});
