import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function testQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Simulate the query that would be run for the test user
    const q = { id: { $ne: '6603b2ce-2780-40c8-8da8-f17664e09031' } };
    const users = await User.find(q).select('-passwordHash -email -googleId').limit(10);

    console.log('Query result count:', users.length);
    console.log('First few users:');
    users.slice(0, 3).forEach((u, i) => {
      console.log(`  ${i+1}. ${u.name} (${u.id})`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testQuery();