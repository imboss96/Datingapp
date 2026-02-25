import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import apiClient from '../services/apiClient';
import { formatLastSeen } from '../services/lastSeenUtils';
import ChatOptionsModal from './ChatOptionsModal';
import { useAlert } from '../services/AlertContext';

interface ChatData {
  id: string;
  participants: string[];
  messages: Array<{
    id: string;
    senderId: string;
    text: string;
    timestamp: number;
  }>;
  lastUpdated: number;
  unreadCount?: number;
}

interface MatchProfile {
  id: string;
  name: string;
  username?: string;
  age: number;
  location: string;
  bio: string;
  images: string[];
  interests: string[];
  image: string;
}

const CACHE_KEY_CHATS = 'cached_chats';
const CACHE_KEY_USERS = 'cached_users';

const ChatList: React.FC<{ currentUser?: UserProfile }> = ({ currentUser }) => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const fetchingUsersRef = React.useRef<Record<string, boolean>>({});

  // Load cached data immediately for instant display
  const getCachedChats = (): ChatData[] => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_CHATS);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  };

  const getCachedUsers = (): UserProfile[] => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_USERS);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  };

  const [chats, setChats] = useState<ChatData[]>(getCachedChats);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(getCachedUsers);
  const [loading, setLoading] = useState(chats.length === 0); // only show spinner if no cache
  const [refreshing, setRefreshing] = useState(false);

  const [selectedMatch, setSelectedMatch] = useState<MatchProfile | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Long-press state
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChatUsername, setSelectedChatUsername] = useState<string>('');
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const deduplicateAndSort = (chatsData: ChatData[]): ChatData[] => {
    const chatsByParticipantsKey: Record<string, ChatData> = {};
    const dedupedChats: ChatData[] = [];

    for (const chat of chatsData) {
      const key = [...(chat.participants || [])].sort().join(':');
      if (!chatsByParticipantsKey[key]) {
        chatsByParticipantsKey[key] = chat;
        dedupedChats.push(chat);
      } else if (chat.lastUpdated > chatsByParticipantsKey[key].lastUpdated) {
        const idx = dedupedChats.indexOf(chatsByParticipantsKey[key]);
        dedupedChats[idx] = chat;
        chatsByParticipantsKey[key] = chat;
      }
    }

    return dedupedChats.sort((a, b) => {
      const ua = a.unreadCount || 0;
      const ub = b.unreadCount || 0;
      if (ua !== ub) return ub - ua;
      return b.lastUpdated - a.lastUpdated;
    });
  };

  const loadData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      const [chatsData, usersData] = await Promise.all([
        apiClient.getChats(),
        apiClient.getAllUsers(),
      ]);

      const sorted = deduplicateAndSort(chatsData);
      const saneUsers = (usersData || []).filter((u: any) => u && u.id);

      setChats(sorted);
      setAllUsers(saneUsers);

      // Save to cache for next visit
      try {
        localStorage.setItem(CACHE_KEY_CHATS, JSON.stringify(sorted));
        localStorage.setItem(CACHE_KEY_USERS, JSON.stringify(saneUsers));
      } catch { /* storage full, ignore */ }

    } catch (err: any) {
      console.error('[ERROR ChatList] Failed to load data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // If we have cached data, load in background silently
    // If no cache, show spinner
    const hasCache = chats.length > 0;
    loadData(!hasCache);
  }, []);

  // Long-press handlers
  const handleTouchStart = (chatId: string, username: string) => {
    const timer = setTimeout(() => {
      setSelectedChatId(chatId);
      setSelectedChatUsername(username);
      setOptionsModalOpen(true);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleChatItemClick = (e: React.MouseEvent, chatId: string, otherUser: UserProfile | null) => {
    if (optionsModalOpen) {
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    handleChatClick(chatId, otherUser);
  };

  const handleDeleteChat = async () => {
    if (!selectedChatId) return;
    try {
      setOptionsLoading(true);
      await apiClient.deleteChat(selectedChatId);
      setChats(prev => {
        const updated = prev.filter(c => c.id !== selectedChatId);
        localStorage.setItem(CACHE_KEY_CHATS, JSON.stringify(updated));
        return updated;
      });
      setOptionsModalOpen(false);
    } catch (err: any) {
      showAlert('Error', 'Failed to delete chat. Please try again.');
    } finally {
      setOptionsLoading(false);
      setSelectedChatId(null);
      setSelectedChatUsername('');
    }
  };

  const handleBlockChat = async () => {
    if (!selectedChatId) return;
    try {
      setOptionsLoading(true);
      await apiClient.blockChatRequest(selectedChatId);
      setChats(prev => {
        const updated = prev.filter(c => c.id !== selectedChatId);
        localStorage.setItem(CACHE_KEY_CHATS, JSON.stringify(updated));
        return updated;
      });
      setOptionsModalOpen(false);
    } catch (err: any) {
      showAlert('Error', 'Failed to block chat. Please try again.');
    } finally {
      setOptionsLoading(false);
      setSelectedChatId(null);
      setSelectedChatUsername('');
    }
  };

  // Get the other user in a chat - memoized to avoid excess renders
  const getOtherUser = useCallback((chat: ChatData): UserProfile | null => {
    if (!currentUser) return null;
    const otherUserId = chat.participants.find(id => id !== currentUser.id);
    if (!otherUserId) return null;

    const otherUser = allUsers.find(u => u && (u as any).id === otherUserId) as UserProfile | undefined;

    if (!otherUser && !fetchingUsersRef.current[otherUserId]) {
      fetchingUsersRef.current[otherUserId] = true;
      apiClient.getUser(otherUserId).then((u) => {
        if (!u) return;
        setAllUsers(prev => {
          if (prev.find(p => p && p.id === u.id)) return prev;
          const updated = [...prev, u];
          localStorage.setItem(CACHE_KEY_USERS, JSON.stringify(updated));
          return updated;
        });
      }).catch(() => {}).finally(() => {
        fetchingUsersRef.current[otherUserId] = false;
      });
    }

    return otherUser || null;
  }, [currentUser, allUsers]);

  const handleChatClick = (chatId: string, otherUser: UserProfile | null) => {
    navigate(`/chat/${otherUser?.id || chatId}`, {
      state: { matchedProfile: otherUser }
    });
  };

  const getLastMessage = (chat: ChatData): string => {
    if (!chat.messages || chat.messages.length === 0) return 'No messages yet';
    return chat.messages[chat.messages.length - 1].text;
  };

  const getTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="h-full bg-white flex flex-col pointer-events-auto">
      <div className="md:hidden p-4 border-b flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Messages</h2>
        {refreshing && (
          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-500 text-sm">Loading chats...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              Conversations ({chats.length})
            </h3>
          </div>
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <i className="fa-solid fa-message text-4xl text-gray-300 mb-3"></i>
              <p className="text-gray-500 text-sm">No conversations yet. Start swiping to match!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {chats.map((chat) => {
                const otherUser = getOtherUser(chat);
                if (!otherUser) return null;

                return (
                  <div
                    key={chat.id}
                    onClick={(e) => handleChatItemClick(e, chat.id, otherUser)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleChatClick(chat.id, otherUser);
                      }
                    }}
                    onTouchStart={() => handleTouchStart(chat.id, otherUser.username || otherUser.name)}
                    onTouchEnd={handleTouchEnd}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSelectedChatId(chat.id);
                      setSelectedChatUsername(otherUser.username || otherUser.name);
                      setOptionsModalOpen(true);
                    }}
                    className={`flex items-center gap-4 p-4 transition-colors cursor-pointer group pointer-events-auto ${
                      (chat.unreadCount || 0) > 0 ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50 active:bg-gray-100'
                    }`}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="relative">
                      <img
                        src={otherUser.images?.[0] || 'https://via.placeholder.com/56'}
                        className="w-14 h-14 rounded-full object-cover shadow-sm border border-gray-100"
                        alt={otherUser.username || otherUser.name}
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <h4 className={`text-gray-900 truncate text-sm ${(chat.unreadCount || 0) > 0 ? 'font-black' : 'font-bold'}`}>
                          {otherUser.username || otherUser.name}
                        </h4>
                        <div className="flex items-center gap-2">
                          {(chat.unreadCount || 0) > 0 && (
                            <span className="inline-flex items-center justify-center bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                              {(chat.unreadCount || 0) > 9 ? '9+' : chat.unreadCount}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                            {getTimeAgo(chat.lastUpdated)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-xs truncate font-medium ${(chat.unreadCount || 0) > 0 ? 'text-gray-600 font-semibold' : 'text-gray-400'}`}>
                          {getLastMessage(chat)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold uppercase tracking-tight ${otherUser.isOnline ? 'text-emerald-600' : 'text-gray-500'}`}>
                          {formatLastSeen(otherUser.lastSeen, !!otherUser.isOnline)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ChatOptionsModal
        isOpen={optionsModalOpen}
        onClose={() => {
          setOptionsModalOpen(false);
          setSelectedChatId(null);
          setSelectedChatUsername('');
        }}
        onDelete={handleDeleteChat}
        onBlock={handleBlockChat}
        chatUsername={selectedChatUsername}
        loading={optionsLoading}
      />
    </div>
  );
};

export default ChatList;