import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';

mongoose.connect(mongoUri).then(async () => {
  try {
    const moderators = await User.find({ 
      role: { $in: ['MODERATOR', 'ADMIN'] } 
    }).select('id name email username role accountType createdAt');
    
    console.log('\n=== MODERATORS AND ADMINS IN DATABASE ===\n');
    console.log(`Total: ${moderators.length}\n`);
    
    const standalone = moderators.filter(m => m.accountType === 'STANDALONE');
    const onboarded = moderators.filter(m => m.accountType === 'APP');
    
    console.log(`Standalone Operators: ${standalone.length}`);
    standalone.forEach(m => {
      console.log(`  - ${m.name} (${m.email}) | ${m.role} | Joined: ${m.createdAt.toLocaleDateString()}`);
    });
    
    console.log(`\nOnboarded Moderators: ${onboarded.length}`);
    onboarded.forEach(m => {
      console.log(`  - ${m.name} (${m.email}) | ${m.role} | Joined: ${m.createdAt.toLocaleDateString()}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}).catch(error => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});
