import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';

mongoose.connect(mongoUri).then(async () => {
  try {
    console.log('\n=== CHECKING MODERATORS BY ACCOUNT TYPE ===\n');
    
    // Check standalone operators
    const standaloneOps = await User.find({
      accountType: 'STANDALONE',
      role: { $in: ['MODERATOR', 'ADMIN'] }
    }).select('id name email username role accountType createdAt');
    
    console.log(`Standalone Operators: ${standaloneOps.length}`);
    standaloneOps.forEach(op => {
      console.log(`  - ${op.name} (${op.email}) | Role: ${op.role} | Type: ${op.accountType}`);
    });
    
    // Check onboarded moderators
    const onboardedMods = await User.find({
      accountType: 'APP',
      role: { $in: ['MODERATOR', 'ADMIN'] }
    }).select('id name email username role accountType createdAt');
    
    console.log(`\nOnboarded Moderators (APP users): ${onboardedMods.length}`);
    onboardedMods.forEach(mod => {
      console.log(`  - ${mod.name} (${mod.email}) | Role: ${mod.role} | Type: ${mod.accountType}`);
    });
    
    console.log('\n✓ Query test complete\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}).catch(error => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});
