import mongoose from 'mongoose';

async function listAllUsers() {
  try {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';
    await mongoose.connect(mongoUrl);
    
    const db = mongoose.connection.db;
    const users = await db.collection('users')
      .find({})
      .project({ _id: 1, id: 1, email: 1, name: 1 })
      .limit(20)
      .toArray();
    
    console.log(`\n📋 Found ${users.length} users in database:\n`);
    users.forEach((u, i) => {
      console.log(`${i + 1}. MongoDB _id: ${u._id}`);
      console.log(`   id field: ${u.id}`);
      console.log(`   email: ${u.email}`);
      console.log(`   name: ${u.name}\n`);
    });
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

listAllUsers();
