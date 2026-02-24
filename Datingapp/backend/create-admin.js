import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

async function createAdminUser() {
  try {
    console.log('[ADMIN] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[ADMIN] Connected to MongoDB\n');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'ADMIN' });
    if (existingAdmin) {
      console.log('[ADMIN] Admin user already exists:');
      console.log(`  Name: ${existingAdmin.name}`);
      console.log(`  Email: ${existingAdmin.email}`);
      console.log(`  Role: ${existingAdmin.role}\n`);
      await mongoose.disconnect();
      return;
    }

    // Create admin user
    const passwordHash = await bcrypt.hash('admin123', 10);
    const userId = uuidv4();

    const adminUser = new User({
      id: userId,
      email: 'admin@datingapp.com',
      passwordHash,
      name: 'Admin User',
      username: 'admin',
      age: 30,
      location: 'System Admin',
      role: 'ADMIN',
      interests: ['System Administration'],
      coins: 999,
      isPremium: true,
      termsOfServiceAccepted: true,
      privacyPolicyAccepted: true,
      cookiePolicyAccepted: true,
      emailVerified: true,
      isPhotoVerified: true,
      trustScore: 100
    });

    await adminUser.save();

    console.log('[ADMIN] ✓ Admin user created successfully!');
    console.log(`  Name: ${adminUser.name}`);
    console.log(`  Email: ${adminUser.email}`);
    console.log(`  Password: admin123`);
    console.log(`  Role: ${adminUser.role}\n`);

    await mongoose.disconnect();
    console.log('[ADMIN] Done!');
  } catch (err) {
    console.error('[ERROR]:', err);
    process.exit(1);
  }
}

createAdminUser();