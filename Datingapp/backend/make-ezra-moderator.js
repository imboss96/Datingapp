import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

async function makeEzraModerator() {
  try {
    console.log('[UPDATE] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[UPDATE] Connected to MongoDB\n');

    // Find Ezra Bosire
    const ezra = await User.findOne({ name: /ezra/i });
    
    if (!ezra) {
      console.log('[UPDATE] ERROR: Ezra Bosire not found\n');
      await mongoose.disconnect();
      return;
    }

    console.log(`[UPDATE] Found Ezra Bosire:`);
    console.log(`  ID: ${ezra.id}`);
    console.log(`  Current Role: ${ezra.role}`);
    console.log(`  Name: ${ezra.name}`);
    
    if (ezra.role === 'MODERATOR' || ezra.role === 'ADMIN') {
      console.log('\n[UPDATE] ✓ Ezra is already a moderator!\n');
      await mongoose.disconnect();
      return;
    }

    // Update role to MODERATOR
    ezra.role = 'MODERATOR';
    await ezra.save();
    
    console.log(`\n[UPDATE] ✓ Successfully updated Ezra's role to MODERATOR`);
    console.log(`  New Role: ${ezra.role}\n`);

    await mongoose.disconnect();
    console.log('[UPDATE] Done!');
  } catch (err) {
    console.error('[ERROR]:', err);
    process.exit(1);
  }
}

makeEzraModerator();
