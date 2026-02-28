import { WebSocketServer } from 'ws';
import User from '../models/User.js';

// Store connected users: userId -> WebSocket
const connectedUsers = new Map();

// Track active calls: callId -> { initiatorId, recipientId, startTime, status, isVideo, initiator_joined, recipient_joined }
const activeCalls = new Map();

// Track user call state: userId -> { callId, status, otherUserId, startTime }
const userCallState = new Map();

/**
 * Update user online status in database
 */
const setUserOnline = async (userId) => {
  try {
    await User.findOneAndUpdate(
      { id: userId },
      { isOnline: true, lastActiveAt: new Date() },
      { new: true }
    );
  } catch (err) {
    console.error(`[WebSocket] Failed to set user ${userId} online:`, err.message);
  }
};

const setUserOffline = async (userId) => {
  try {
    await User.findOneAndUpdate(
      { id: userId },
      { isOnline: false, lastActiveAt: new Date() },
      { new: true }
    );
  } catch (err) {
    console.error(`[WebSocket] Failed to set user ${userId} offline:`, err.message);
  }
};

/**
 * Initialize WebSocket server
 */
export function initWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('[WebSocket] New connection established');

    let userId = null;

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);

        // Register user on connection
        if (message.type === 'register') {
          userId = message.userId;
          connectedUsers.set(userId, ws);
          console.log(`[WebSocket] User ${userId} registered`);

          // Mark user as online in DB
          setUserOnline(userId);

          ws.send(JSON.stringify({ type: 'registered', success: true }));

          // Broadcast online status to all connected users
          broadcastUserStatus(userId, true);
        }

        // Ping to keep connection alive + update lastSeen
        else if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          // Update lastActiveAt on every ping to keep it fresh
          if (userId) {
            User.findOneAndUpdate(
              { id: userId },
              { lastActiveAt: new Date() }
            ).catch(() => {});
          }
        }

        // Typing status
        else if (message.type === 'typing_status') {
          const typingMessage = {
            type: 'typing_status',
            userId,
            chatId: message.chatId,
            isTyping: message.isTyping,
          };
          connectedUsers.forEach((userWs, connectedUserId) => {
            if (connectedUserId !== userId && userWs.readyState === 1) {
              userWs.send(JSON.stringify(typingMessage));
            }
          });
        }

        // Call incoming - with busy check
        else if (message.type === 'call_incoming') {
          console.log(`[WebSocket] call_incoming: from ${userId} to ${message.to}`);
          
          // Check if recipient is already in a call
          const recipientCallState = userCallState.get(message.to);
          const targetWs = connectedUsers.get(message.to);
          
          if (recipientCallState && recipientCallState.status !== 'ended') {
            console.log(`[WebSocket] User ${message.to} is busy (in ${recipientCallState.status} state), sending call_busy notification`);
            
            // Send busy notification back to caller
            const callerWs = connectedUsers.get(userId);
            if (callerWs?.readyState === 1) {
              callerWs.send(JSON.stringify({
                type: 'call_busy',
                recipientId: message.to,
                recipientName: message.toName || 'User',
                timestamp: new Date().toISOString()
              }));
              console.log(`[WebSocket] call_busy sent to caller ${userId}`);
            }
          } else if (targetWs?.readyState === 1) {
            // Recipient is available, create a new call entry
            const callId = `${userId}_${message.to}_${Date.now()}`;
            
            // Record in active calls
            activeCalls.set(callId, {
              initiatorId: userId,
              recipientId: message.to,
              startTime: new Date(),
              status: 'ringing',
              isVideo: message.isVideo,
              initiator_joined: false,
              recipient_joined: false
            });
            
            // Update both users' call state
            userCallState.set(userId, { callId, status: 'ringing', otherUserId: message.to, startTime: new Date() });
            userCallState.set(message.to, { callId, status: 'ringing', otherUserId: userId, startTime: new Date() });
            
            console.log(`[WebSocket] Created new call: ${callId}`);
            console.log(`[WebSocket] Target user ${message.to} connected:`, !!targetWs);
            console.log(`[WebSocket] Target WS readyState:`, targetWs.readyState);
            
            const callData = {
              type: 'call_incoming',
              from: userId,
              fromName: message.fromName,
              isVideo: message.isVideo,
              chatId: message.chatId,
              callId: callId
            };
            console.log(`[WebSocket] Sending call_incoming to ${message.to}:`, callData);
            targetWs.send(JSON.stringify(callData));
            console.log(`[WebSocket] call_incoming sent successfully`);
          } else {
            console.log(`[WebSocket] Target user ${message.to} not connected or WS not ready`);
            
            // Send unavailable notification to caller
            const callerWs = connectedUsers.get(userId);
            if (callerWs?.readyState === 1) {
              callerWs.send(JSON.stringify({
                type: 'call_unavailable',
                recipientId: message.to,
                recipientName: message.toName || 'User',
                timestamp: new Date().toISOString()
              }));
            }
          }
        }

        // User joined call notification
        else if (message.type === 'user_joined_call') {
          console.log(`[WebSocket] user_joined_call: from ${userId} to ${message.to}`);
          const targetWs = connectedUsers.get(message.to);
          if (targetWs?.readyState === 1) {
            const notificationData = {
              type: 'user_joined_call',
              from: userId,
              fromName: message.fromName,
              timestamp: message.timestamp,
            };
            console.log(`[WebSocket] Sending user_joined_call to ${message.to}:`, notificationData);
            targetWs.send(JSON.stringify(notificationData));
          } else {
            console.log(`[WebSocket] Target user ${message.to} not connected for user_joined_call`);
          }
        }

        // WebRTC signaling
        else if (['call_offer', 'call_answer', 'ice_candidate'].includes(message.type)) {
          const targetWs = connectedUsers.get(message.to);
          if (targetWs?.readyState === 1) {
            targetWs.send(JSON.stringify({
              type: message.type,
              from: userId,
              ...(message.offer     && { offer:     message.offer }),
              ...(message.answer    && { answer:    message.answer }),
              ...(message.candidate && { candidate: message.candidate }),
            }));
          }
        }

        // Call accepted - update call state
        else if (message.type === 'call_accepted') {
          console.log(`[WebSocket] call_accepted: from ${userId} to ${message.to}`);
          const userState = userCallState.get(userId);
          if (userState) {
            userState.status = 'active';
            const call = activeCalls.get(userState.callId);
            if (call) {
              call.status = 'active';
              call.activeStartTime = new Date();
              console.log(`[WebSocket] Call ${userState.callId} status updated to active`);
            }
          }
          const targetWs = connectedUsers.get(message.to);
          if (targetWs?.readyState === 1) {
            targetWs.send(JSON.stringify({ type: 'call_accepted', from: userId }));
          }
        }

        // Call rejected - clean up call state
        else if (message.type === 'call_rejected') {
          console.log(`[WebSocket] call_rejected: from ${userId} to ${message.to}`);
          const userState = userCallState.get(userId);
          if (userState) {
            const callId = userState.callId;
            activeCalls.delete(callId);
            userCallState.delete(userId);
            userCallState.delete(message.to);
            console.log(`[WebSocket] Call ${callId} removed from tracking - rejected`);
          }
          const targetWs = connectedUsers.get(message.to);
          if (targetWs?.readyState === 1) {
            targetWs.send(JSON.stringify({ type: 'call_rejected', from: userId }));
          }
        }

        // Call ended - clean up call state and calculate duration
        else if (message.type === 'call_end') {
          console.log(`[WebSocket] call_end: from ${userId} to ${message.to}`);
          const userState = userCallState.get(userId);
          if (userState) {
            const callId = userState.callId;
            const call = activeCalls.get(callId);
            
            if (call) {
              const durationMs = new Date() - call.activeStartTime;
              const durationSec = Math.floor(durationMs / 1000);
              console.log(`[WebSocket] Call ${callId} ended - duration: ${durationSec}s`);
            }
            
            activeCalls.delete(callId);
            userCallState.delete(userId);
            userCallState.delete(message.to);
          }
          const targetWs = connectedUsers.get(message.to);
          if (targetWs?.readyState === 1) {
            targetWs.send(JSON.stringify({ 
              type: 'call_end', 
              from: userId,
              duration: message.duration 
            }));
          }
        }

      } catch (err) {
        console.error('[WebSocket] Error parsing message:', err);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      if (userId) {
        connectedUsers.delete(userId);
        console.log(`[WebSocket] User ${userId} disconnected`);

        // Clean up any active calls for this user
        const userState = userCallState.get(userId);
        if (userState) {
          const callId = userState.callId;
          const otherUserId = userState.otherUserId;
          
          activeCalls.delete(callId);
          userCallState.delete(userId);
          userCallState.delete(otherUserId);
          
          console.log(`[WebSocket] Cleaned up call ${callId} for disconnected user ${userId}`);
          
          // Notify the other user that the call is ended
          const otherUserWs = connectedUsers.get(otherUserId);
          if (otherUserWs?.readyState === 1) {
            otherUserWs.send(JSON.stringify({
              type: 'call_end',
              reason: 'disconnected',
              from: userId
            }));
          }
        }

        // Mark user as offline in DB
        setUserOffline(userId);

        // Broadcast offline status to all connected users
        broadcastUserStatus(userId, false);
      }
    });

    ws.on('error', (err) => {
      console.error('[WebSocket] Connection error:', err);
    });
  });

  return wss;
}

/**
 * Broadcast a user's online/offline status to all connected users
 */
function broadcastUserStatus(userId, isOnline) {
  const statusMessage = JSON.stringify({
    type: 'user_status',
    userId,
    isOnline,
    lastSeen: Date.now(),
  });

  connectedUsers.forEach((ws, connectedUserId) => {
    if (connectedUserId !== userId && ws.readyState === 1) {
      ws.send(statusMessage);
    }
  });
}

/**
 * Send notification to a specific user
 */
export function sendNotification(userId, notification) {
  const ws = connectedUsers.get(userId);
  if (ws?.readyState === 1) {
    ws.send(JSON.stringify(notification));
    return true;
  }
  return false;
}

/**
 * Broadcast message to chat participants
 */
export function broadcastToChatParticipants(userIds, data) {
  userIds.forEach(userId => sendNotification(userId, data));
}

/**
 * Check if user is connected
 */
export function isUserOnline(userId) {
  const ws = connectedUsers.get(userId);
  return ws?.readyState === 1;
}

/**
 * Get count of online users
 */
export function getOnlineUserCount() {
  return connectedUsers.size;
}

export { connectedUsers, activeCalls, userCallState };