import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';

mongoose.connect(mongoUri).then(async () => {
  try {
    // Find Bosire
    console.log('\n=== FINDING BOSIRE ===\n');
    
    const bosire = await User.findOne({ name: 'Bosire Bosire' });
    
    if (bosire) {
      console.log('Found Bosire:');
      console.log('  ID:', bosire.id);
      console.log('  Name:', bosire.name);
      console.log('  Email:', bosire.email);
      console.log('  Role:', bosire.role);
      console.log('  AccountType:', bosire.accountType);
    } else {
      console.log('Bosire not found');
    }
    
    // Find all MODERATOR/ADMIN with any accountType
    console.log('\n=== ALL MODERATORS/ADMINS (ANY ACCOUNT TYPE) ===\n');
    const mods = await User.find({ role: { $in: ['MODERATOR', 'ADMIN'] } });
    console.log(`Found ${mods.length} moderators/admins`);
    mods.forEach(m => {
      console.log(`- ${m.name} (${m.email}) | Role: ${m.role} | AccountType: ${m.accountType}`);
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
