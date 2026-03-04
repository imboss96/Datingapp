import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import User from './models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';

async function createTestUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Try to find existing test user
    let user = await User.findOne({ email: 'test@example.com' });
    
    if (user) {
      console.log('✓ Existing test user found (reusing):');
      console.log('  ID:', user._id.toString());
      console.log('  Email:', user.email);
      console.log('  Name:', user.name);
      console.log('');
      console.log('Use this user ID for payment tests:');
      console.log(`  userId: "${user._id.toString()}"`);
      process.exit(0);
    }

    // Create a new test user with unique email
    const timestamp = Date.now();
    const uniqueEmail = `test-${timestamp}@example.com`;
    
    const testUser = new User({
      id: uuidv4(),
      email: uniqueEmail,
      name: 'Test User',
      username: `testuser${timestamp}`,
      password: 'hashed_password',
      phone: '+1234567890',
      gender: 'male',
      age: 25,
      country: 'Kenya',
      city: 'Nairobi',
      coins: 0,
      isPremium: false
    });

    const saved = await testUser.save();
    console.log('✓ New test user created:');
    console.log('  ID:', saved._id.toString());
    console.log('  Email:', saved.email);
    console.log('  Name:', saved.name);
    console.log('');
    console.log('Use this user ID for payment tests:');
    console.log(`  userId: "${saved._id.toString()}"`);

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

createTestUser();
