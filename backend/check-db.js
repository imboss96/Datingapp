import mongoose from 'mongoose';
import User from './models/User.js';

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app');

const count = await User.countDocuments();
console.log('Total users:', count);

const sample = await User.findOne().lean();
if (sample) {
  console.log('Sample user:', JSON.stringify({
    id: sample.id,
    email: sample.email,
    name: sample.name,
    username: sample.username,
    role: sample.role,
    accountType: sample.accountType
  }, null, 2));
} else {
  console.log('No users found');
}

await mongoose.connection.close();
