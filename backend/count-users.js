import mongoose from 'mongoose';
import 'dotenv/config';

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function countUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const count = await User.countDocuments();
    console.log(`\n📊 Total users in database: ${count}`);

    // Get additional stats
    const profilesWithCoordinates = await User.countDocuments({ coordinates: { $exists: true, $ne: null } });
    const profilesWithPhoto = await User.countDocuments({ profilePhoto: { $exists: true, $ne: null } });
    const premiumUsers = await User.countDocuments({ isPremium: true });
    const verifiedUsers = await User.countDocuments({ isPhotoVerified: true });

    console.log('\n📈 Additional Stats:');
    console.log(`  • Profiles with coordinates: ${profilesWithCoordinates}`);
    console.log(`  • Profiles with photos: ${profilesWithPhoto}`);
    console.log(`  • Premium users: ${premiumUsers}`);
    console.log(`  • Photo verified users: ${verifiedUsers}`);

    // Show sample user
    const sampleUser = await User.findOne();
    if (sampleUser) {
      console.log('\n👤 Sample user:');
      console.log(`  • ID: ${sampleUser.id}`);
      console.log(`  • Username: ${sampleUser.username}`);
      console.log(`  • Email: ${sampleUser.email}`);
      console.log(`  • Created: ${sampleUser.createdAt}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

countUsers();
