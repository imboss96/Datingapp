
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PhotoModerationPanel from './PhotoModerationPanel';
import ChatModerationView from './ChatModerationView';
import PhotoVerificationReviewPanel from './PhotoVerificationReviewPanel';
import AdminPhotoVerificationDashboard from './AdminPhotoVerificationDashboard';
import apiClient from '../services/apiClient';

interface FlaggedItem {
  id: string;
  userId: string;
  message: string;
  status: 'pending' | 'warned' | 'banned' | 'dismissed';
  action?: string;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isFlagged?: boolean;
  flagReason?: string;
  isEditedByModerator?: boolean;
}

interface ModeratorChat {
  id: string;
  participants: string[];
  messages: Message[];
  lastUpdated: number;
  flaggedCount: number;
}

const FLAG_DATA = [
  { name: 'Mon', count: 12 },
  { name: 'Tue', count: 19 },
  { name: 'Wed', count: 15 },
  { name: 'Thu', count: 22 },
  { name: 'Fri', count: 30 },
  { name: 'Sat', count: 28 },
  { name: 'Sun', count: 14 },
];

const INITIAL_FLAGS: FlaggedItem[] = [];

const ModeratorPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'RESOLVED' | 'CHATS' | 'PHOTOS' | 'STALLED' | 'VERIFICATIONS'>('CHATS');
  const [flaggedItems, setFlaggedItems] = useState<FlaggedItem[]>(INITIAL_FLAGS);
  const [resolvedItems, setResolvedItems] = useState<FlaggedItem[]>([]);
  const [chats, setChats] = useState<ModeratorChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<ModeratorChat | null>(null);
  const [viewingChatModal, setViewingChatModal] = useState<ModeratorChat | null>(null);
  const [loadingChats, setLoadingChats] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const navigate = useNavigate();
  const [currentUserId] = useState<string>('moderator-' + Math.random().toString(36).substring(7));
  const [stalledChats, setStalledChats] = useState<any[]>([]);
  const [loadingStalled, setLoadingStalled] = useState(false);
  const [moderators, setModerators] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<Map<string, any>>(new Map());
  const [repliedChats, setRepliedChats] = useState<any[]>([]);
  const [loadingRepliedChats, setLoadingRepliedChats] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch flagged messages/items from backend
  const fetchFlaggedItems = async () => {
    try {
      setLoadingChats(true);
      // Fetch all chats and extract flagged messages
      const response = await apiClient.getChats();
      const allFlaggedItems: FlaggedItem[] = [];
      
      response.forEach((chat: any) => {
        if (chat.messages && Array.isArray(chat.messages)) {
          chat.messages.forEach((msg: Message) => {
            if (msg.isFlagged) {
              allFlaggedItems.push({
                id: msg.id,
                userId: msg.senderId,
                message: msg.text,
                status: 'pending',
                action: undefined
              });
            }
          });
        }
      });
      
      setFlaggedItems(allFlaggedItems);
    } catch (error) {
      console.error('[ERROR ModeratorPanel] Failed to fetch flagged items:', error);
      setFlaggedItems([]);
    } finally {
      setLoadingChats(false);
    }
  };

  // Fetch moderators
  const fetchModerators = async () => {
    try {
      // For now, hardcode some moderators. In a real app, you'd have an API endpoint
      setModerators([
        { id: 'mod1', name: 'Alice Johnson' },
        { id: 'mod2', name: 'Bob Smith' },
        { id: 'mod3', name: 'Carol Davis' }
      ]);
    } catch (error) {
      console.error('Failed to fetch moderators:', error);
    }
  };

  // Fetch chats on component mount
  useEffect(() => {
    // Clear search when switching tabs
    setSearchQuery('');
    
    if (activeTab === 'PENDING') {
      fetchRepliedChats();
    } else if (activeTab === 'CHATS') {
      fetchChats();
    } else if (activeTab === 'STALLED') {
      fetchStalledChats();
      fetchModerators();
    }
    
    // Set up auto-refresh based on active tab
    const refreshInterval = setInterval(() => {
      if (activeTab === 'PENDING') {
        fetchRepliedChats();
      } else if (activeTab === 'CHATS') {
        fetchChats();
      } else if (activeTab === 'STALLED') {
        fetchStalledChats();
      }
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, [activeTab]);

  const fetchChats = async () => {
    try {
      setLoadingChats(true);
      setChatError(null);
      const response = await apiClient.getChats();
      
      // Transform chats to include flagged count
      const transformedChats: ModeratorChat[] = response.map((chat: any) => {
        const flaggedCount = chat.messages?.filter((msg: Message) => msg.isFlagged).length || 0;
        return {
          ...chat,
          flaggedCount,
        };
      });

      // Collect all unique participant IDs
      const participantIds = new Set<string>();
      transformedChats.forEach(chat => {
        chat.participants.forEach(p => participantIds.add(p));
      });

      // Fetch user data for all unique participants
      const newUserMap = new Map(userMap);
      for (const userId of participantIds) {
        if (!newUserMap.has(userId)) {
          try {
            const userData = await apiClient.getUser(userId);
            if (userData) {
              newUserMap.set(userId, userData);
            } else {
              // If user not found, use UID as fallback username
              newUserMap.set(userId, { id: userId, username: userId, name: userId });
            }
          } catch (err) {
            // If fetch fails, use UID as fallback username
            newUserMap.set(userId, { id: userId, username: userId, name: userId });
          }
        }
      }
      setUserMap(newUserMap);

      // Sort by last updated, most recent first
      transformedChats.sort((a, b) => b.lastUpdated - a.lastUpdated);
      
      setChats(transformedChats);
      setLastRefresh(Date.now());
    } catch (error) {
      console.error('[ERROR ModeratorPanel] Failed to fetch chats:', error);
      setChatError('Failed to load chats. Using demo data.');
      // Fall back to demo chats
      setChats([
        {
          id: '1',
          participants: ['user1', 'user2'],
          messages: [],
          lastUpdated: Date.now(),
          flaggedCount: 2
        },
        {
          id: '2',
          participants: ['user3', 'user4'],
          messages: [],
          lastUpdated: Date.now() - 3600000,
          flaggedCount: 0
        },
        {
          id: '3',
          participants: ['user5', 'user6'],
          messages: [],
          lastUpdated: Date.now() - 7200000,
          flaggedCount: 1
        }
      ]);
    } finally {
      setLoadingChats(false);
    }
  };

  const fetchStalledChats = async () => {
    try {
      setLoadingStalled(true);
      const response = await apiClient.getStalledChats();
      setStalledChats(response.stalledChats || []);
    } catch (error) {
      console.error('[ERROR ModeratorPanel] Failed to fetch stalled chats:', error);
      setStalledChats([]);
    } finally {
      setLoadingStalled(false);
    }
  };

  const fetchRepliedChats = async () => {
    try {
      setLoadingRepliedChats(true);
      console.log('[DEBUG ModeratorPanel] Fetching replied chats...');
      const response = await apiClient.getRepliedChats();
      console.log('[DEBUG ModeratorPanel] Replied chats response:', response);
      
      // Collect participant IDs and fetch user profiles
      const participantIds = new Set<string>();
      response.repliedChats?.forEach((chat: any) => {
        if (chat.participants && Array.isArray(chat.participants)) {
          chat.participants.forEach((id: string) => participantIds.add(id));
        }
      });

      // Fetch user data for all participants
      const newUserMap = new Map(userMap);
      for (const userId of Array.from(participantIds)) {
        if (!newUserMap.has(userId)) {
          try {
            const userData = await apiClient.getUser(userId);
            newUserMap.set(userId, userData);
          } catch (error) {
            console.warn(`[WARN ModeratorPanel] Failed to fetch user ${userId}:`, error);
            newUserMap.set(userId, { id: userId, username: userId, name: userId });
          }
        }
      }
      setUserMap(newUserMap);

      console.log('[DEBUG ModeratorPanel] Setting replied chats:', response.repliedChats);
      setRepliedChats(response.repliedChats || []);
    } catch (error) {
      console.error('[ERROR ModeratorPanel] Failed to fetch replied chats:', error);
      setRepliedChats([]);
    } finally {
      setLoadingRepliedChats(false);
    }
  };

  const assignModerator = async (chatId: string, moderatorId: string) => {
    try {
      await apiClient.assignModeratorToChat(chatId, moderatorId);
      // Refresh stalled chats
      fetchStalledChats();
      // Could also refresh moderators list if needed
    } catch (error) {
      console.error('[ERROR ModeratorPanel] Failed to assign moderator:', error);
    }
  };

  // Filter function for Live Chats tab
  const getFilteredLiveChats = () => {
    if (!searchQuery.trim()) return chats;
    const query = searchQuery.toLowerCase();
    return chats.filter(chat => {
      const user1 = userMap.get(chat.participants[0]) || { id: chat.participants[0], username: chat.participants[0], name: chat.participants[0] };
      const user2 = userMap.get(chat.participants[1]) || { id: chat.participants[1], username: chat.participants[1], name: chat.participants[1] };
      const participantNames = `${user1.name || user1.username} ${user2.name || user2.username}`;
      const participantUsernames = `${user1.username} ${user2.username}`;
      const participantIds = `${chat.participants[0]} ${chat.participants[1]}`;
      
      return (
        chat.id.toLowerCase().includes(query) ||
        participantNames.toLowerCase().includes(query) ||
        participantUsernames.toLowerCase().includes(query) ||
        participantIds.toLowerCase().includes(query)
      );
    });
  };

  // Filter function for Replied Chats tab
  const getFilteredRepliedChats = () => {
    if (!searchQuery.trim()) return repliedChats;
    const query = searchQuery.toLowerCase();
    return repliedChats.filter(chat => {
      const user1 = userMap.get(chat.participants[0]) || { id: chat.participants[0], username: chat.participants[0], name: chat.participants[0] };
      const user2 = userMap.get(chat.participants[1]) || { id: chat.participants[1], username: chat.participants[1], name: chat.participants[1] };
      const participantNames = `${user1.name || user1.username} ${user2.name || user2.username}`;
      const participantUsernames = `${user1.username} ${user2.username}`;
      const participantIds = `${chat.participants[0]} ${chat.participants[1]}`;
      
      return (
        chat.id.toLowerCase().includes(query) ||
        participantNames.toLowerCase().includes(query) ||
        participantUsernames.toLowerCase().includes(query) ||
        participantIds.toLowerCase().includes(query)
      );
    });
  };

  // Filter function for Flagged/Pending items
  const getFilteredFlaggedItems = () => {
    if (!searchQuery.trim()) return flaggedItems;
    const query = searchQuery.toLowerCase();
    return flaggedItems.filter(item => {
      return (
        item.id.toLowerCase().includes(query) ||
        item.userId.toLowerCase().includes(query) ||
        item.message.toLowerCase().includes(query)
      );
    });
  };

  // Filter function for Stalled Chats
  const getFilteredStalledChats = () => {
    if (!searchQuery.trim()) return stalledChats;
    const query = searchQuery.toLowerCase();
    return stalledChats.filter(chat => {
      const participantIds = `${chat.participants[0]} ${chat.participants[1]}`;
      return (
        chat.id.toLowerCase().includes(query) ||
        participantIds.toLowerCase().includes(query)
      );
    });
  };

  const handleDismiss = (id: string) => {
    const item = flaggedItems.find(f => f.id === id);
    if (item) {
      setResolvedItems([...resolvedItems, { ...item, status: 'dismissed', action: 'Dismissed' }]);
      setFlaggedItems(flaggedItems.filter(f => f.id !== id));
    }
  };

  const handleWarn = (id: string) => {
    const item = flaggedItems.find(f => f.id === id);
    if (item) {
      setResolvedItems([...resolvedItems, { ...item, status: 'warned', action: 'User Warned' }]);
      setFlaggedItems(flaggedItems.filter(f => f.id !== id));
    }
  };

  const handleBan = (id: string) => {
    const item = flaggedItems.find(f => f.id === id);
    if (item) {
      setResolvedItems([...resolvedItems, { ...item, status: 'banned', action: 'User Banned' }]);
      setFlaggedItems(flaggedItems.filter(f => f.id !== id));
    }
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <div className="p-6 bg-white border-b shadow-sm">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <i className="fa-solid fa-shield-halved text-red-500"></i>
          Mod Center
        </h2>
        <p className="text-sm text-gray-500 mt-1">AI-assisted moderation & reporting</p>
      </div>

      {/* Active Chat Display */}
      {selectedChat && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b-2 border-blue-300 p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-4">
                <div className="w-12 h-12 rounded-full border-3 border-white bg-blue-200 flex items-center justify-center text-sm font-bold text-blue-700">
                  {selectedChat.participants[0]?.charAt(0).toUpperCase()}
                </div>
                {selectedChat.participants[1] && (
                  <div className="w-12 h-12 rounded-full border-3 border-white bg-purple-200 flex items-center justify-center text-sm font-bold text-purple-700">
                    {selectedChat.participants[1]?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    Moderating: {selectedChat.participants.slice(0, 2).join(' & ')}
                  </h3>
                  {selectedChat.flaggedCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full">
                      {selectedChat.flaggedCount} FLAGGED
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">Chat ID: {selectedChat.id}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedChat.messages?.length || 0} messages • Last updated: {new Date(selectedChat.lastUpdated).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewingChatModal(selectedChat)}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
              >
                <i className="fa-solid fa-magnifying-glass"></i>
                View & Moderate
              </button>
              <button
                onClick={() => setSelectedChat(null)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded-lg transition-colors"
              >
                ✕ Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 overflow-y-auto">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Security Analytics</h3>
          <div className="h-40 w-full" style={{ minWidth: 0, minHeight: 120 }}>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={FLAG_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <YAxis hide />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex bg-gray-200 p-1 rounded-xl mb-6">
          <button 
            onClick={() => setActiveTab('CHATS')}
            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'CHATS' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Live Chats
          </button>
          <button 
            onClick={() => setActiveTab('PENDING')}
            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'PENDING' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Replied Chats
          </button>
          <button 
            onClick={() => setActiveTab('STALLED')}
            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'STALLED' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Support
          </button>
          <button 
            onClick={() => setActiveTab('PHOTOS')}
            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'PHOTOS' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Photos
          </button>
          <button 
            onClick={() => setActiveTab('VERIFICATIONS')}
            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'VERIFICATIONS' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Verifications
          </button>
          <button 
            onClick={() => setActiveTab('RESOLVED')}
            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'RESOLVED' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Log
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by username, chat ID, user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-3.5 text-gray-400 text-sm"></i>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
        </div>

        {activeTab === 'PENDING' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-[10px] text-gray-500">
                Chats that have been replied to by moderators
              </div>
              <button
                onClick={() => fetchRepliedChats()}
                disabled={loadingRepliedChats}
                className="text-[10px] font-bold text-blue-500 hover:text-blue-600 disabled:opacity-50 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-all"
              >
                <i className={`fa-solid fa-rotate-right ${loadingRepliedChats ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>
            </div>
            {loadingRepliedChats ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="text-gray-500 text-sm mt-2">Loading replied chats...</p>
              </div>
            ) : repliedChats.length === 0 ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-check-circle text-4xl text-emerald-100 mb-2"></i>
                <p className="text-gray-400 text-sm">No replied chats yet. Get started!</p>
              </div>
            ) : getFilteredRepliedChats().length === 0 ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-search text-4xl text-gray-200 mb-2"></i>
                <p className="text-gray-400 text-sm">No chats match your search "{searchQuery}"</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-blue-500 hover:text-blue-600 text-sm mt-2"
                >
                  Clear search
                </button>
              </div>
            ) : (
              getFilteredRepliedChats().map(chat => {
                // Get user data from map, fallback to participant ID
                const user1 = userMap.get(chat.participants[0]) || { id: chat.participants[0], username: chat.participants[0], name: chat.participants[0] };
                const user2 = userMap.get(chat.participants[1]) || { id: chat.participants[1], username: chat.participants[1], name: chat.participants[1] };
                const participantNames = `${user1.name || user1.username} & ${user2.name || user2.username}`;
                const replyTime = new Date(chat.markedAsRepliedAt).toLocaleDateString() + ' ' + new Date(chat.markedAsRepliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div 
                    key={chat.id} 
                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                          {(user1.name || user1.username)[0]?.toUpperCase()}{(user2.name || user2.username)[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-gray-900">{participantNames}</h4>
                          <p className="text-[10px] text-gray-500">Chat ID: {chat.id}</p>
                        </div>
                      </div>
                      <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-0.5 rounded uppercase">Replied</span>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg mb-3 border border-gray-100">
                      <p className="text-xs text-gray-600 font-semibold mb-1">Last Message:</p>
                      {chat.messages && chat.messages.length > 0 ? (
                        <p className="text-xs text-gray-700 italic">"{chat.messages[chat.messages.length - 1].text.slice(0, 100)}{chat.messages[chat.messages.length - 1].text.length > 100 ? '...' : ''}"</p>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No messages</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-gray-500">
                        <i className="fa-solid fa-clock text-emerald-500 mr-1"></i>
                        Replied: {replyTime}
                      </div>
                      <button 
                        onClick={() => { setSelectedChat(chat); setViewingChatModal(chat); }}
                        className="py-1 px-3 bg-blue-500 text-white text-[10px] font-bold rounded-lg shadow-sm hover:bg-blue-600 active:scale-95 transition-all"
                      >
                        View Chat
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'CHATS' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-[10px] text-gray-500">
                Last updated: {new Date(lastRefresh).toLocaleTimeString()}
              </div>
              <button
                onClick={() => fetchChats()}
                disabled={loadingChats}
                className="text-[10px] font-bold text-blue-500 hover:text-blue-600 disabled:opacity-50 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-all"
              >
                <i className={`fa-solid fa-rotate-right ${loadingChats ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>
            </div>
            {chatError && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-lg text-sm">
                {chatError}
              </div>
            )}
            {loadingChats ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="text-gray-500 text-sm mt-2">Loading chats...</p>
              </div>
            ) : chats.length === 0 ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-comments text-4xl text-gray-200 mb-2"></i>
                <p className="text-gray-400 text-sm">No chats available</p>
              </div>
            ) : getFilteredLiveChats().length === 0 ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-search text-4xl text-gray-200 mb-2"></i>
                <p className="text-gray-400 text-sm">No chats match your search "{searchQuery}"</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-blue-500 hover:text-blue-600 text-sm mt-2"
                >
                  Clear search
                </button>
              </div>
            ) : (
              getFilteredLiveChats().map(chat => {
                // Get user data from map, fallback to participant ID
                const user1 = userMap.get(chat.participants[0]) || { id: chat.participants[0], username: chat.participants[0], name: chat.participants[0] };
                const user2 = userMap.get(chat.participants[1]) || { id: chat.participants[1], username: chat.participants[1], name: chat.participants[1] };
                const participantNames = `${user1.name || user1.username} & ${user2.name || user2.username}`;
                
                return (
                  <div 
                    key={chat.id} 
                    onClick={() => { setSelectedChat(chat); setViewingChatModal(chat); }}
                    className={`bg-white p-4 rounded-2xl border-2 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer hover:shadow-md ${
                      selectedChat?.id === chat.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-700">
                          {user1.name?.charAt(0).toUpperCase() || chat.participants[0].charAt(0).toUpperCase()}
                        </div>
                        {chat.participants[1] && (
                          <div className="w-8 h-8 rounded-full border-2 border-white bg-purple-200 flex items-center justify-center text-[10px] font-bold text-purple-700">
                            {user2.name?.charAt(0).toUpperCase() || chat.participants[1].charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">{participantNames}</h4>
                        <p className="text-[10px] text-gray-500">ID: {chat.id.substring(0, 8)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {chat.flaggedCount > 0 && (
                        <div className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-1 rounded-full">
                          {chat.flaggedCount} FLAGGED
                        </div>
                      )}
                      {selectedChat?.id === chat.id ? (
                        <i className="fa-solid fa-check-circle text-blue-500 text-lg"></i>
                      ) : (
                        <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'STALLED' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-[10px] text-gray-500">
                Chats with unanswered messages (24+ hours)
              </div>
              <button
                onClick={() => fetchStalledChats()}
                disabled={loadingStalled}
                className="text-[10px] font-bold text-blue-500 hover:text-blue-600 disabled:opacity-50 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-all"
              >
                <i className={`fa-solid fa-rotate-right ${loadingStalled ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>
            </div>
            {loadingStalled ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="text-gray-500 text-sm mt-2">Loading stalled chats...</p>
              </div>
            ) : stalledChats.length === 0 ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-clock text-4xl text-gray-200 mb-2"></i>
                <p className="text-gray-400 text-sm">No stalled chats found</p>
              </div>
            ) : (
              stalledChats.map(chat => (
                <div 
                  key={chat.id} 
                  className="bg-white p-4 rounded-2xl border-2 border-gray-100 hover:border-amber-300 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <img 
                          src={chat.sender?.profilePicture || 'https://via.placeholder.com/32x32?text=?'} 
                          alt={chat.sender?.name} 
                          className="w-8 h-8 rounded-full border-2 border-white" 
                        />
                        <img 
                          src={chat.receiver?.profilePicture || 'https://via.placeholder.com/32x32?text=?'} 
                          alt={chat.receiver?.name} 
                          className="w-8 h-8 rounded-full border-2 border-white" 
                        />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">
                          {chat.sender?.name} → {chat.receiver?.name}
                        </h4>
                        <p className="text-[10px] text-gray-500">
                          Stalled for {chat.hoursStalled} hours
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-amber-600 font-bold">
                        NEEDS HELP
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {new Date(chat.lastMessage?.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg mb-3">
                    <p className="text-[11px] text-gray-700 italic">
                      "{chat.lastMessage?.text?.substring(0, 100)}{chat.lastMessage?.text?.length > 100 ? '...' : ''}"
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <select 
                      className="flex-1 text-[10px] border border-gray-300 rounded px-2 py-1"
                      defaultValue=""
                    >
                      <option value="" disabled>Select Moderator</option>
                      {moderators.map(mod => (
                        <option key={mod.id} value={mod.id}>{mod.name}</option>
                      ))}
                    </select>
                    <button 
                      onClick={(e) => {
                        const select = e.currentTarget.previousElementSibling as HTMLSelectElement;
                        const moderatorId = select.value;
                        if (moderatorId) {
                          assignModerator(chat.id, moderatorId);
                        }
                      }}
                      className="px-3 py-1 bg-blue-500 text-white text-[10px] font-bold rounded hover:bg-blue-600 transition-colors"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'PHOTOS' && (
          <PhotoModerationPanel embedded={true} isAdmin={true} />
        )}

        {activeTab === 'VERIFICATIONS' && (
          <AdminPhotoVerificationDashboard />
        )}

        {activeTab === 'RESOLVED' && (
          <div className="space-y-3">
            {resolvedItems.length === 0 ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-inbox text-4xl text-gray-200 mb-2"></i>
                <p className="text-gray-400 text-sm">No resolved actions yet.</p>
              </div>
            ) : (
              resolvedItems.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        item.status === 'dismissed' ? 'bg-emerald-500' :
                        item.status === 'warned' ? 'bg-amber-500' :
                        'bg-red-500'
                      }`}>
                        {item.status === 'dismissed' ? '✓' :
                         item.status === 'warned' ? '⚠' :
                         '✕'}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">{item.action}</h4>
                        <p className="text-[10px] text-gray-500">{item.message.substring(0, 50)}...</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                      item.status === 'dismissed' ? 'bg-emerald-100 text-emerald-600' :
                      item.status === 'warned' ? 'bg-amber-100 text-amber-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {item.userId}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Chat Moderation Modal */}
      {viewingChatModal && (
        <ChatModerationView
          chat={viewingChatModal}
          currentUserId={currentUserId}
          onClose={() => setViewingChatModal(null)}
          onRefresh={() => fetchChats()}
          onRepliedChatAdded={() => fetchRepliedChats()}
        />
      )}
    </div>
  );
};

export default ModeratorPanel;
