import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';

mongoose.connect(mongoUri).then(async () => {
  try {
    const db = mongoose.connection.db;
    const users = db.collection('users');
    
    // Find Bosire directly in MongoDB
    console.log('\n=== BOSIRE IN RAW MONGODB ===\n');
    const bosire = await users.findOne({ name: 'Bosire Bosire' });
    if (bosire) {
      console.log('Found in MongoDB:');
      console.log(JSON.stringify(bosire, null, 2));
    } else {
      console.log('Bosire not found in raw MongoDB');
    }
    
    // Count users by accountType
    console.log('\n=== USERS BY ACCOUNT TYPE ===\n');
    const appCount = await users.countDocuments({ accountType: 'APP' });
    const standaloneCount = await users.countDocuments({ accountType: 'STANDALONE' });
    const noTypeCount = await users.countDocuments({ accountType: { $exists: false } });
    
    console.log(`accountType: 'APP' → ${appCount}`);
    console.log(`accountType: 'STANDALONE' → ${standaloneCount}`);
    console.log(`accountType not set → ${noTypeCount}`);
    
    // Show first few documents and their accountType
    console.log('\n=== FIRST 5 USERS (accountType field) ===\n');
    const firstFew = await users.find({}).project({ name: 1, accountType: 1 }).limit(5).toArray();
    firstFew.forEach(u => {
      console.log(`- ${u.name}: accountType = ${u.accountType || 'UNDEFINED'}`);
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
