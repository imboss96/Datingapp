import { useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for WebSocket connection and notifications
 */
export const useWebSocket = (userId: string, onMessageNotification: any = null, onTypingIndicator: any = null) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageHandlersRef = useRef<Set<(data: any) => void>>(new Set());
  const isConnectingRef = useRef(false);
  const isMountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!userId || isConnectingRef.current) {
      console.debug('[WebSocket] Cannot connect: userId not provided or already connecting');
      return;
    }

    if (wsRef.current?.readyState === 1) {
      console.log('[WebSocket] Already connected');
      return;
    }

    isConnectingRef.current = true;
    let wsUrl: string;
    
    const wsEnv = import.meta.env.VITE_WS_URL;
    if (wsEnv) {
      wsUrl = wsEnv;
      console.log('[WebSocket] Using environment URL:', wsUrl);
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}/ws`;
      console.log('[WebSocket] Using auto-detected URL:', wsUrl);
    }

    console.log('[WebSocket] Connecting to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        isConnectingRef.current = false;
        console.log('[WebSocket] Connected');
        ws.send(JSON.stringify({
          type: 'register',
          userId: userId
        }));

        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Received:', data.type);

          // Call all registered message handlers
          messageHandlersRef.current.forEach(handler => {
            try {
              handler(data);
            } catch (err) {
              console.error('[WebSocket] Error in message handler:', err);
            }
          });

          // Legacy callbacks
          if (data.type === 'new_message' && onMessageNotification) {
            onMessageNotification(data);
          } else if (data.type === 'registered') {
            console.log('[WebSocket] Registration confirmed');
          } else if (data.type === 'pong') {
            console.log('[WebSocket] Pong received');
          } else if (data.type === 'typing_status' && onTypingIndicator) {
            console.log('[WebSocket] Typing status received');
            onTypingIndicator(data);
          }
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        isConnectingRef.current = false;
      };

      ws.onclose = () => {
        isConnectingRef.current = false;
        console.log('[WebSocket] Disconnected, attempting to reconnect in 5 seconds...');
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        if (isMountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WebSocket] Connection error:', err);
      isConnectingRef.current = false;
    }
  }, [userId, onMessageNotification, onTypingIndicator]);

  useEffect(() => {
    isMountedRef.current = true;
    if (userId) {
      connect();
    }

    return () => {
      isMountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [userId]);

  const sendTypingStatus = useCallback((chatId: string, isTyping: boolean) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        type: 'typing_status',
        chatId: chatId,
        isTyping: isTyping
      }));
    }
  }, []);

  const addMessageHandler = useCallback((handler: (data: any) => void) => {
    messageHandlersRef.current.add(handler);
    return () => {
      messageHandlersRef.current.delete(handler);
    };
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    isConnected: wsRef.current?.readyState === 1,
    ws: wsRef.current,
    sendTypingStatus,
    addMessageHandler,
    sendMessage
  };
};

export default useWebSocket;
