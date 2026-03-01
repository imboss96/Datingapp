import mongoose from 'mongoose';
import User from './models/User.js';
import { v4 as uuidv4 } from 'uuid';

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app');

console.log('Creating sample users for testing...');

const sampleUsers = [];

// Create 50 sample users for testing
for (let i = 1; i <= 50; i++) {
  sampleUsers.push({
    id: uuidv4(),
    email: `user${i}@test.com`,
    passwordHash: '', // No password for test
    name: `Test User ${i}`,
    username: `testuser${i}`,
    age: 20 + (i % 30),
    bio: `I am test user number ${i}`,
    role: i % 10 === 0 ? 'MODERATOR' : (i % 50 === 0 ? 'ADMIN' : 'USER'),
    accountType: i % 3 === 0 ? 'STANDALONE' : 'APP',
    suspended: i % 20 === 0, // 5% suspended
    suspendedReason: i % 20 === 0 ? 'Test suspension' : null,
    suspendedAt: i % 20 === 0 ? new Date() : null
  });
}

try {
  const result = await User.insertMany(sampleUsers);
  console.log(`✓ Created ${result.length} sample users`);
  
  const counts = await Promise.all([
    User.countDocuments({ role: 'USER' }),
    User.countDocuments({ role: 'MODERATOR' }),
    User.countDocuments({ role: 'ADMIN' }),
    User.countDocuments({ accountType: 'APP' }),
    User.countDocuments({ accountType: 'STANDALONE' }),
    User.countDocuments({ suspended: true })
  ]);
  
  console.log('\nUser breakdown:');
  console.log(`  Users: ${counts[0]}`);
  console.log(`  Moderators: ${counts[1]}`);
  console.log(`  Admins: ${counts[2]}`);
  console.log(`  APP accounts: ${counts[3]}`);
  console.log(`  STANDALONE accounts: ${counts[4]}`);
  console.log(`  Suspended: ${counts[5]}`);
} catch (error) {
  console.error('Error creating users:', error.message);
}

await mongoose.connection.close();
console.log('\nDone!');
