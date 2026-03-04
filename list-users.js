const mongoose = require('mongoose');

// Load User model from backend
const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  isEmailVerified: Boolean,
});
const User = mongoose.model('User', userSchema);

const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';

async function findRealUsers() {
  try {
    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB\n');

    // Find users with verified emails
    const users = await User.find({ isEmailVerified: true })
      .select('_id email name isEmailVerified')
      .limit(10);

    if (users.length === 0) {
      console.log('No verified users found. Finding any users:');
      const anyUsers = await User.find()
        .select('_id email name isEmailVerified')
        .limit(10);
      
      if (anyUsers.length === 0) {
        console.log('No users found in database');
      } else {
        console.log('Available users:');
        anyUsers.forEach((u, i) => {
          console.log(`${i + 1}. ID: ${u._id}`);
          console.log(`   Email: ${u.email}`);
          console.log(`   Name: ${u.name}`);
          console.log(`   Verified: ${u.isEmailVerified}\n`);
        });
      }
    } else {
      console.log('Verified users found:');
      users.forEach((u, i) => {
        console.log(`${i + 1}. ID: ${u._id}`);
        console.log(`   Email: ${u.email}`);
        console.log(`   Name: ${u.name}\n`);
      });
    }

    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

findRealUsers();
