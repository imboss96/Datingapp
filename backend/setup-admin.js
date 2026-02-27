#!/usr/bin/env node
/**
 * Make a user an admin or moderator
 * Usage:
 *   node setup-admin.js <email> [admin|moderator]
 * 
 * Examples:
 *   node setup-admin.js admin@example.com admin
 *   node setup-admin.js mod@example.com moderator
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const args = process.argv.slice(2);
const email = args[0];
const role = (args[1] || 'admin').toUpperCase();

if (!email) {
  console.error('❌ Usage: node setup-admin.js <email> [ADMIN|MODERATOR]');
  console.error('');
  console.error('Examples:');
  console.error('  node setup-admin.js admin@example.com ADMIN');
  console.error('  node setup-admin.js mod@example.com MODERATOR');
  process.exit(1);
}

if (!['ADMIN', 'MODERATOR'].includes(role)) {
  console.error(`❌ Invalid role: ${role}. Use ADMIN or MODERATOR`);
  process.exit(1);
}

async function setupAdmin() {
  try {
    console.log(`\n🔧 Setting up ${role} role...\n`);

    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/spark-dating';
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      await mongoose.disconnect();
      process.exit(1);
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    console.log(`✅ User role updated: ${oldRole} → ${role}`);
    console.log(`📄 Email: ${user.email}`);
    console.log(`👤 Name: ${user.name}`);
    console.log(`🆔 ID: ${user.id}`);
    console.log(`📅 Created: ${user.createdAt.toLocaleDateString()}`);
    console.log('\n✨ User is now ' + role + '!\n');
    console.log('🎯 Next steps:');
    console.log('  1. Restart the backend: npm run dev');
    console.log('  2. Restart the frontend: npm run dev');
    console.log('  3. Logout and login with this email');
    console.log('  4. Click the Shield icon to access Moderator Panel');
    console.log('  5. Go to "Verifications" tab\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

setupAdmin();
