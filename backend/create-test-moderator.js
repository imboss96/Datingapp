#!/usr/bin/env node
/**
 * Create a test moderator account
 * Usage:
 *   node create-test-moderator.js
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function createTestModerator() {
  try {
    console.log('\n🔧 Creating test moderator account...\n');

    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/spark-dating';
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    // Check if moderator already exists
    const existing = await User.findOne({ email: 'moderator@test.com' });
    if (existing) {
      console.log('ℹ️  Test moderator already exists!');
      console.log(`📧 Email: ${existing.email}`);
      console.log(`🔑 Password: moderator123`);
      console.log(`👤 Name: ${existing.name}`);
      console.log(`🎭 Role: ${existing.role}\n`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create test moderator
    const password = 'moderator123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const moderator = new User({
      id: uuidv4(),
      email: 'moderator@test.com',
      passwordHash: hashedPassword,
      name: 'Test Moderator',
      username: 'test_moderator',
      age: 30,
      location: 'Test City',
      bio: 'Test moderator for photo verification',
      role: 'MODERATOR',
      isPremium: false,
      coins: 100,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      termsOfServiceAccepted: true,
      privacyPolicyAccepted: true,
      cookiePolicyAccepted: true,
      legalAcceptanceDate: new Date(),
      coordinates: {
        type: 'Point',
        coordinates: [-73.9857, 40.7484]
      }
    });

    await moderator.save();

    console.log('✅ Test moderator created successfully!\n');
    console.log('📧 Email: moderator@test.com');
    console.log('🔑 Password: moderator123');
    console.log('👤 Name: Test Moderator');
    console.log('🎭 Role: MODERATOR\n');
    console.log('🎯 Next steps:');
    console.log('  1. Restart the backend: npm run dev');
    console.log('  2. Restart the frontend: npm run dev');
    console.log('  3. Login with:');
    console.log('     Email: moderator@test.com');
    console.log('     Password: moderator123');
    console.log('  4. Click the Shield icon to access Moderator Panel');
    console.log('  5. Go to "Verifications" tab\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('email')) {
      console.error('⚠️  Email might already be in use');
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

createTestModerator();
