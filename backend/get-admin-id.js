import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';

mongoose.connect(mongoUri).then(async () => {
  try {
    const admin = await User.findOne({ role: 'ADMIN' });
    
    if (admin) {
      console.log('\nAdmin User Found:');
      console.log('  ID:', admin.id);
      console.log('  Name:', admin.name);
      console.log('  Email:', admin.email);
      console.log('  Role:', admin.role);
      console.log('  AccountType:', admin.accountType);
    } else {
      console.log('No admin found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}).catch(error => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});
