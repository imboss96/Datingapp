import mongoose from 'mongoose';

async function findUserByEmail() {
  try {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';
    await mongoose.connect(mongoUrl);
    
    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne({ email: 'jeffnjoki56@gmail.com' });
    
    if (user) {
      console.log('\n✓ User found in database:');
      console.log('_id:', user._id, '(type:', typeof user._id, ')');
      console.log('id (field):', user.id);
      console.log('email:', user.email);
      console.log('name:', user.name);
    } else {
      console.log('\n✗ User not found with email: jeffnjoki56@gmail.com\n');
      
      // List first user to show structure
      const firstUser = await db.collection('users').findOne({});
      console.log('First user in database:');
      console.log('_id:', firstUser._id);
      console.log('id field:', firstUser.id);
    }
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

findUserByEmail();
