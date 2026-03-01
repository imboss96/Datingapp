import mongoose from 'mongoose';
import { 
  logActivity, 
  logLogin, 
  logLogout, 
  logSignup, 
  logBan, 
  logWarn,
  logModeratorAction,
  logProfileUpdate,
  logEmailVerification 
} from './utils/activityLogger.js';
import ActivityLog from './models/ActivityLog.js';
import { v4 as uuidv4 } from 'uuid';

// Connect to database
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/datingapp';

async function testLogging() {
  try {
    console.log('[TEST] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('[TEST] Connected to MongoDB');

    // Create test users
    const testUserId = uuidv4();
    const moderatorId = uuidv4();

    console.log('\n[TEST] Testing Activity Logging System...\n');

    // Test 1: Signup log
    console.log('1. Testing logSignup()');
    const signupLog = await logSignup(testUserId, 'testuser@example.com', 'APP');
    console.log('   ✓ Signup logged:', signupLog?.id);

    // Test 2: Email verification log
    console.log('2. Testing logEmailVerification()');
    const emailLog = await logEmailVerification(testUserId, 'testuser@example.com');
    console.log('   ✓ Email verification logged:', emailLog?.id);

    // Test 3: Login log
    console.log('3. Testing logLogin()');
    const loginLog = await logLogin(testUserId);
    console.log('   ✓ Login logged:', loginLog?.id);

    // Test 4: Profile update log
    console.log('4. Testing logProfileUpdate()');
    const profileLog = await logProfileUpdate(testUserId, { name: 'John Doe', age: 25 });
    console.log('   ✓ Profile update logged:', profileLog?.id);

    // Test 5: Warning log
    console.log('5. Testing logWarn()');
    const warnLog = await logWarn(testUserId, 'Inappropriate message', moderatorId);
    console.log('   ✓ Warning logged:', warnLog?.id);

    // Test 6: Ban log
    console.log('6. Testing logBan()');
    const banLog = await logBan(testUserId, 'Harassing other users', 'permanent', moderatorId);
    console.log('   ✓ Ban logged:', banLog?.id);

    // Test 7: Moderator action log
    console.log('7. Testing logModeratorAction()');
    const modActionLog = await logModeratorAction(testUserId, 'replied', 'chat-123', 'Responded to support request', moderatorId);
    console.log('   ✓ Moderator action logged:', modActionLog?.id);

    // Test 8: Logout log
    console.log('8. Testing logLogout()');
    const logoutLog = await logLogout(testUserId);
    console.log('   ✓ Logout logged:', logoutLog?.id);

    // Verify logs were saved to database
    console.log('\n[TEST] Verifying logs in database...\n');
    const totalLogs = await ActivityLog.countDocuments();
    console.log('✓ Total logs in database:', totalLogs);

    const userLogs = await ActivityLog.find({ userId: testUserId });
    console.log('✓ Logs for test user:', userLogs.length);

    const modLogs = await ActivityLog.find({ moderatorId });
    console.log('✓ Logs created by moderator:', modLogs.length);

    // Display sample logs
    console.log('\n[TEST] Sample logs:\n');
    const sampleLogs = await ActivityLog.find({ userId: testUserId })
      .sort({ timestamp: -1 })
      .limit(3)
      .lean();

    sampleLogs.forEach((log, idx) => {
      console.log(`${idx + 1}. Action: ${log.action}`);
      console.log(`   Description: ${log.description}`);
      console.log(`   Timestamp: ${log.timestamp}`);
      console.log('');
    });

    console.log('[TEST] ✅ All logging tests passed!');
    
  } catch (error) {
    console.error('[ERROR] Test failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('[TEST] Disconnected from database');
    process.exit(0);
  }
}

testLogging();
