
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import apiClient from '../services/apiClient';
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

const ChatList: React.FC<{ currentUser?: UserProfile }> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [chats, setChats] = useState<ChatData[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const fetchingUsersRef = React.useRef<Record<string, boolean>>({});
  const [selectedMatch, setSelectedMatch] = useState<MatchProfile | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Long-press state
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChatUsername, setSelectedChatUsername] = useState<string>('');
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // Long-press handlers
  const handleTouchStart = (chatId: string, username: string) => {
    console.log('[DEBUG] Touch start detected on chat:', chatId);
    const timer = setTimeout(() => {
      console.log('[DEBUG] Long-press triggered on chat:', chatId);
      setSelectedChatId(chatId);
      setSelectedChatUsername(username);
      setOptionsModalOpen(true);
    }, 500); // 500ms long-press
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    console.log('[DEBUG] Touch end detected');
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleChatItemClick = (e: React.MouseEvent, chatId: string, otherUser: UserProfile | null) => {
    console.log('[DEBUG] Chat item clicked, optionsModalOpen:', optionsModalOpen);
    // Don't navigate if options modal is open
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
      setChats(prev => prev.filter(c => c.id !== selectedChatId));
      setOptionsModalOpen(false);
      console.log('[DEBUG ChatList] Chat deleted successfully');
    } catch (err: any) {
      console.error('[ERROR ChatList] Failed to delete chat:', err);
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
      setChats(prev => prev.filter(c => c.id !== selectedChatId));
      setOptionsModalOpen(false);
      console.log('[DEBUG ChatList] Chat blocked successfully');
    } catch (err: any) {
      console.error('[ERROR ChatList] Failed to block chat:', err);
      showAlert('Error', 'Failed to block chat. Please try again.');
    } finally {
      setOptionsLoading(false);
      setSelectedChatId(null);
      setSelectedChatUsername('');
    }
  };

  // Load chats and users on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('[DEBUG ChatList] Loading chats and users');

        // Fetch chats and all users
        const [chatsData, usersData] = await Promise.all([
          apiClient.getChats(),
          apiClient.getAllUsers(),
        ]);

        console.log('[DEBUG ChatList] Loaded', chatsData.length, 'chats and', usersData.length, 'users');
        
        // Frontend deduplication: Keep only the latest chat per unique pair of participants
        const chatsByParticipantsKey: Record<string, any> = {};
        const dedupedChats: any[] = [];
        
        for (const chat of chatsData) {
          const key = [...(chat.participants || [])].sort().join(':');
          
          if (!chatsByParticipantsKey[key]) {
            chatsByParticipantsKey[key] = chat;
            dedupedChats.push(chat);
          } else {
            // Keep the one with later lastUpdated
            if (chat.lastUpdated > chatsByParticipantsKey[key].lastUpdated) {
              const idx = dedupedChats.indexOf(chatsByParticipantsKey[key]);
              dedupedChats[idx] = chat;
              chatsByParticipantsKey[key] = chat;
            }
          }
        }
        
        if (dedupedChats.length < chatsData.length) {
          console.log('[DEBUG ChatList] Deduplication removed', chatsData.length - dedupedChats.length, 'duplicate chats');
        }
        
        // Sort chats: unread first (descending unreadCount), then by lastUpdated
        const sorted = dedupedChats.slice().sort((a: any, b: any) => {
          const ua = (a.unreadCount || 0);
          const ub = (b.unreadCount || 0);
          if (ua !== ub) return ub - ua;
          return b.lastUpdated - a.lastUpdated;
        });
        setChats(sorted);
        // Sanitize users list: filter out null/invalid entries
        const saneUsers = (usersData || []).filter((u: any) => u && u.id);
        setAllUsers(saneUsers);
      } catch (err: any) {
        console.error('[ERROR ChatList] Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Get the other user in a chat
  const getOtherUser = (chat: ChatData): UserProfile | null => {
    if (!currentUser) {
      console.log('[DEBUG ChatList] No currentUser available');
      return null;
    }
    const otherUserId = chat.participants.find(id => id !== currentUser.id);
    console.log('[DEBUG ChatList] Chat participants:', chat.participants, 'Current user:', currentUser.id, 'Other user ID:', otherUserId);
    let otherUser = allUsers.find(u => u && (u as any).id === otherUserId) as UserProfile | undefined;
    if (!otherUser && otherUserId && !fetchingUsersRef.current[otherUserId]) {
      // Fetch missing participant profile and add to allUsers cache
      fetchingUsersRef.current[otherUserId] = true;
      apiClient.getUser(otherUserId).then((u) => {
        if (!u) return;
        setAllUsers(prev => {
          // avoid duplicates and nulls
          if (prev.find(p => p && p.id === u.id)) return prev;
          return [...prev, u];
        });
      }).catch(err => {
        console.warn('[WARN ChatList] Failed to fetch missing user:', otherUserId, err);
      }).finally(() => {
        fetchingUsersRef.current[otherUserId] = false;
      });
    }

    console.log('[DEBUG ChatList] Found user:', otherUser?.name || 'NOT FOUND');
    return otherUser || null;
  };

  const handleChatClick = (chatId: string, otherUser: UserProfile | null) => {
    console.log('[DEBUG ChatList] Navigating to chat:', chatId);
    navigate(`/chat/${otherUser?.id || chatId}`, { 
      state: { matchedProfile: otherUser }
    });
  };

  const handleMatchClick = (match: MatchProfile) => {
    setSelectedMatch(match);
    setCurrentImageIndex(0);
  };

  const closeModal = () => {
    setSelectedMatch(null);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (selectedMatch) {
      setCurrentImageIndex((prev) => (prev + 1) % selectedMatch.images.length);
    }
  };

  const prevImage = () => {
    if (selectedMatch) {
      setCurrentImageIndex((prev) => (prev - 1 + selectedMatch.images.length) % selectedMatch.images.length);
    }
  };

  const getLastMessage = (chat: ChatData): string => {
    if (!chat.messages || chat.messages.length === 0) {
      return 'No messages yet';
    }
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
      <div className="md:hidden p-4 border-b">
        <h2 className="text-xl font-bold text-gray-800">Messages</h2>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-500 text-sm">Loading chats...</p>
          </div>
        </div>
      ) : (
        <>
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
                      className={`flex items-center gap-4 p-4 transition-colors cursor-pointer group pointer-events-auto ${chat.unreadCount > 0 ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50 active:bg-gray-100'}`}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="relative">
                        <img
                          src={otherUser.images?.[0] || 'https://via.placeholder.com/56'}
                          className="w-14 h-14 rounded-full object-cover shadow-sm border border-gray-100"
                          alt={otherUser.username || otherUser.name}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <div className="flex flex-col">
                            <h4 className={`text-gray-900 truncate text-sm ${chat.unreadCount > 0 ? 'font-black' : 'font-bold'}`}>
                              {otherUser.username || otherUser.name}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2">
                            {chat.unreadCount > 0 && (
                              <span className="inline-flex items-center justify-center bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                              {getTimeAgo(chat.lastUpdated)}
                            </span>
                          </div>
                        </div>
                        <p className={`text-xs truncate font-medium ${chat.unreadCount > 0 ? 'text-gray-600 font-semibold' : 'text-gray-400'}`}>
                          {getLastMessage(chat)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Chat Options Modal */}
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