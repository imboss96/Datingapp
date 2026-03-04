import mongoose from 'mongoose';
import User from './backend/models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';

async function createTestUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Create a test user
    const testUser = new User({
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
      password: 'hashed_password', // In real app, would be bcrypt hashed
      phone: '+1234567890',
      gender: 'male',
      age: 25,
      country: 'Kenya',
      city: 'Nairobi',
      coins: 0,
      isPremium: false
    });

    const saved = await testUser.save();
    console.log('✓ Test user created:');
    console.log('  ID:', saved._id.toString());
    console.log('  Email:', saved.email);
    console.log('  Name:', saved.name);
    console.log('');
    console.log('Now you can use this user ID in your payment tests:');
    console.log(`  userId: "${saved._id.toString()}"`);

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

createTestUser();
