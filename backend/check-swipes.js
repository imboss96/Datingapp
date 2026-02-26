import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkSwipes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({}, 'id name swipes matches');
    console.log('User swipes and matches:');
    users.forEach(u => {
      console.log(`${u.id}: swipes=${u.swipes.length}, matches=${u.matches.length}`);
    });
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}
checkSwipes();