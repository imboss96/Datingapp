import { useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for WebSocket connection and notifications
 * @param {string} userId - Current user ID
 * @param {Function} onMessageNotification - Callback when new message arrives
 * @param {Function} onTypingIndicator - Callback when someone is typing
 */
export const useWebSocket = (userId, onMessageNotification, onTypingIndicator) => {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);

  const connect = useCallback(() => {
    if (!userId) {
      console.log('[WebSocket] Cannot connect: userId not provided');
      return;
    }

    // Determine WebSocket URL
    // Priority:
    // 1. Environment variable VITE_WS_URL (for production)
    // 2. Auto-detect from current location (for development)
    
    let wsUrl: string;
    
    const wsEnv = import.meta.env.VITE_WS_URL;
    if (wsEnv) {
      // Production: Use environment variable
      wsUrl = wsEnv;
      console.log('[WebSocket] Using environment URL:', wsUrl);
    } else {
      // Development: Auto-detect from current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host; // includes hostname:port
      wsUrl = `${protocol}//${host}/ws`;
      console.log('[WebSocket] Using auto-detected URL:', wsUrl);
    }

    console.log('[WebSocket] Connecting to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        // Register user
        ws.send(JSON.stringify({
          type: 'register',
          userId: userId
        }));

        // Start ping interval to keep connection alive
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Received:', data.type);

          if (data.type === 'new_message' && onMessageNotification) {
            onMessageNotification(data);
          } else if (data.type === 'registered') {
            console.log('[WebSocket] Registration confirmed');
          } else if (data.type === 'pong') {
            console.log('[WebSocket] Pong received');
          } else if (data.type === 'typing_status' && onTypingIndicator) {
            console.log('[WebSocket] Typing status from', data.userId, ':', data.isTyping);
            onTypingIndicator(data);
          }
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected, attempting to reconnect in 5 seconds...');
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        
        // Attempt to reconnect
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WebSocket] Connection error:', err);
    }
  }, [userId, onMessageNotification]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [userId, connect]);

  const sendTypingStatus = (chatId: string, isTyping: boolean) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        type: 'typing_status',
        chatId: chatId,
        isTyping: isTyping
      }));
    }
  };

  return {
    isConnected: wsRef.current?.readyState === 1,
    ws: wsRef.current,
    sendTypingStatus
  };
};

export default useWebSocket;
