import mongoose from 'mongoose';
import User from './models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';

async function debugUserLookup() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    const userId = '69a6f73d9d6a7d187f63a943';
    
    console.log(`Testing lookups for userId: ${userId}\n`);
    
    // Try different lookup methods
    console.log('1. Using findOne({ _id: userId }):');
    const user1 = await User.findOne({ _id: userId });
    console.log(`   Result:`, user1 ? `Found: ${user1.name}` : 'NOT FOUND');
    
    console.log('\n2. Using findById(userId):');
    const user2 = await User.findById(userId);
    console.log(`   Result:`, user2 ? `Found: ${user2.name}` : 'NOT FOUND');
    
    console.log('\n3. Using ObjectId conversion:');
    const ObjectId = mongoose.Types.ObjectId;
    const user3 = await User.findOne({ _id: new ObjectId(userId) });
    console.log(`   Result:`, user3 ? `Found: ${user3.name}` : 'NOT FOUND');
    
    console.log('\n4. Count total users:');
    const count = await User.countDocuments();
    console.log(`   Total users: ${count}`);
    
    console.log('\n5. Sample first user data:');
    const sample = await User.findOne({}).select('_id email name');
    if (sample) {
      console.log(`   ID: ${sample._id}`);
      console.log(`   ID type: ${typeof sample._id}`);
      console.log(`   ID string: ${sample._id.toString()}`);
      console.log(`   Email: ${sample.email}`);
      console.log(`   Name: ${sample.name}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

debugUserLookup();
