import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';

mongoose.connect(mongoUri).then(async () => {
  try {
    console.log('\n=== ALL USERS WITH MODERATOR/ADMIN ROLE ===\n');
    
    const adminsAndMods = await User.find({
      role: { $in: ['MODERATOR', 'ADMIN'] }
    }).select('id name email username role accountType createdAt');
    
    console.log(`Total found: ${adminsAndMods.length}\n`);
    
    adminsAndMods.forEach(user => {
      console.log(`Name: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  AccountType: ${user.accountType || 'NOT SET'}`);
      console.log(`  ID: ${user.id}`);
      console.log('');
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
