import mongoose from 'mongoose';
import User from './models/User.js';

async function resetSwipes() {
  try {
    // Connect to MongoDB (adjust connection string if needed)
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spark-dating');

    // The test user ID from logs: OBOKO JAVAN
    const testUserId = '1b84d309-4c6c-4935-9a9b-d5aa090ee43c';

    // Reset swipes and matches arrays
    const result = await User.updateOne(
      { id: testUserId },
      {
        $set: {
          swipes: [],
          matches: []
        }
      }
    );

    console.log('Reset swipes for test user:', result);

    // Close connection
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error resetting swipes:', error);
  }
}

resetSwipes();