import React, { useState, useEffect } from 'react';
import { useWebSocketContext } from '../services/WebSocketProvider';
import apiClient from '../services/apiClient';

interface MatchNotification {
  matchId: string;
  matchedWith: {
    id: string;
    name: string;
    profilePicture?: string;
    bio?: string;
    age?: number;
    location?: string;
    interests?: string[];
  };
  compatibility: {
    interestMatch: number;
    ageMatch: number;
    mutualInterests?: string[];
  };
  timestamp: string;
}

interface MatchNotificationCenterProps {
  userId: string;
}

export const MatchNotificationCenter: React.FC<MatchNotificationCenterProps> = ({ userId }) => {
  const [notification, setNotification] = useState<MatchNotification | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { addMessageHandler } = useWebSocketContext();

  useEffect(() => {
    console.log('[MatchNotificationCenter] Registered for user:', userId);
    
    // Register handler for match notifications
    const unsubscribe = addMessageHandler((data: any) => {
      console.log('[MatchNotificationCenter] Received WebSocket data:', data);
      
      if (data.type === 'match') {
        console.log('[MatchNotificationCenter] MATCH DETECTED!', data);
        setNotification({
          matchId: data.matchId,
          matchedWith: data.matchedWith,
          compatibility: data.compatibility,
          timestamp: data.timestamp
        });
        setShowModal(true);

        // Auto-hide after 10 seconds if user doesn't interact
        setTimeout(() => {
          setShowModal(false);
        }, 10000);
      }
    });

    return unsubscribe;
  }, [userId, addMessageHandler]);

  const handleSayHello = () => {
    if (notification?.matchedWith.id) {
      (async () => {
        try {
          const chat = await apiClient.createOrGetChat(notification.matchedWith.id);
          const chatId = chat?.id || chat?._id;
          if (chatId) {
            window.location.href = `/#/chat/${chatId}`;
          } else {
            // Fallback: navigate to chat list with query
            window.location.href = `/chats?userId=${notification.matchedWith.id}`;
          }
        } catch (err) {
          console.error('[MatchNotificationCenter] Failed to create/get chat:', err);
          window.location.href = `/chats?userId=${notification.matchedWith.id}`;
        }
      })();
    }
  };

  const handleViewProfile = () => {
    if (notification?.matchedWith.id) {
      window.location.href = `/profile/${notification.matchedWith.id}`;
    }
  };

  if (!showModal || !notification) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden animate-pulse">
        {/* Header - Celebratory */}
        <div className="bg-gradient-to-r from-pink-500 to-red-500 p-6 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-white text-2xl font-bold">It's a Match!</h2>
          <p className="text-white/90 text-sm mt-1">You have a new connection</p>
        </div>

        {/* Match Photo */}
        {notification.matchedWith.profilePicture && (
          <div className="flex justify-center p-6">
            <img
              src={notification.matchedWith.profilePicture}
              alt={notification.matchedWith.name}
              className="w-32 h-32 rounded-full object-cover border-4 border-pink-500 shadow-lg"
            />
          </div>
        )}

        {/* Match Info */}
        <div className="px-6 py-4 text-center">
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            {notification.matchedWith.name}
            {notification.matchedWith.age && (
              <span className="text-gray-600 font-normal ml-2">{notification.matchedWith.age}</span>
            )}
          </h3>

          {notification.matchedWith.location && (
            <p className="text-gray-600 text-sm mb-3">📍 {notification.matchedWith.location}</p>
          )}

          {notification.matchedWith.bio && (
            <p className="text-gray-700 text-sm mb-4 italic">&quot;{notification.matchedWith.bio}&quot;</p>
          )}

          {/* Compatibility Scores */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="text-gray-700 font-semibold text-sm mb-3">Compatibility</h4>
            <div className="flex gap-4 justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-500">
                  {notification.compatibility.interestMatch}%
                </div>
                <p className="text-xs text-gray-600">Interest Match</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {Math.round(notification.compatibility.ageMatch)}%
                </div>
                <p className="text-xs text-gray-600">Age Match</p>
              </div>
            </div>

            {notification.compatibility.mutualInterests && notification.compatibility.mutualInterests.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-600 mb-2">Shared interests:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {notification.compatibility.mutualInterests.slice(0, 3).map((interest) => (
                    <span key={interest} className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full">
                      {interest}
                    </span>
                  ))}
                  {notification.compatibility.mutualInterests.length > 3 && (
                    <span className="text-xs text-gray-600">+{notification.compatibility.mutualInterests.length - 3} more</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* All Interests */}
          {notification.matchedWith.interests && notification.matchedWith.interests.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-600 mb-2">Interests:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {notification.matchedWith.interests.slice(0, 5).map((interest) => (
                  <span key={interest} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 flex gap-3">
          <button
            onClick={handleViewProfile}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
          >
            View Profile
          </button>
          <button
            onClick={handleSayHello}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-semibold rounded-lg transition"
          >
            Say Hello 💬
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={() => setShowModal(false)}
          className="w-full py-2 text-gray-600 hover:text-gray-800 border-t text-sm"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
};

export default MatchNotificationCenter;
