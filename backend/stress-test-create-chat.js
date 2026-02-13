/**
 * Stress Test: Concurrent Chat Creation
 * This script fires 100+ concurrent requests to POST /create-or-get with the same participant pair
 * and verifies that exactly ONE chat document is created in the database.
 */

import fetch from 'node-fetch';
import mongoose from 'mongoose';
import Chat from './models/Chat.js';
import dotenv from 'dotenv';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spark-dating';
const NUM_CONCURRENT_REQUESTS = 100;

// Test user IDs
const testUserId = 'stress-test-user-1';
const testOtherUserId = 'stress-test-user-2';

console.log(`\n[STRESS TEST] Starting concurrent create-or-get chat test`);
console.log(`[STRESS TEST] Backend URL: ${BACKEND_URL}`);
console.log(`[STRESS TEST] MongoDB URI: ${MONGODB_URI}`);
console.log(`[STRESS TEST] Test users: ${testUserId} and ${testOtherUserId}`);
console.log(`[STRESS TEST] Concurrent requests: ${NUM_CONCURRENT_REQUESTS}\n`);

// Connect to MongoDB
await mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

console.log('[STRESS TEST] ✓ Connected to MongoDB');

// Clean up any existing test chats
console.log(`[STRESS TEST] Cleaning up old test chats...`);
const participantsKey = [testUserId, testOtherUserId].sort().join('_');
await Chat.deleteMany({ participantsKey });
const initialCount = await Chat.countDocuments({ participantsKey });
console.log(`[STRESS TEST] ✓ Cleanup complete. Initial chat count for key: ${initialCount}`);

// Function to make a create-or-get request
const makeCreateOrGetRequest = async (requestNum) => {
  try {
    // Mock authentication header
    const response = await fetch(`${BACKEND_URL}/api/chats/create-or-get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token-${testUserId}`, // Mock token
        'X-User-Id': testUserId // Mock user ID header (you may need to adjust based on your auth)
      },
      body: JSON.stringify({
        otherUserId: testOtherUserId
      })
    });

    if (!response.ok) {
      console.error(`[STRESS TEST] Request ${requestNum} failed with status ${response.status}`);
      const error = await response.text();
      console.error(`[STRESS TEST] Response: ${error}`);
      return null;
    }

    const data = await response.json();
    return {
      requestNum,
      chatId: data._id || data.id,
      isNewChat: data.isNewChat,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error(`[STRESS TEST] Request ${requestNum} threw error:`, err.message);
    return null;
  }
};

// Fire all concurrent requests
console.log(`[STRESS TEST] Firing ${NUM_CONCURRENT_REQUESTS} concurrent requests...`);
const startTime = Date.now();

const promises = [];
for (let i = 0; i < NUM_CONCURRENT_REQUESTS; i++) {
  promises.push(makeCreateOrGetRequest(i + 1));
}

const results = await Promise.all(promises);
const endTime = Date.now();

const successfulResults = results.filter(r => r !== null);
console.log(`[STRESS TEST] ✓ Completed ${successfulResults.length}/${NUM_CONCURRENT_REQUESTS} requests in ${endTime - startTime}ms`);

// Analyze results
const chatIds = new Set(successfulResults.map(r => r.chatId).filter(Boolean));
const newChatCount = successfulResults.filter(r => r.isNewChat).length;

console.log(`\n[STRESS TEST] RESULTS:`);
console.log(`[STRESS TEST] - Unique chat IDs returned: ${chatIds.size}`);
console.log(`[STRESS TEST] - Requests reporting isNewChat=true: ${newChatCount}`);

// Query database directly
console.log(`\n[STRESS TEST] Verifying database state...`);
const dbChats = await Chat.find({ participantsKey });
console.log(`[STRESS TEST] - Actual chat documents in DB with this participantsKey: ${dbChats.length}`);

if (dbChats.length > 0) {
  console.log(`[STRESS TEST] - Chat IDs in database:`);
  dbChats.forEach((chat, idx) => {
    console.log(`[STRESS TEST]   ${idx + 1}. ID: ${chat.id}, Messages: ${chat.messages.length}, Created: ${chat.createdAt}`);
  });
}

// Assessment
console.log(`\n[STRESS TEST] ASSESSMENT:`);
let testPassed = true;

if (chatIds.size !== 1) {
  console.error(`[STRESS TEST] ✗ FAILED: Expected 1 unique chat ID, got ${chatIds.size}`);
  testPassed = false;
} else {
  console.log(`[STRESS TEST] ✓ PASSED: All requests returned same chat ID`);
}

if (dbChats.length !== 1) {
  console.error(`[STRESS TEST] ✗ FAILED: Expected 1 chat document in DB, found ${dbChats.length}`);
  testPassed = false;
} else {
  console.log(`[STRESS TEST] ✓ PASSED: Exactly 1 chat document in database`);
}

if (newChatCount > 1) {
  console.warn(`[STRESS TEST] ⚠ WARNING: ${newChatCount} requests reported isNewChat=true (expected 1 or 0)`);
} else {
  console.log(`[STRESS TEST] ✓ PASSED: Only ${newChatCount} request(s) reported isNewChat=true`);
}

console.log(`\n[STRESS TEST] Overall result: ${testPassed ? '✓ PASSED' : '✗ FAILED'}\n`);

// Cleanup
await Chat.deleteMany({ participantsKey });
await mongoose.connection.close();

process.exit(testPassed ? 0 : 1);
