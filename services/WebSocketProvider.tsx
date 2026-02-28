import React, { createContext, useContext, useRef, useCallback, useEffect, ReactNode } from 'react';

interface WebSocketContextType {
  addMessageHandler: (handler: (data: any) => void) => () => void;
  sendMessage: (message: any) => void;
  sendTypingStatus: (chatId: string, isTyping: boolean) => void;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  userId: string | null;
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ userId, children }) => {
  const wsRef                = useRef<WebSocket | null>(null);
  const messageHandlersRef   = useRef<Set<(data: any) => void>>(new Set());
  const reconnectTimeoutRef  = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef      = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef      = useRef(false);
  const isMountedRef         = useRef(true);
  const reconnectDelayRef    = useRef(3000); // start at 3s, back off on repeated failures
  const [isConnected, setIsConnected] = React.useState(false);

  const cleanup = useCallback(() => {
    if (pingIntervalRef.current)     { clearInterval(pingIntervalRef.current);   pingIntervalRef.current = null; }
    if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
  }, []);

  const connect = useCallback(() => {
    // Guard: don't open a second connection if one is already open or being opened
    if (!userId) return;
    if (isConnectingRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    isConnectingRef.current = true;

    const wsEnv = import.meta.env.VITE_WS_URL;
    const wsUrl = wsEnv
      ? wsEnv
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

    console.log('[WS] Connecting to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        isConnectingRef.current = false;
        reconnectDelayRef.current = 3000; // reset backoff on success
        console.log('[WS] Connected');
        setIsConnected(true);

        ws.send(JSON.stringify({ type: 'register', userId }));

        // Keep-alive ping every 30s
        cleanup();
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WS onmessage] Received message type:', data.type, 'Full data:', data);

          // Dispatch global event so ChatList and other components can react
          if (data.type === 'new_message') {
            window.dispatchEvent(new CustomEvent('ws:new_message', { detail: data }));
          }
          if (data.type === 'typing_status') {
            window.dispatchEvent(new CustomEvent('ws:typing', { detail: data }));
          }
          if (data.type === 'call_incoming') {
            console.log('[WS onmessage] Dispatching ws:call_incoming event with data:', data);
            const event = new CustomEvent('ws:call_incoming', { detail: data });
            window.dispatchEvent(event);
            console.log('[WS onmessage] ws:call_incoming event dispatched');
          }
          if (data.type === 'call_offer' || data.type === 'call_answer' || data.type === 'ice_candidate' || data.type === 'call_end') {
            window.dispatchEvent(new CustomEvent('ws:webrtc', { detail: data }));
          }

          // Notify all registered handlers
          messageHandlersRef.current.forEach(handler => {
            try { handler(data); } catch (err) {
              console.error('[WS] Handler error:', err);
            }
          });
        } catch (err) {
          console.error('[WS] Failed to parse message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        isConnectingRef.current = false;
      };

      ws.onclose = (event) => {
        isConnectingRef.current = false;
        setIsConnected(false);
        cleanup();

        // Don't reconnect if intentionally closed (code 1000) or unmounted
        if (!isMountedRef.current || event.code === 1000) return;

        // Exponential backoff: 3s → 6s → 12s → max 30s
        const delay = Math.min(reconnectDelayRef.current, 30000);
        reconnectDelayRef.current = delay * 2;
        console.log(`[WS] Disconnected. Reconnecting in ${delay / 1000}s...`);

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) connect();
        }, delay);
      };

    } catch (err) {
      console.error('[WS] Connection error:', err);
      isConnectingRef.current = false;
    }
  }, [userId, cleanup]);

  // Connect when userId becomes available, disconnect on unmount or userId change
  useEffect(() => {
    isMountedRef.current = true;

    if (userId) connect();

    return () => {
      isMountedRef.current = false;
      cleanup();
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
  }, [userId]); // intentionally not including connect — userId change is the only trigger

  const addMessageHandler = useCallback((handler: (data: any) => void) => {
    messageHandlersRef.current.add(handler);
    return () => { messageHandlersRef.current.delete(handler); };
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WS] Cannot send — not connected');
    }
  }, []);

  const sendTypingStatus = useCallback((chatId: string, isTyping: boolean) => {
    sendMessage({ type: 'typing_status', chatId, isTyping });
  }, [sendMessage]);

  return (
    <WebSocketContext.Provider value={{ addMessageHandler, sendMessage, sendTypingStatus, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  return context;
};

// Custom hook for chat-specific WebSocket usage
export const useWebSocket = (userId: string, chatId: string | null, messageHandler: (data: any) => void) => {
  const { addMessageHandler, sendTypingStatus, isConnected } = useWebSocketContext();

  // Add the message handler when the hook is used
  useEffect(() => {
    const removeHandler = addMessageHandler(messageHandler);
    return removeHandler;
  }, [addMessageHandler, messageHandler]);

  // Return the WebSocket instance and sendTypingStatus function
  return {
    sendTypingStatus: (isTyping: boolean) => sendTypingStatus(chatId || '', isTyping),
    ws: null, // WebSocket instance not directly exposed, but can be added if needed
  };
};