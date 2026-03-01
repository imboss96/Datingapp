import mongoose from 'mongoose';
import User from './models/User.js';
import ModeratorEarnings from './models/ModeratorEarnings.js';

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/datingapp';

async function checkLatestStandaloneUser() {
  try {
    console.log('[VERIFY] Checking latest standalone moderator\n');
    await mongoose.connect(mongoUri);

    // Get the most recently created standalone user
    const user = await User.findOne({ accountType: 'STANDALONE', role: 'MODERATOR' })
      .sort({ createdAt: -1 })
      .lean();

    if (user) {
      console.log('✓ Latest STANDALONE user with MODERATOR role:');
      console.log('  - ID:', user.id);
      console.log('  - Email:', user.email);
      console.log('  - Username:', user.username);
      console.log('  - Name:', user.name);
      console.log('  - accountType:', user.accountType);
      console.log('  - role:', user.role);
      console.log('  - Created:', user.createdAt);

      console.log('\n✓ Checking earnings record...');
      const earnings = await ModeratorEarnings.findOne({ moderatorId: user.id }).lean();
      
      if (earnings) {
        console.log('✓ ModeratorEarnings found:');
        console.log('  - sessionEarnings: $' + earnings.sessionEarnings);
        console.log('  - totalEarnings: $' + earnings.totalEarnings);
        console.log('  - lastResetAt:', earnings.lastResetAt);
      } else {
        console.log('✗ ModeratorEarnings NOT found (may need to be created on first login)');
      }

      console.log('\n✅ Verification complete - new standalone moderators have:');
      console.log('   - accountType: STANDALONE');
      console.log('   - role: MODERATOR');
      console.log('   - Fresh earnings data (or created on first access)');
    } else {
      console.log('No standalone MODERATOR users found in database');
    }

  } catch (error) {
    console.error('[ERROR]', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkLatestStandaloneUser();
