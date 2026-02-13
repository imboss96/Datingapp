import { WebSocketServer } from 'ws';

// Store connected users: userId -> WebSocket
const connectedUsers = new Map();

/**
 * Initialize WebSocket server
 * @param {http.Server} server - Express server instance
 */
export function initWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('[WebSocket] New connection established');

    let userId = null;

    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);

        // Register user on connection
        if (message.type === 'register') {
          userId = message.userId;
          connectedUsers.set(userId, ws);
          console.log(`[WebSocket] User ${userId} registered`);
          ws.send(JSON.stringify({ type: 'registered', success: true }));
        }
        // Ping to keep connection alive
        else if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
        // Handle typing status - broadcast to all connected users
        // The frontend will filter by chatId
        else if (message.type === 'typing_status') {
          console.log(`[WebSocket] User ${userId} typing status:`, message.isTyping, 'in chat:', message.chatId);
          const typingMessage = {
            type: 'typing_status',
            userId: userId,
            chatId: message.chatId,
            isTyping: message.isTyping
          };
          // Broadcast to all connected users (they'll filter by chatId on client side)
          connectedUsers.forEach((userWs, connectedUserId) => {
            if (connectedUserId !== userId && userWs.readyState === 1) {
              userWs.send(JSON.stringify(typingMessage));
            }
          });
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
      }
    });

    // Handle errors
    ws.on('error', (err) => {
      console.error('[WebSocket] Connection error:', err);
    });
  });

  return wss;
}

/**
 * Send notification to a specific user
 * @param {string} userId - Target user ID
 * @param {Object} notification - Notification object
 */
export function sendNotification(userId, notification) {
  const ws = connectedUsers.get(userId);
  if (ws && ws.readyState === 1) { // 1 = OPEN
    ws.send(JSON.stringify(notification));
    console.log(`[WebSocket] Sent notification to ${userId}:`, notification.type);
    return true;
  }
  return false;
}

/**
 * Broadcast message to chat participants
 * @param {Array<string>} userIds - Target user IDs
 * @param {Object} data - Data to send
 */
export function broadcastToChatParticipants(userIds, data) {
  userIds.forEach(userId => {
    sendNotification(userId, data);
  });
}

/**
 * Check if user is connected
 * @param {string} userId - User ID to check
 */
export function isUserOnline(userId) {
  const ws = connectedUsers.get(userId);
  return ws && ws.readyState === 1;
}

/**
 * Get count of online users
 */
export function getOnlineUserCount() {
  return connectedUsers.size;
}

export { connectedUsers };
