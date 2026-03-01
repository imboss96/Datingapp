import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';

mongoose.connect(mongoUri).then(async () => {
  try {
    const db = mongoose.connection.db;
    const users = db.collection('users');
    
    // Find Bosire directly in MongoDB
    console.log('\n=== BOSIRE accountType ===\n');
    const bosire = await users.findOne({ name: 'Bosire Bosire' }, { projection: { accountType: 1, role: 1, name: 1 } });
    console.log('Result:', bosire);
    
    // Count by exact conditions
    console.log('\n=== COUNTS ===\n');
    const count1 = await users.countDocuments({ accountType: 'APP' });
    const count2 = await users.countDocuments({ role: 'ADMIN' });
    const count3 = await users.countDocuments({ accountType: 'APP', role: 'ADMIN' });
    
    console.log(`accountType = 'APP': ${count1}`);
    console.log(`role = 'ADMIN': ${count2}`);
    console.log(`accountType = 'APP' AND role = 'ADMIN': ${count3}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}).catch(error => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});
