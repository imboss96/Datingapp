import mongoose from 'mongoose';
import fs from 'fs';
import User from './models/User.js';
import Chat from './models/Chat.js';
import Report from './models/Report.js';

const MONGODB_URI = 'mongodb://localhost:27017/lunesa_local';

async function exportData() {
  try {
    console.log('Connecting to local MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ Connected to local MongoDB');

    // Export users
    console.log('\nExporting users...');
    const users = await User.find({});
    console.log(`Found ${users.length} users`);
    fs.writeFileSync('export_users.json', JSON.stringify(users, null, 2));
    console.log('✓ Users exported to export_users.json');

    // Export chats
    console.log('\nExporting chats...');
    const chats = await Chat.find({});
    console.log(`Found ${chats.length} chats`);
    fs.writeFileSync('export_chats.json', JSON.stringify(chats, null, 2));
    console.log('✓ Chats exported to export_chats.json');

    // Export reports
    console.log('\nExporting reports...');
    const reports = await Report.find({});
    console.log(`Found ${reports.length} reports`);
    fs.writeFileSync('export_reports.json', JSON.stringify(reports, null, 2));
    console.log('✓ Reports exported to export_reports.json');

    console.log('\n✓ All data exported successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error exporting data:', err);
    process.exit(1);
  }
}

exportData();
