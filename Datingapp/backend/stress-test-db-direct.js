/**
 * Direct DB Stress Test: Concurrent Chat Creation via Mongoose
 * This script directly tests the upsert logic by simulating concurrent operations
 * at the Mongoose/MongoDB level, bypassing the HTTP layer.
 */

import mongoose from 'mongoose';
import Chat from './models/Chat.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spark-dating';
const NUM_CONCURRENT_OPERATIONS = 150;

const testUserId = 'stress-test-db-user-1';
const testOtherUserId = 'stress-test-db-user-2';

console.log(`\n[DB STRESS TEST] Starting concurrent chat creation test via Mongoose`);
console.log(`[DB STRESS TEST] MongoDB URI: ${MONGODB_URI}`);
console.log(`[DB STRESS TEST] Test users: ${testUserId} and ${testOtherUserId}`);
console.log(`[DB STRESS TEST] Concurrent operations: ${NUM_CONCURRENT_OPERATIONS}\n`);

// Connect to MongoDB
await mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

console.log('[DB STRESS TEST] ✓ Connected to MongoDB');

// Helper function to get sorted participants
const getSortedParticipants = (userId1, userId2) => {
  return [userId1, userId2].sort();
};

// Helper to create a stable participantsKey
const makeParticipantsKey = (participantsArray) => {
  return participantsArray.slice().sort().join('_');
};

// Clean up any existing test chats
console.log(`[DB STRESS TEST] Cleaning up old test chats...`);
const participants = getSortedParticipants(testUserId, testOtherUserId);
const participantsKey = makeParticipantsKey(participants);
const deletedCount = await Chat.deleteMany({ participantsKey });
console.log(`[DB STRESS TEST] ✓ Deleted ${deletedCount.deletedCount} old test chats`);

// Function to perform the upsert operation (simulates what the create-or-get endpoint does)
const performUpsert = async (operationNum) => {
  try {
    const chat = await Chat.findOneAndUpdate(
      { participantsKey },
      {
        $setOnInsert: {
          id: uuidv4(),
          participants,
          participantsKey,
          messages: [],
          lastUpdated: Date.now(),
          requestStatus: 'pending',
          requestInitiator: testUserId,
          requestInitiatorFirstMessage: false,
          blockedBy: [],
          unreadCounts: {},
          lastOpened: {}
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return {
      operationNum,
      chatId: chat.id,
      mongoId: chat._id.toString(),
      isNew: chat.__v === 0, // Heuristic: new docs typically have __v: 0
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    // Check if it's a duplicate key error
    if (err.code === 11000) {
      console.log(`[DB STRESS TEST] Operation ${operationNum}: Caught duplicate key error, attempting refetch...`);
      // Refetch the document
      const existingChat = await Chat.findOne({ participantsKey });
      if (existingChat) {
        return {
          operationNum,
          chatId: existingChat.id,
          mongoId: existingChat._id.toString(),
          isDuplicate: true,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error('Duplicate key error but chat not found on refetch');
      }
    } else {
      throw err;
    }
  }
};

// Fire all concurrent operations
console.log(`[DB STRESS TEST] Firing ${NUM_CONCURRENT_OPERATIONS} concurrent upsert operations...`);
const startTime = Date.now();

const promises = [];
for (let i = 0; i < NUM_CONCURRENT_OPERATIONS; i++) {
  promises.push(performUpsert(i + 1));
}

const results = await Promise.all(promises);
const endTime = Date.now();

console.log(`[DB STRESS TEST] ✓ Completed all ${results.length} operations in ${endTime - startTime}ms`);

// Analyze results
const chatIds = new Set(results.map(r => r.chatId));
const mongoIds = new Set(results.map(r => r.mongoId));
const duplicateErrors = results.filter(r => r.isDuplicate).length;

console.log(`\n[DB STRESS TEST] RESULTS:`);
console.log(`[DB STRESS TEST] - Unique Chat IDs returned: ${chatIds.size}`);
console.log(`[DB STRESS TEST] - Unique MongoDB _IDs returned: ${mongoIds.size}`);
console.log(`[DB STRESS TEST] - Operations that caught duplicate errors: ${duplicateErrors}`);

// Query database directly
console.log(`\n[DB STRESS TEST] Verifying database state...`);
const dbChats = await Chat.find({ participantsKey });
console.log(`[DB STRESS TEST] - Actual chat documents in DB with participantsKey "${participantsKey}": ${dbChats.length}`);

if (dbChats.length > 0) {
  console.log(`[DB STRESS TEST] - Chat details:`);
  dbChats.forEach((chat, idx) => {
    console.log(`[DB STRESS TEST]   ${idx + 1}. ID: ${chat.id}`);
    console.log(`[DB STRESS TEST]      MongoDB _ID: ${chat._id}`);
    console.log(`[DB STRESS TEST]      Participants: ${chat.participants.join(', ')}`);
    console.log(`[DB STRESS TEST]      Messages: ${chat.messages.length}`);
    console.log(`[DB STRESS TEST]      Created: ${chat.createdAt}`);
  });
}

// Assessment
console.log(`\n[DB STRESS TEST] ASSESSMENT:`);
let testPassed = true;

if (chatIds.size !== 1) {
  console.error(`[DB STRESS TEST] ✗ FAILED: Expected 1 unique chat ID, got ${chatIds.size}`);
  console.error(`[DB STRESS TEST] Chat IDs found: ${Array.from(chatIds).join(', ')}`);
  testPassed = false;
} else {
  console.log(`[DB STRESS TEST] ✓ PASSED: All operations returned same chat ID`);
}

if (mongoIds.size !== 1) {
  console.error(`[DB STRESS TEST] ✗ FAILED: Expected 1 unique MongoDB _ID, got ${mongoIds.size}`);
  testPassed = false;
} else {
  console.log(`[DB STRESS TEST] ✓ PASSED: All operations returned same MongoDB _ID`);
}

if (dbChats.length !== 1) {
  console.error(`[DB STRESS TEST] ✗ FAILED: Expected 1 chat document in DB, found ${dbChats.length}`);
  testPassed = false;
} else {
  console.log(`[DB STRESS TEST] ✓ PASSED: Exactly 1 chat document in database`);
}

console.log(`[DB STRESS TEST] - Duplicate key errors handled gracefully: ${duplicateErrors > 0 ? 'YES' : 'NONE NEEDED (upsert was atomic)'}`);

console.log(`\n[DB STRESS TEST] Overall result: ${testPassed ? '✓ PASSED' : '✗ FAILED'}\n`);

// Cleanup
await Chat.deleteMany({ participantsKey });
await mongoose.connection.close();

process.exit(testPassed ? 0 : 1);
