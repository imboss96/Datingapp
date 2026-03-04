import mongoose from 'mongoose';

async function checkUser() {
  try {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';
    await mongoose.connect(mongoUrl);
    
    const db = mongoose.connection.db;
    
    // Check by ObjectId string
    const user1 = await db.collection('users').findOne({ _id: '69a77f97f9456e8c11bb74fb' });
    console.log('Lookup by string:', user1 ? 'Found' : 'Not found');
    
    // Check by ObjectId
    const ObjectId = mongoose.Types.ObjectId;
    const user2 = await db.collection('users').findOne({ _id: new ObjectId('69a77f97f9456e8c11bb74fb') });
    console.log('Lookup by ObjectId:', user2 ? 'Found' : 'Not found');
    
    if (user2) {
      console.log('\n✓ User exists:');
      console.log('  _id:', user2._id);
      console.log('  email:', user2.email);
      console.log('  name:', user2.name);
    }
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkUser();
