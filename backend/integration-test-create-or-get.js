/**
 * Integration Test: create-or-get Endpoint Hardening
 * This script tests the error handling path by simulating the exact flow
 * that would happen under concurrent HTTP requests.
 */

import mongoose from 'mongoose';
import Chat from './models/Chat.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spark-dating';

// Helpers (same as in routes/chats.js)
const getSortedParticipants = (userId1, userId2) => {
  return [userId1, userId2].sort();
};

const makeParticipantsKey = (participantsArray) => {
  return participantsArray.slice().sort().join('_');
};

// Simulated create-or-get endpoint logic (from routes/chats.js)
const createOrGetChat = async (userId, otherUserId) => {
  try {
    const participants = getSortedParticipants(userId, otherUserId);
    const participantsKey = makeParticipantsKey(participants);

    console.log(`  [CREATE-OR-GET] User: ${userId}, Other: ${otherUserId}, Key: ${participantsKey}`);

    // Try to find existing chat first
    let chat = await Chat.findOne({ participantsKey });
    let isNewChat = false;

    if (!chat) {
      console.log(`  [CREATE-OR-GET] Chat not found, attempting upsert`);
      // Upsert a single chat document for this participant key to avoid duplicates
      try {
        chat = await Chat.findOneAndUpdate(
          { participantsKey },
          {
            $setOnInsert: {
              id: uuidv4(),
              participants,
              participantsKey,
              messages: [],
              lastUpdated: Date.now(),
              requestStatus: 'pending',
              requestInitiator: userId,
              requestInitiatorFirstMessage: false,
              blockedBy: [],
              unreadCounts: {},
              lastOpened: {}
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        isNewChat = true;
        console.log(`  [CREATE-OR-GET] ✓ Upserted new chat: ${chat.id}`);
      } catch (upsertErr) {
        // Handle duplicate key error (E11000) that can occur under concurrent requests
        if (upsertErr.code === 11000) {
          console.log(`  [CREATE-OR-GET] ⚠ Duplicate key error (E11000), refetching...`);
          // Re-fetch the document that was created by another concurrent request
          chat = await Chat.findOne({ participantsKey });
          if (!chat) {
            console.error(`  [CREATE-OR-GET] ✗ Chat still not found after duplicate key error!`);
            throw new Error('Failed to create or retrieve chat');
          }
          isNewChat = false;
          console.log(`  [CREATE-OR-GET] ✓ Retrieved existing chat after duplicate error: ${chat.id}`);
        } else {
          // Re-throw non-duplicate-key errors
          throw upsertErr;
        }
      }
    } else {
      console.log(`  [CREATE-OR-GET] ✓ Found existing chat: ${chat.id}`);
    }

    return {
      chatId: chat.id,
      mongoId: chat._id.toString(),
      isNewChat,
      status: 'success'
    };
  } catch (err) {
    console.error(`  [CREATE-OR-GET] ✗ Error:`, err.message);
    return {
      status: 'error',
      error: err.message
    };
  }
};

// Main test
(async () => {
  console.log('\n[INTEGRATION TEST] Testing create-or-get endpoint hardening\n');

  // Connect
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('[INTEGRATION TEST] ✓ Connected to MongoDB\n');

  const testUserId = 'integration-test-user-1';
  const testOtherUserId = 'integration-test-user-2';
  const participantsKey = [testUserId, testOtherUserId].sort().join('_');

  // Cleanup
  console.log('[INTEGRATION TEST] Cleaning up...');
  await Chat.deleteMany({ participantsKey });
  console.log('[INTEGRATION TEST] ✓ Cleaned up old test chats\n');

  // Test 1: Single request (baseline)
  console.log('[TEST 1] Single request');
  const result1 = await createOrGetChat(testUserId, testOtherUserId);
  const chatId1 = result1.chatId;
  console.log(`[TEST 1] Result: chatId=${chatId1}, isNewChat=${result1.isNewChat}\n`);

  // Test 2: Second request should get existing chat
  console.log('[TEST 2] Second request (should get existing)');
  const result2 = await createOrGetChat(testUserId, testOtherUserId);
  const chatId2 = result2.chatId;
  console.log(`[TEST 2] Result: chatId=${chatId2}, isNewChat=${result2.isNewChat}\n`);

  // Test 3: Concurrent requests (simulated)
  console.log('[TEST 3] Simulated concurrent requests (2 parallel, then 3 more)');
  await Chat.deleteMany({ participantsKey }); // Reset for this test
  const concurrent1 = await Promise.all([
    createOrGetChat(testUserId, testOtherUserId),
    createOrGetChat(testUserId, testOtherUserId)
  ]);
  console.log(`[TEST 3] Batch 1 results:`);
  console.log(`  - Request 1: chatId=${concurrent1[0].chatId}`);
  console.log(`  - Request 2: chatId=${concurrent1[1].chatId}`);

  const concurrent2 = await Promise.all([
    createOrGetChat(testUserId, testOtherUserId),
    createOrGetChat(testUserId, testOtherUserId),
    createOrGetChat(testUserId, testOtherUserId)
  ]);
  console.log(`[TEST 3] Batch 2 results:`);
  console.log(`  - Request 3: chatId=${concurrent2[0].chatId}`);
  console.log(`  - Request 4: chatId=${concurrent2[1].chatId}`);
  console.log(`  - Request 5: chatId=${concurrent2[2].chatId}\n`);

  // Verify
  console.log('[VERIFICATION] Checking database state...');
  const dbChats = await Chat.find({ participantsKey });
  console.log(`[VERIFICATION] Chat documents in DB: ${dbChats.length}`);
  
  const allChatIds = [
    concurrent1[0].chatId,
    concurrent1[1].chatId,
    concurrent2[0].chatId,
    concurrent2[1].chatId,
    concurrent2[2].chatId
  ];
  const uniqueIds = new Set(allChatIds);
  console.log(`[VERIFICATION] Unique chat IDs returned: ${uniqueIds.size}`);
  
  console.log(`\n[ASSESSMENT]`);
  let allPassed = true;

  if (chatId1 === chatId2) {
    console.log(`✓ Test 1 & 2: Second request correctly returned same chat`);
  } else {
    console.log(`✗ Test 1 & 2: Second request returned different chat!`);
    allPassed = false;
  }

  if (uniqueIds.size === 1) {
    console.log(`✓ Test 3: All 5 concurrent requests returned same chat ID`);
  } else {
    console.log(`✗ Test 3: Concurrent requests returned ${uniqueIds.size} different chat IDs!`);
    allPassed = false;
  }

  if (dbChats.length === 1) {
    console.log(`✓ Database: Exactly 1 chat document in DB`);
  } else {
    console.log(`✗ Database: Found ${dbChats.length} chat documents (expected 1)!`);
    allPassed = false;
  }

  console.log(`\n[RESULT] ${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}\n`);

  // Cleanup
  await Chat.deleteMany({ participantsKey });
  await mongoose.connection.close();

  process.exit(allPassed ? 0 : 1);
})();
