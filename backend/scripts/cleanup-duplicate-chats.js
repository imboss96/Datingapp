#!/usr/bin/env node
/**
 * Script: cleanup-duplicate-chats.js
 * Removes duplicate chat documents (keeps only the latest per unique pair of participants)
 * Usage: node scripts/cleanup-duplicate-chats.js
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Chat from '../models/Chat.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spark-dating';

async function cleanupDuplicateChats() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✓ Connected to MongoDB');

    // Find all chats
    const allChats = await Chat.find({}).sort({ lastUpdated: -1 });
    console.log(`Found ${allChats.length} total chats`);

    // Group by participants key to find duplicates
    const chatsByParticipantsKey = {};
    const duplicates = [];

    for (const chat of allChats) {
      const key = [...(chat.participants || [])].sort().join(':');

      if (!chatsByParticipantsKey[key]) {
        chatsByParticipantsKey[key] = chat;
      } else {
        // This is a duplicate - we'll keep the one with later lastUpdated
        duplicates.push(chat);
      }
    }

    console.log(`\nFound ${duplicates.length} duplicate chats to remove`);

    if (duplicates.length === 0) {
      console.log('✓ No duplicates found. Database is clean!');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Delete duplicate chats
    const idsToDelete = duplicates.map(c => c._id);
    const result = await Chat.deleteMany({ _id: { $in: idsToDelete } });

    console.log(`✓ Deleted ${result.deletedCount} duplicate chat documents`);

    // Verify deduplication worked
    const remainingChats = await Chat.find({});
    console.log(`\nVerification: ${remainingChats.length} unique chats remain`);

    // Show summary
    console.log('\n=== Deduplication Summary ===');
    Object.entries(chatsByParticipantsKey).forEach(([key, chat]) => {
      const [user1, user2] = key.split(':');
      console.log(`✓ ${user1} ↔ ${user2} (1 chat kept)`);
    });

    await mongoose.connection.close();
    console.log('\n✓ Cleanup complete!');
    process.exit(0);
  } catch (err) {
    console.error('✗ Error during cleanup:', err);
    process.exit(1);
  }
}

cleanupDuplicateChats();
