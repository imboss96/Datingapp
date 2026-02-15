import { useCallback, useRef, useEffect, useState } from 'react';
import { useWebSocketContext } from './WebSocketProvider';

export const useTypingIndicator = (chatId: string, otherUserId: string) => {
  const { sendMessage } = useWebSocketContext();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  // Handle typing start/stop
  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendMessage({
        type: 'typing_status',
        chatId,
        isTyping: true
      });
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to mark as not typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      sendMessage({
        type: 'typing_status',
        chatId,
        isTyping: false
      });
    }, 2000);
  }, [chatId, sendMessage]);

  // Listen for other user typing
  const handleTypingIndicator = useCallback((data: any) => {
    if (data.type === 'typing_status' && data.chatId === chatId) {
      setOtherUserTyping(data.isTyping);
    }
  }, [chatId]);

  useEffect(() => {
    // Subscribe to typing events
    // This will be handled by the message handler in ChatRoom
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { handleTyping, otherUserTyping, setOtherUserTyping };
};
