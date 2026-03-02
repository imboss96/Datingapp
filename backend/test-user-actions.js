import axios from 'axios';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const SERVER_URL = 'http://localhost:5000';
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app';

async function testUserActions() {
  try {
    console.log('[TEST] User Actions Testing\n');
    
    // Connect to database
    console.log('[STEP 1] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected\n');

    // Get or create test admin
    console.log('[STEP 2] Finding admin user...');
    let admin = await User.findOne({ role: 'ADMIN' });
    if (!admin) {
      console.log('  Creating test admin...');
      admin = new User({
        id: 'test-admin-' + Date.now(),
        email: `admin-${Date.now()}@test.com`,
        name: 'Test Admin',
        passwordHash: 'hashed_password',
        role: 'ADMIN'
      });
      await admin.save();
    }
    console.log(`✓ Admin: ${admin.name} (${admin.id})\n`);

    // Generate JWT token for admin
    const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '24h'
    });

    // Get or create test user
    console.log('[STEP 3] Creating test user...');
    let testUser = await User.findOne({ email: 'test-actions@test.com' });
    if (!testUser) {
      testUser = new User({
        id: 'test-user-' + Date.now(),
        email: 'test-actions@test.com',
        name: 'Test User',
        username: 'testuser' + Date.now(),
        passwordHash: 'hashed_password',
        role: 'USER',
        accountType: 'APP'
      });
      await testUser.save();
    }
    console.log(`✓ Test User: ${testUser.name} (${testUser.id})\n`);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Cookie': `authToken=${token}`
    };

    // Test 1: Suspend user
    console.log('[TEST 1] Suspend User');
    try {
      const response = await axios.put(`${SERVER_URL}/api/moderation/users/${testUser.id}/suspend`, {
        suspend: true,
        reason: 'Test suspension'
      }, { headers });
      console.log('  ✓ Response:', response.data.message);
      console.log('  ✓ Suspended:', response.data.user.suspended);
    } catch (error) {
      console.error('  ✗ Error:', error.response?.data || error.message);
    }

    // Test 2: Change role to MODERATOR
    console.log('\n[TEST 2] Change Role to MODERATOR');
    try {
      const response = await axios.put(`${SERVER_URL}/api/moderation/users/${testUser.id}/role`, {
        newRole: 'MODERATOR'
      }, { headers });
      console.log('  ✓ Response:', response.data.message);
      console.log('  ✓ New Role:', response.data.user.role);
    } catch (error) {
      console.error('  ✗ Error:', error.response?.data || error.message);
    }

    // Test 3: Change account type to STANDALONE
    console.log('\n[TEST 3] Change Account Type to STANDALONE');
    try {
      const response = await axios.put(`${SERVER_URL}/api/moderation/users/${testUser.id}/account-type`, {
        newAccountType: 'STANDALONE'
      }, { headers });
      console.log('  ✓ Response:', response.data.message);
      console.log('  ✓ New Account Type:', response.data.user.accountType);
    } catch (error) {
      console.error('  ✗ Error:', error.response?.data || error.message);
    }

    // Test 4: Unsuspend user
    console.log('\n[TEST 4] Unsuspend User');
    try {
      const response = await axios.put(`${SERVER_URL}/api/moderation/users/${testUser.id}/suspend`, {
        suspend: false
      }, { headers });
      console.log('  ✓ Response:', response.data.message);
      console.log('  ✓ Suspended:', response.data.user.suspended);
    } catch (error) {
      console.error('  ✗ Error:', error.response?.data || error.message);
    }

    // Test 5: Fetch all users
    console.log('\n[TEST 5] Fetch All Users');
    try {
      const response = await axios.get(`${SERVER_URL}/api/moderation/users/all?limit=5`, { headers });
      console.log('  ✓ Total users:', response.data.total);
      console.log('  ✓ Returned users:', response.data.users.length);
      if (response.data.users.length > 0) {
        console.log('  ✓ Sample user:', response.data.users[0].name);
      }
    } catch (error) {
      console.error('  ✗ Error:', error.response?.data || error.message);
    }

    console.log('\n[TEST] ✅ All user action tests completed!');

  } catch (error) {
    console.error('[ERROR]', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from database');
    process.exit(0);
  }
}

// Run tests
testUserActions();
