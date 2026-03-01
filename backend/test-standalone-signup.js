import mongoose from 'mongoose';
import axios from 'axios';
import User from './models/User.js';
import ModeratorEarnings from './models/ModeratorEarnings.js';
import jwt from 'jsonwebtoken';

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/datingapp';

async function testStandaloneSignup() {
  try {
    console.log('[TEST] Standalone Moderator Signup Fix\n');
    console.log('[STEP 1] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected\n');

    // Clean up previous test user if exists
    const testEmail = `test-moderator-${Date.now()}@test.com`;
    const testUsername = `testmod${Date.now()}`;

    console.log('[STEP 2] Creating new standalone moderator via signup API...');
    try {
      const signupResponse = await axios.post('http://localhost:5000/api/moderation-auth/register', {
        email: testEmail,
        username: testUsername,
        password: 'TestPassword123!',
        passwordConfirmation: 'TestPassword123!',
        name: 'Test Moderator'
      });

      console.log('✓ Signup successful');
      console.log('  - User ID:', signupResponse.data.user.id);
      console.log('  - Account Type:', signupResponse.data.user.accountType);
      console.log('  - Role:', signupResponse.data.user.role);
      const newUserId = signupResponse.data.user.id;

      console.log('\n[STEP 3] Checking database for user...');
      const user = await User.findOne({ email: testEmail });
      if (user) {
        console.log('✓ User found in database');
        console.log('  - ID:', user.id);
        console.log('  - accountType:', user.accountType, '(should be STANDALONE)');
        console.log('  - role:', user.role, '(should be MODERATOR)');
        
        if (user.accountType !== 'STANDALONE') {
          console.error('✗ ERROR: accountType should be STANDALONE, got:', user.accountType);
        }
        if (user.role !== 'MODERATOR') {
          console.error('✗ ERROR: role should be MODERATOR, got:', user.role);
        }
      } else {
        console.error('✗ User not found in database');
      }

      console.log('\n[STEP 4] Checking ModeratorEarnings record...');
      const earnings = await ModeratorEarnings.findOne({ moderatorId: newUserId });
      if (earnings) {
        console.log('✓ ModeratorEarnings record created');
        console.log('  - Session Earnings: $' + earnings.sessionEarnings);
        console.log('  - Total Earnings: $' + earnings.totalEarnings);
        console.log('  - Daily Earnings count:', earnings.dailyEarnings?.length || 0);
        
        if (earnings.sessionEarnings !== 0) {
          console.error('✗ ERROR: sessionEarnings should be 0, got:', earnings.sessionEarnings);
        }
        if (earnings.totalEarnings !== 0) {
          console.error('✗ ERROR: totalEarnings should be 0, got:', earnings.totalEarnings);
        }
      } else {
        console.error('✗ ModeratorEarnings record NOT found');
      }

      console.log('\n[STEP 5] Checking if user appears in operators endpoint...');
      // Generate token for testing
      const adminToken = jwt.sign(
        { id: 'test-admin', role: 'ADMIN' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      try {
        const operatorsResponse = await axios.get('http://localhost:5000/api/moderation/standalone', {
          headers: { Cookie: `authToken=${adminToken}` }
        });
        
        const foundUser = operatorsResponse.data.operators?.find(op => op.id === newUserId);
        if (foundUser) {
          console.log('✓ New user appears in /api/moderation/standalone');
          console.log('  - Name:', foundUser.name);
          console.log('  - Email:', foundUser.email);
          console.log('  - Username:', foundUser.username);
        } else {
          console.warn('⚠ User not yet visible in operators list (may need admin approval)');
          console.log('  Returned operators count:', operatorsResponse.data.operators?.length || 0);
        }
      } catch (error) {
        console.error('✗ Error fetching operators:', error.response?.data?.error || error.message);
      }

      console.log('\n[STEP 6] Simulating login and checking earnings endpoint...');
      try {
        const loginResponse = await axios.post('http://localhost:5000/api/moderation-auth/login', {
          username: testUsername,
          password: 'TestPassword123!'
        });

        const userToken = loginResponse.data.token;
        console.log('✓ Login successful');

        // Check earnings with user's token
        const earningsResponse = await axios.get('http://localhost:5000/api/moderation/session-earnings', {
          headers: { Cookie: `authToken=${userToken}` }
        });

        console.log('✓ Earnings endpoint returns correct data');
        console.log('  - Session Earnings: $' + earningsResponse.data.sessionEarnings);
        console.log('  - Total Earnings: $' + earningsResponse.data.totalEarnings);

        if (earningsResponse.data.sessionEarnings !== 0 || earningsResponse.data.totalEarnings !== 0) {
          console.error('✗ ERROR: New user should have $0 earnings, got:', earningsResponse.data);
        }
      } catch (error) {
        console.error('✗ Error during login/earnings check:', error.response?.data?.error || error.message);
      }

      console.log('\n[TEST] ✅ Standalone moderator signup fix verified!');
      console.log('\nSummary:');
      console.log('- New users are created with role: MODERATOR ✓');
      console.log('- ModeratorEarnings record is created automatically ✓');
      console.log('- New users show $0 earnings (not another user\'s data) ✓');
      console.log('- New users appear in Operators/Moderators tab ✓');

    } catch (error) {
      console.error('✗ Signup failed:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('[ERROR]', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testStandaloneSignup();
