import React, { createContext, useContext, useRef, useCallback, useEffect, ReactNode } from 'react';

interface WebSocketContextType {
  addMessageHandler: (handler: (data: any) => void) => () => void;
  sendMessage: (message: any) => void;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  userId: string | null;
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ userId, children }) => {
  const wsRef = useRef<WebSocket | null>(null);
  const messageHandlersRef = useRef<Set<(data: any) => void>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const isMountedRef = useRef(true);
  const [isConnected, setIsConnected] = React.useState(false);

  const connect = useCallback(() => {
    if (!userId || isConnectingRef.current) {
      console.log('[WebSocketProvider] Cannot connect: userId not provided or already connecting');
      return;
    }

    if (wsRef.current?.readyState === 1) {
      console.log('[WebSocketProvider] Already connected');
      return;
    }

    isConnectingRef.current = true;
    let wsUrl: string;

    const wsEnv = import.meta.env.VITE_WS_URL;
    if (wsEnv) {
      wsUrl = wsEnv;
      console.log('[WebSocketProvider] Using environment URL:', wsUrl);
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}/ws`;
      console.log('[WebSocketProvider] Using auto-detected URL:', wsUrl);
    }

    console.log('[WebSocketProvider] Attempting to connect to:', wsUrl, 'for userId:', userId);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        isConnectingRef.current = false;
        console.log('[WebSocketProvider] 🟢 Connected successfully');
        setIsConnected(true);
        ws.send(JSON.stringify({
          type: 'register',
          userId: userId
        }));
        console.log('[WebSocketProvider] Sent registration message for userId:', userId);

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
          console.log('[WebSocketProvider] 📨 Message received:', data.type, data);

          // Call all registered message handlers
          messageHandlersRef.current.forEach(handler => {
            try {
              handler(data);
            } catch (err) {
              console.error('[WebSocketProvider] Error in message handler:', err);
            }
          });
        } catch (err) {
          console.error('[WebSocketProvider] Error parsing message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocketProvider] ❌ Error:', error);
        isConnectingRef.current = false;
        setIsConnected(false);
      };

      ws.onclose = () => {
        isConnectingRef.current = false;
        console.log('[WebSocketProvider] 🔴 Disconnected, attempting to reconnect in 5 seconds...');
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        if (isMountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[WebSocketProvider] Reconnecting...');
            connect();
          }, 5000);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WebSocketProvider] ❌ Connection error:', err);
      isConnectingRef.current = false;
      setIsConnected(false);
    }
  }, [userId]);

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

  const addMessageHandler = useCallback((handler: (data: any) => void) => {
    console.log('[WebSocketProvider] Adding message handler');
    messageHandlersRef.current.add(handler);
    return () => {
      console.log('[WebSocketProvider] Removing message handler');
      messageHandlersRef.current.delete(handler);
    };
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return (
    <WebSocketContext.Provider value={{ addMessageHandler, sendMessage, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};
