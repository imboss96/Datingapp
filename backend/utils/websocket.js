import { WebSocketServer } from 'ws';
import User from '../models/User.js';

// Store connected users: userId -> WebSocket
const connectedUsers = new Map();

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

        // Call incoming
        else if (message.type === 'call_incoming') {
          console.log(`[WebSocket] call_incoming: from ${userId} to ${message.to}`);
          const targetWs = connectedUsers.get(message.to);
          console.log(`[WebSocket] Target user ${message.to} connected:`, !!targetWs);
          if (targetWs) {
            console.log(`[WebSocket] Target WS readyState:`, targetWs.readyState);
          }
          if (targetWs?.readyState === 1) {
            const callData = {
              type: 'call_incoming',
              from: userId,
              fromName: message.fromName,
              isVideo: message.isVideo,
              chatId: message.chatId,
            };
            console.log(`[WebSocket] Sending call_incoming to ${message.to}:`, callData);
            targetWs.send(JSON.stringify(callData));
            console.log(`[WebSocket] call_incoming sent successfully`);
          } else {
            console.log(`[WebSocket] Target user ${message.to} not connected or WS not ready`);
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

        // Call end / reject
        else if (['call_end', 'call_reject'].includes(message.type)) {
          const targetWs = connectedUsers.get(message.to);
          if (targetWs?.readyState === 1) {
            targetWs.send(JSON.stringify({ type: message.type }));
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

export { connectedUsers };