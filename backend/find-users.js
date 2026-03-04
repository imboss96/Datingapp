import mongoose from 'mongoose';

async function findUsers() {
  try {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';
    await mongoose.connect(mongoUrl);
    
    const db = mongoose.connection.db;
    const users = await db.collection('users')
      .find({})
      .project({ _id: 1, email: 1, name: 1, isEmailVerified: 1 })
      .limit(10)
      .toArray();
    
    console.log('\nUsers in database:');
    console.log('=================\n');
    users.forEach((u, i) => {
      console.log(`${i + 1}. ID: ${u._id}`);
      console.log(`   Email: ${u.email}`);
      console.log(`   Name: ${u.name || '(no name)'}`);
      console.log('');
    });
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

findUsers();
