import mongoose from 'mongoose';

async function debugUsers() {
  try {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';
    await mongoose.connect(mongoUrl);
    
    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne({ _id: '69a6f73d9d6a7d187f63a943' });
    
    console.log('User lookup by string _id:');
    console.log('Result:', user ? 'Found' : 'Not found');
    
    if (!user) {
      // Try with ObjectId
      const ObjectId = mongoose.Types.ObjectId;
      const user2 = await db.collection('users').findOne({ _id: new ObjectId('69a6f73d9d6a7d187f63a943') });
      console.log('\nUser lookup by ObjectId:');
      console.log('Result:', user2 ? 'Found' : 'Not found');
    }
    
    // Find first user to show structure
    const firstUser = await db.collection('users').findOne({});
    console.log('\nFirst user in database:');
    console.log('_id:', firstUser?._id, '(type:', typeof firstUser?._id, ')');
    console.log('email:', firstUser?.email);
    console.log('name:', firstUser?.name);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

debugUsers();
