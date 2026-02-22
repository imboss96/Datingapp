import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

async function checkAdmin() {
  try {
    console.log('[CHECK] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[CHECK] Connected to MongoDB\n');

    const admin = await User.findOne({ email: 'admin@datingapp.com' });
    if (admin) {
      console.log('Admin user found:');
      console.log(`  ID: ${admin.id}`);
      console.log(`  Name: ${admin.name}`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Role: ${admin.role}`);
      console.log(`  Role Type: ${typeof admin.role}`);
    } else {
      console.log('Admin user not found');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkAdmin();