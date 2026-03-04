import mongoose from 'mongoose';
import User from './backend/models/User.js';

async function testMongooseLookup() {
  try {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';
    await mongoose.connect(mongoUrl);
    
    const testId = '69a77f97f9456e8c11bb74fb';
    console.log('\n1. Raw MongoDB lookup (string):');
    const db = mongoose.connection.db;
    const rawLookup1 = await db.collection('users').findOne({ _id: testId });
    console.log('  Result:', rawLookup1 ? 'Found' : 'Not found');
    
    console.log('\n2. Raw MongoDB lookup (ObjectId):');
    const ObjectId = mongoose.Types.ObjectId;
    const testObjectId = new ObjectId(testId);
    const rawLookup2 = await db.collection('users').findOne({ _id: testObjectId });
    console.log('  Result:', rawLookup2 ? 'Found' : 'Not found');
    if (rawLookup2) {
      console.log('  Email:', rawLookup2.email);
    }
    
    console.log('\n3. Mongoose lookup:');
    const mongooseLookup = await User.findOne({ _id: testObjectId });
    console.log('  Result:', mongooseLookup ? 'Found' : 'Not found');
    if (mongooseLookup) {
      console.log('  Email:', mongooseLookup.email);
    }
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

testMongooseLookup();
