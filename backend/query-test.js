import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';

mongoose.connect(mongoUri).then(async () => {
  try {
    console.log('\n=== QUERY TESTING ===\n');
    
    // Test 1: Find by role only
    console.log('Test 1: Find by role = ADMIN');
    let results = await User.find({ role: 'ADMIN' });
    console.log(`  Results: ${results.length}`);
    
    // Test 2: Find by accountType only
    console.log('\nTest 2: Find by accountType = APP');
    results = await User.find({ accountType: 'APP' });
    console.log(`  Results: ${results.length} (first 5: ${results.slice(0, 5).map(u => u.name).join(', ')})`);
    
    // Test 3: Find by both fields separately
    console.log('\nTest 3: Find by role = ADMIN AND accountType = APP');
    results = await User.find({ role: 'ADMIN', accountType: 'APP' });
    console.log(`  Results: ${results.length}`);
    results.forEach(r => console.log(`    - ${r.name} (${r.role}, ${r.accountType})`));
    
    // Test 4: Find with $in operator
    console.log('\nTest 4: Find by role in [MODERATOR, ADMIN]');
    results = await User.find({ role: { $in: ['MODERATOR', 'ADMIN'] } });
    console.log(`  Results: ${results.length}`);
    results.forEach(r => console.log(`    - ${r.name} (${r.role}, ${r.accountType})`));
    
    // Test 5: Combined query
    console.log('\nTest 5: Find by accountType = APP AND role in [MODERATOR, ADMIN]');
    results = await User.find({ accountType: 'APP', role: { $in: ['MODERATOR', 'ADMIN'] } });
    console.log(`  Results: ${results.length}`);
    results.forEach(r => console.log(`    - ${r.name} (${r.role}, ${r.accountType})`));
    
    // Test 6: Try with lean()
    console.log('\nTest 6: Same query with .lean()');
    results = await User.find({ accountType: 'APP', role: { $in: ['MODERATOR', 'ADMIN'] } }).lean();
    console.log(`  Results: ${results.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}).catch(error => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});
