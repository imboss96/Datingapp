#!/usr/bin/env node
/**
 * Script: find-missing-users.js
 * Scans `chats` collection for participant IDs missing from `users` collection.
 * Usage: node scripts/find-missing-users.js
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Chat from '../models/Chat.js';
import User from '../models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spark-dating';

async function main() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const chats = await Chat.find({}, { participants: 1 }).lean();
  const allParticipantIds = new Set();
  chats.forEach(c => {
    (c.participants || []).forEach(id => allParticipantIds.add(id));
  });

  console.log('Total unique participant IDs in chats:', allParticipantIds.size);

  const ids = Array.from(allParticipantIds);
  const existingUsers = await User.find({ id: { $in: ids } }, { id: 1 }).lean();
  const existingIds = new Set(existingUsers.map(u => u.id));

  const missing = ids.filter(id => !existingIds.has(id));
  console.log('Missing user IDs referenced by chats:', missing.length);
  missing.forEach(id => console.log('-', id));

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
