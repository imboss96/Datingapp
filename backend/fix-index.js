import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lunesa';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✓ Connected to MongoDB');
  
  try {
    const db = mongoose.connection.db;
    if (db) {
      // Drop the entire chats collection to remove all bad indexes
      await db.dropCollection('chats');
      console.log('[SUCCESS] Dropped chats collection completely - indexes reset');
    }
  } catch (err) {
    console.error('[ERROR] Failed to drop collection:', err.message);
  }
  
  // Close connection
  await mongoose.connection.close();
  console.log('✓ Database connection closed');
  process.exit(0);
})
.catch((err) => {
  console.error('✗ MongoDB connection error:', err);
  process.exit(1);
});
