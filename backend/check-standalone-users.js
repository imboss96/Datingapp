import mongoose from 'mongoose';
import User from './models/User.js';

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/datingapp';

async function checkAllStandaloneUsers() {
  try {
    console.log('[DEBUG] All STANDALONE users in database\n');
    await mongoose.connect(mongoUri);

    const allStandalone = await User.find({ accountType: 'STANDALONE' })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    console.log(`Found ${allStandalone.length} STANDALONE users:\n`);

    allStandalone.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.name || user.username || 'Unknown'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   AccountType: ${user.accountType}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log();
    });

    if (allStandalone.length === 0) {
      console.log('No STANDALONE accounts found');
      console.log('\nChecking if there are any users at all...');
      const totalUsers = await User.countDocuments();
      console.log(`Total users in DB: ${totalUsers}`);
    }

  } catch (error) {
    console.error('[ERROR]', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkAllStandaloneUsers();
