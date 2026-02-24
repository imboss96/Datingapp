import mongoose from 'mongoose';
import fs from 'fs';
import User from './models/User.js';
import Chat from './models/Chat.js';
import Report from './models/Report.js';

// IMPORTANT: Replace this with your MongoDB Atlas connection string
const ATLAS_URI = process.env.MONGODB_URI_ATLAS || 'mongodb+srv://username:password@cluster.mongodb.net/lunesa';

async function importData() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    console.log('Connection URI:', ATLAS_URI.replace(/:[^:]*@/g, ':****@'));
    
    await mongoose.connect(ATLAS_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ Connected to MongoDB Atlas');

    // Clear existing data (optional - remove this if you want to keep existing data)
    console.log('\nClearing existing collections...');
    await User.deleteMany({});
    await Chat.deleteMany({});
    await Report.deleteMany({});
    console.log('✓ Collections cleared');

    // Import users
    console.log('\nImporting users...');
    const usersData = JSON.parse(fs.readFileSync('export_users.json', 'utf-8'));
    const importedUsers = await User.insertMany(usersData);
    console.log(`✓ Imported ${importedUsers.length} users`);

    // Import chats
    console.log('\nImporting chats...');
    if (fs.existsSync('export_chats.json')) {
      const chatsData = JSON.parse(fs.readFileSync('export_chats.json', 'utf-8'));
      if (chatsData.length > 0) {
        const importedChats = await Chat.insertMany(chatsData);
        console.log(`✓ Imported ${importedChats.length} chats`);
      } else {
        console.log('✓ No chats to import');
      }
    }

    // Import reports
    console.log('\nImporting reports...');
    if (fs.existsSync('export_reports.json')) {
      const reportsData = JSON.parse(fs.readFileSync('export_reports.json', 'utf-8'));
      if (reportsData.length > 0) {
        const importedReports = await Report.insertMany(reportsData);
        console.log(`✓ Imported ${importedReports.length} reports`);
      } else {
        console.log('✓ No reports to import');
      }
    }

    console.log('\n✓ All data imported to MongoDB Atlas successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error importing data:', err.message);
    process.exit(1);
  }
}

importData();
