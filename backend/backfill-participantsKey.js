import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Chat from './models/Chat.js';

dotenv.config();

async function backfill() {
  try {
    console.log('[BACKFILL] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[BACKFILL] Connected to MongoDB');

    const all = await Chat.find({});
    console.log(`[BACKFILL] Found ${all.length} chats`);

    let updated = 0;
    for (const chat of all) {
      let changed = false;
      if (!chat.participantsKey) {
        chat.participantsKey = (chat.participants || []).slice().sort().join('_');
        changed = true;
      }
      if (!chat.unreadCounts) {
        chat.unreadCounts = {};
        changed = true;
      }
      if (!chat.lastOpened) {
        chat.lastOpened = {};
        changed = true;
      }
      if (changed) {
        await chat.save();
        updated++;
        console.log('[BACKFILL] Updated chat:', chat.id);
      }
    }

    console.log(`[BACKFILL] ✓ Updated ${updated} chats`);
    await mongoose.disconnect();
    console.log('[BACKFILL] Done');
  } catch (err) {
    console.error('[ERROR] Backfill failed:', err);
    process.exit(1);
  }
}

backfill();
