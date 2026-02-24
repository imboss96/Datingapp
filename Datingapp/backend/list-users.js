import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

async function listAllUsers() {
  try {
    console.log('[LIST] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[LIST] Connected to MongoDB\n');

    const users = await User.find({});
    console.log(`[LIST] Total users: ${users.length}\n`);
    console.log('ID | Name | Username | Role');
    console.log('-'.repeat(80));
    
    users.forEach(u => {
      const id = u.id.substring(0, 12) + '...';
      const name = u.name || 'N/A';
      const username = u.username || 'N/A';
      const role = u.role || 'USER';
      console.log(`${id} | ${name} | ${username} | ${role}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('[ERROR]:', err);
    process.exit(1);
  }
}

listAllUsers();
