import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';

mongoose.connect(mongoUri).then(async () => {
  try {
    // Test the exact query from the endpoint
    console.log('\n=== TESTING ONBOARDED QUERY ===\n');
    
    const query = {
      accountType: 'APP',
      role: { $in: ['MODERATOR', 'ADMIN'] }
    };
    
    console.log('Query:', JSON.stringify(query, null, 2));
    
    const results = await User.find(query).select('id name email username role accountType createdAt');
    
    console.log('Results count:', results.length);
    console.log('\nResults:');
    results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.name} (${r.email}) - ${r.role} - ${r.accountType}`);
    });
    
    // Also show all users for reference
    console.log('\n=== ALL USERS WITH ROLES ===\n');
    const allUsers = await User.find({}).select('name email role accountType');
    console.log(`Total users: ${allUsers.length}`);
    allUsers.slice(0, 10).forEach((u, i) => {
      console.log(`${i + 1}. ${u.name} (${u.email}) - Role: ${u.role}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}).catch(error => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});
