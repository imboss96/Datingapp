import mongoose from 'mongoose';
import User from './models/User.js';

async function findUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spark-dating');

    const user = await User.findOne({ id: '1b84d309-4c6c-4935-9a9b-d5aa090ee43c' });
    if (user) {
      console.log('User found:', {
        id: user.id,
        name: user.name,
        username: user.username,
        swipes: user.swipes?.length || 0,
        matches: user.matches?.length || 0
      });
    } else {
      console.log('User not found');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

findUser();