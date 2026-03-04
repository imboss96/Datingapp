import mongoose from 'mongoose';
import User from './models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';

async function listRealUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Get first 10 real users
    const users = await User.find({}).limit(10).select('_id email name coins isPremium createdAt');
    
    if (users.length === 0) {
      console.log('✗ No users found in the database');
      process.exit(1);
    }

    console.log(`Found ${users.length} real users:\n`);
    users.forEach((user, index) => {
      console.log(`[${index + 1}] ${user.name}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    ID: ${user._id.toString()}`);
      console.log(`    Coins: ${user.coins}`);
      console.log(`    Premium: ${user.isPremium ? 'Yes' : 'No'}`);
      console.log('');
    });

    console.log('Pick any user ID above to test coin purchases.');
    console.log('Example:');
    console.log(`  userId: "${users[0]._id.toString()}"`);
    console.log(`  email: "${users[0].email}"`);

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

listRealUsers();
