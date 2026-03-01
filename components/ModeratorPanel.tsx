
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const INITIAL_FLAGS: FlaggedItem[] = [];

const ModeratorPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'RESOLVED' | 'CHATS' | 'OPERATORS' | 'STALLED' | 'USERS'>('CHATS');
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
  const [standaloneOperators, setStandaloneOperators] = useState<any[]>([]);
  const [onboardedModerators, setOnboardedModerators] = useState<any[]>([]);
  const [loadingModerators, setLoadingModerators] = useState(false);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [moderators, setModerators] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<Map<string, any>>(new Map());
  const [repliedChats, setRepliedChats] = useState<any[]>([]);
  const [selectedModeratorInPending, setSelectedModeratorInPending] = useState<string | null>(null);
  const [repliedChatsByModerator, setRepliedChatsByModerator] = useState<Map<string, any[]>>(new Map());
  const [loadingRepliedChats, setLoadingRepliedChats] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  const [userAccountTypeFilter, setUserAccountTypeFilter] = useState<string>('');
  const [userSuspendedFilter, setUserSuspendedFilter] = useState<string>('');
  const [actioningUserId, setActioningUserId] = useState<string | null>(null);

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

  // Fetch all operators/moderators
  const fetchOperators = async () => {
    try {
      setLoadingModerators(true);
      
      // Fetch standalone moderators (from standalone signup)
      const standaloneRes = await apiClient.get('/moderation/standalone');
      setStandaloneOperators(standaloneRes.operators || []);
      
      // Fetch onboarded moderators (app users with moderator role)
      const onboardedRes = await apiClient.get('/moderation/onboarded');
      setOnboardedModerators(onboardedRes.moderators || []);
      
    } catch (error) {
      console.error('Failed to fetch operators:', error);
      setStandaloneOperators([]);
      setOnboardedModerators([]);
    } finally {
      setLoadingModerators(false);
    }
  };

  // Fetch activity log
  const fetchActivityLog = async () => {
    try {
      const response = await apiClient.get('/moderation/logs/activity');
      setActivityLog(response.logs || []);
    } catch (error) {
      console.error('Failed to fetch activity log:', error);
      setActivityLog([]);
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
    // Clear search and selected moderator when switching tabs
    setSearchQuery('');
    setSelectedModeratorInPending(null);
    
    if (activeTab === 'PENDING') {
      fetchRepliedChats();
    } else if (activeTab === 'CHATS') {
      fetchChats();
    } else if (activeTab === 'STALLED') {
      fetchStalledChats();
      fetchModerators();
    } else if (activeTab === 'OPERATORS') {
      fetchOperators();
    } else if (activeTab === 'RESOLVED') {
      fetchActivityLog();
    } else if (activeTab === 'USERS') {
      fetchAllUsers();
    }
    
    // Set up auto-refresh based on active tab
    const refreshInterval = setInterval(() => {
      if (activeTab === 'PENDING') {
        fetchRepliedChats();
      } else if (activeTab === 'CHATS') {
        fetchChats();
      } else if (activeTab === 'STALLED') {
        fetchStalledChats();
      } else if (activeTab === 'USERS') {
        fetchAllUsers();
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
      
      // Group chats by moderator
      const grouped = new Map<string, any[]>();
      response.repliedChats?.forEach((chat: any) => {
        const modId = chat.assignedModerator || 'unassigned';
        if (!grouped.has(modId)) {
          grouped.set(modId, []);
        }
        grouped.get(modId)!.push(chat);
      });
      setRepliedChatsByModerator(grouped);
      
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

  // Fetch all users for management
  const fetchAllUsers = async () => {
    try {
      setLoadingUsers(true);

      // Build query string for filters
      const params: any = {};
      if (searchQuery.trim()) params.search = searchQuery;
      if (userRoleFilter) params.role = userRoleFilter;
      if (userAccountTypeFilter) params.accountType = userAccountTypeFilter;
      if (userSuspendedFilter) params.suspended = userSuspendedFilter;

      const query = new URLSearchParams(params).toString();
      const response = await apiClient.get(
        `/moderation/users/all${query ? `?${query}` : ''}`,
      );

      // Backend returns { success, users, total, ... }
      setAllUsers((response as any).users || []);
    } catch (error) {
      console.error('[ERROR ModeratorPanel] Failed to fetch users:', error);
      setAllUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Suspend/unsuspend user
  const toggleUserSuspension = async (userId: string, shouldSuspend: boolean, reason?: string) => {
    try {
      setActioningUserId(userId);
      await apiClient.put(`/api/moderation/users/${userId}/suspend`, {
        suspend: shouldSuspend,
        reason: reason || 'Suspended by admin'
      });
      // Refresh users list
      await fetchAllUsers();
    } catch (error) {
      console.error('[ERROR ModeratorPanel] Failed to update user suspension:', error);
      alert('Failed to update user suspension status');
    } finally {
      setActioningUserId(null);
    }
  };

  // Change user role
  const changeUserRole = async (userId: string, newRole: string) => {
    try {
      setActioningUserId(userId);
      await apiClient.put(`/api/moderation/users/${userId}/role`, { newRole });
      // Refresh users list
      await fetchAllUsers();
    } catch (error) {
      console.error('[ERROR ModeratorPanel] Failed to change user role:', error);
      alert('Failed to change user role');
    } finally {
      setActioningUserId(null);
    }
  };

  // Change account type
  const changeAccountType = async (userId: string, newAccountType: string) => {
    try {
      setActioningUserId(userId);
      await apiClient.put(`/api/moderation/users/${userId}/account-type`, { newAccountType });
      // Refresh users list
      await fetchAllUsers();
    } catch (error) {
      console.error('[ERROR ModeratorPanel] Failed to change account type:', error);
      alert('Failed to change account type');
    } finally {
      setActioningUserId(null);
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
        <div className="flex gap-2 mb-6 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
          <button 
            onClick={() => setActiveTab('CHATS')}
            className={`flex-1 py-2.5 px-3 text-[10px] font-bold rounded-lg transition-all ${
              activeTab === 'CHATS' 
                ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <i className="fa-solid fa-comments mr-1.5"></i>Live Chats
          </button>
          <button 
            onClick={() => setActiveTab('PENDING')}
            className={`flex-1 py-2.5 px-3 text-[10px] font-bold rounded-lg transition-all ${
              activeTab === 'PENDING' 
                ? 'bg-emerald-600 text-white shadow-lg hover:bg-emerald-700' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <i className="fa-solid fa-check-circle mr-1.5"></i>Replied Chats
          </button>
          <button 
            onClick={() => setActiveTab('STALLED')}
            className={`flex-1 py-2.5 px-3 text-[10px] font-bold rounded-lg transition-all ${
              activeTab === 'STALLED' 
                ? 'bg-amber-600 text-white shadow-lg hover:bg-amber-700' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <i className="fa-solid fa-headset mr-1.5"></i>Support
          </button>
          <button 
            onClick={() => setActiveTab('OPERATORS')}
            className={`flex-1 py-2.5 px-3 text-[10px] font-bold rounded-lg transition-all ${
              activeTab === 'OPERATORS' 
                ? 'bg-purple-600 text-white shadow-lg hover:bg-purple-700' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <i className="fa-solid fa-users-gear mr-1.5"></i>Operators/Moderators
          </button>
          <button 
            onClick={() => setActiveTab('USERS')}
            className={`flex-1 py-2.5 px-3 text-[10px] font-bold rounded-lg transition-all ${
              activeTab === 'USERS' 
                ? 'bg-pink-600 text-white shadow-lg hover:bg-pink-700' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <i className="fa-solid fa-users mr-1.5"></i>Users
          </button>
          <button 
            onClick={() => setActiveTab('RESOLVED')}
            className={`flex-1 py-2.5 px-3 text-[10px] font-bold rounded-lg transition-all ${
              activeTab === 'RESOLVED' 
                ? 'bg-indigo-600 text-white shadow-lg hover:bg-indigo-700' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <i className="fa-solid fa-list mr-1.5"></i>Log
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
                {selectedModeratorInPending ? 'Chats from selected moderator' : 'Chats grouped by moderator'}
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
            ) : selectedModeratorInPending ? (
              // Show chats for selected moderator
              <div>
                <button
                  onClick={() => setSelectedModeratorInPending(null)}
                  className="mb-4 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg flex items-center gap-2 transition-all"
                >
                  <i className="fa-solid fa-arrow-left"></i>
                  Back to Moderators
                </button>

                {(() => {
                  const selectedChats = repliedChatsByModerator.get(selectedModeratorInPending) || [];
                  const filtered = selectedChats.filter(chat => {
                    if (!searchQuery) return true;
                    const user1 = userMap.get(chat.participants[0]);
                    const user2 = userMap.get(chat.participants[1]);
                    const searchLower = searchQuery.toLowerCase();
                    return (
                      user1?.name?.toLowerCase().includes(searchLower) ||
                      user1?.username?.toLowerCase().includes(searchLower) ||
                      user2?.name?.toLowerCase().includes(searchLower) ||
                      user2?.username?.toLowerCase().includes(searchLower) ||
                      chat.id.toLowerCase().includes(searchLower)
                    );
                  });

                  if (filtered.length === 0) {
                    return (
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
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {filtered.map(chat => {
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
                      })}
                    </div>
                  );
                })()}
              </div>
            ) : (
              // Show moderators list
              <div className="space-y-3">
                {Array.from(repliedChatsByModerator.entries()).map(([moderatorId, chats]) => {
                  const moderatorName = chats[0]?.moderatorDetails?.name || 
                                       userMap.get(moderatorId)?.name || 
                                       (moderatorId === 'unassigned' ? 'Unassigned' : moderatorId);
                  const moderatorEmail = chats[0]?.moderatorDetails?.email || 
                                        userMap.get(moderatorId)?.email || '';
                  
                  return (
                    <button
                      key={moderatorId}
                      onClick={() => setSelectedModeratorInPending(moderatorId)}
                      className="w-full text-left bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                            {moderatorName[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-gray-900">{moderatorName}</h4>
                            {moderatorEmail && <p className="text-xs text-gray-500">{moderatorEmail}</p>}
                            <p className="text-xs text-gray-400 mt-1">
                              <i className="fa-solid fa-comments mr-1"></i>
                              {chats.length} chat{chats.length !== 1 ? 's' : ''} replied
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-50 rounded-full px-3 py-1">
                            <span className="text-blue-600 font-bold text-sm">{chats.length}</span>
                          </div>
                          <i className="fa-solid fa-chevron-right text-gray-400"></i>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
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

        {activeTab === 'OPERATORS' && (
          <div className="space-y-6">
            {/* Standalone Operators */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <i className="fa-solid fa-user-tie text-blue-600"></i>
                Standalone Operators ({standaloneOperators.length})
              </h3>
              {loadingModerators ? (
                <div className="text-center py-4 text-gray-400"><i className="fa-solid fa-spinner animate-spin"></i></div>
              ) : standaloneOperators.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-400 text-sm">No standalone operators</div>
              ) : (
                <div className="space-y-2">
                  {standaloneOperators.map((op: any) => (
                    <div key={op.id} className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-sm text-gray-900">{op.name || op.username}</p>
                          <p className="text-xs text-gray-500">{op.email}</p>
                          <p className="text-xs text-gray-400 mt-1">ID: {op.id.slice(0, 12)}...</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                            {op.chatsModerated || 0} chats
                          </span>
                          <p className="text-xs text-gray-400 mt-1">Joined {new Date(op.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Onboarded Moderators */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <i className="fa-solid fa-user-check text-green-600"></i>
                Onboarded Moderators ({onboardedModerators.length})
              </h3>
              {loadingModerators ? (
                <div className="text-center py-4 text-gray-400"><i className="fa-solid fa-spinner animate-spin"></i></div>
              ) : onboardedModerators.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-400 text-sm">No onboarded moderators</div>
              ) : (
                <div className="space-y-2">
                  {onboardedModerators.map((mod: any) => (
                    <div key={mod.id} className="bg-white p-3 rounded-lg border border-gray-200 hover:border-green-300 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-sm text-gray-900">{mod.name || mod.username}</p>
                          <p className="text-xs text-gray-500">{mod.email}</p>
                          <p className="text-xs text-gray-400 mt-1">ID: {mod.id.slice(0, 12)}...</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded">
                            {mod.chatsModerated || 0} chats
                          </span>
                          <p className="text-xs text-gray-400 mt-1">Since {new Date(mod.onboardedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'USERS' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6 bg-white p-4 rounded-xl border border-gray-200">
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Search</label>
                <input
                  type="text"
                  placeholder="Name, email, username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Role</label>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">All Roles</option>
                  <option value="USER">User</option>
                  <option value="MODERATOR">Moderator</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Account Type</label>
                <select
                  value={userAccountTypeFilter}
                  onChange={(e) => setUserAccountTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">All Types</option>
                  <option value="APP">App</option>
                  <option value="STANDALONE">Standalone</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Status</label>
                <select
                  value={userSuspendedFilter}
                  onChange={(e) => setUserSuspendedFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">All Users</option>
                  <option value="false">Active</option>
                  <option value="true">Suspended</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">&nbsp;</label>
                <button 
                  onClick={() => fetchAllUsers()}
                  disabled={loadingUsers}
                  className="w-full py-2 px-3 bg-pink-600 text-white text-xs font-bold rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <i className={`fa-solid fa-rotate-right ${loadingUsers ? 'animate-spin' : ''}`}></i>
                  {loadingUsers ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Users List */}
            {loadingUsers ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="text-gray-500 text-sm mt-2">Loading users...</p>
              </div>
            ) : allUsers.length === 0 ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-users text-4xl text-gray-200 mb-2"></i>
                <p className="text-gray-400 text-sm">No users found with current filters.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allUsers.map((user) => (
                  <div 
                    key={user.id} 
                    className={`bg-white p-4 rounded-2xl border-2 transition-all ${
                      user.suspended ? 'border-red-200 bg-red-50' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* User Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm">
                            {user.name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">
                              {user.name || 'N/A'}
                              {user.suspended && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">SUSPENDED</span>}
                            </h4>
                            <p className="text-xs text-gray-500">@{user.username || 'unknown'}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3 text-xs">
                          <div className="truncate">
                            <p className="text-gray-500 font-semibold">Email</p>
                            <p className="text-gray-700 truncate text-[10px]">{user.email}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-semibold">Role</p>
                            <p className={`font-bold ${
                              user.role === 'ADMIN' ? 'text-red-600' :
                              user.role === 'MODERATOR' ? 'text-blue-600' :
                              'text-gray-600'
                            }`}>{user.role}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-semibold">Type</p>
                            <p className={`font-bold ${user.accountType === 'STANDALONE' ? 'text-purple-600' : 'text-blue-600'}`}>
                              {user.accountType}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-semibold">Verified</p>
                            <p className="text-gray-700">
                              <i className={`fa-solid fa-${user.isPhotoVerified ? 'check-circle text-green-500' : 'circle text-gray-400'}`}></i>
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-semibold">Age</p>
                            <p className="text-gray-700">{user.age || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 min-w-fit">
                        {/* Suspension Toggle */}
                        <button
                          onClick={() => toggleUserSuspension(user.id, !user.suspended, 'Admin action')}
                          disabled={actioningUserId === user.id}
                          className={`text-xs font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                            user.suspended
                              ? 'bg-green-100 text-green-600 hover:bg-green-200 disabled:opacity-50'
                              : 'bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50'
                          }`}
                        >
                          <i className={`fa-solid fa-${user.suspended ? 'unlock' : 'lock'}`}></i>
                          {actioningUserId === user.id ? '...' : (user.suspended ? 'Unsuspend' : 'Suspend')}
                        </button>

                        {/* Role Change */}
                        <select
                          value={user.role}
                          onChange={(e) => changeUserRole(user.id, e.target.value)}
                          disabled={actioningUserId === user.id}
                          className="text-xs font-bold px-2 py-2 rounded-lg border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition-all"
                        >
                          <option value="USER">→ User</option>
                          <option value="MODERATOR">→ Moderator</option>
                          <option value="ADMIN">→ Admin</option>
                        </select>

                        {/* Account Type Change */}
                        <select
                          value={user.accountType}
                          onChange={(e) => changeAccountType(user.id, e.target.value)}
                          disabled={actioningUserId === user.id}
                          className="text-xs font-bold px-2 py-2 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-all"
                        >
                          <option value="APP">→ App</option>
                          <option value="STANDALONE">→ Standalone</option>
                        </select>
                      </div>
                    </div>

                    {/* Suspension Info */}
                    {user.suspended && user.suspendedReason && (
                      <div className="mt-3 pt-3 border-t border-red-200">
                        <p className="text-xs text-red-600">
                          <i className="fa-solid fa-exclamation-triangle mr-1"></i>
                          Reason: {user.suspendedReason}
                        </p>
                        {user.suspendedAt && (
                          <p className="text-xs text-red-500 mt-1">
                            Suspended: {new Date(user.suspendedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'RESOLVED' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-list text-purple-600"></i>
              Activity Log
            </h3>
            {activityLog.length === 0 && resolvedItems.length === 0 ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-inbox text-4xl text-gray-200 mb-2"></i>
                <p className="text-gray-400 text-sm">No activity logged yet.</p>
              </div>
            ) : activityLog.length > 0 ? (
              activityLog.map((log: any) => (
                <div key={log.id} className="bg-white p-4 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                        log.action === 'signup' ? 'bg-green-500' :
                        log.action === 'payment_change' ? 'bg-blue-500' :
                        log.action === 'moderator_action' ? 'bg-purple-500' :
                        log.action === 'ban' ? 'bg-red-500' :
                        'bg-gray-400'
                      }`}>
                        {log.action === 'signup' ? '✓' :
                         log.action === 'payment_change' ? '💳' :
                         log.action === 'moderator_action' ? '⚖' :
                         log.action === 'ban' ? '✕' :
                         '•'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-gray-900">{log.description}</h4>
                        <p className="text-[10px] text-gray-600 mt-1">{log.details}</p>
                        {log.userId && <p className="text-[10px] text-gray-500 mt-1">User: {log.userId.slice(0, 10)}...</p>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-[10px] text-gray-400">{new Date(log.timestamp).toLocaleString()}</p>
                      <span className="inline-block mt-1 bg-gray-100 text-gray-700 text-[9px] px-2 py-0.5 rounded">{log.action}</span>
                    </div>
                  </div>
                </div>
              ))
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
