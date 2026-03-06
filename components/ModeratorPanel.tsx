
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PhotoModerationPanel from './PhotoModerationPanel';
import ChatModerationView from './ChatModerationView';
import PhotoVerificationReviewPanel from './PhotoVerificationReviewPanel';
import AdminPhotoVerificationDashboard from './AdminPhotoVerificationDashboard';
import LandingPageSettingsPanel from './LandingPageSettingsPanel';
import apiClient from '../services/apiClient';
import { useCoinPackages } from '../services/CoinPackageContext';
import { useNotification } from '../services/NotificationContext';

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
  const [activeTab, setActiveTab] = useState<'PENDING' | 'RESOLVED' | 'CHATS' | 'OPERATORS' | 'STALLED' | 'USERS' | 'PAYMENTS' | 'REVENUE' | 'SUPPORT' | 'SETTINGS'>('CHATS');
  const [flaggedItems, setFlaggedItems] = useState<FlaggedItem[]>(INITIAL_FLAGS);
  const [resolvedItems, setResolvedItems] = useState<FlaggedItem[]>([]);
  const [chats, setChats] = useState<ModeratorChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<ModeratorChat | null>(null);
  const [viewingChatModal, setViewingChatModal] = useState<ModeratorChat | null>(null);
  const [loadingChats, setLoadingChats] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const navigate = useNavigate();
  const { refetch: refetchCoinPackages } = useCoinPackages();
  const { showNotification } = useNotification();
  const [currentUserId] = useState<string>('moderator-' + Math.random().toString(36).substring(7));
  const [stalledChats, setStalledChats] = useState<any[]>([]);
  const [loadingStalled, setLoadingStalled] = useState(false);
  const [standaloneOperators, setStandaloneOperators] = useState<any[]>([]);
  const [onboardedModerators, setOnboardedModerators] = useState<any[]>([]);
  const [loadingModerators, setLoadingModerators] = useState(false);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [moderators, setModerators] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageStats, setMessageStats] = useState<any>(null);
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
  const [confirmationModal, setConfirmationModal] = useState<{ isOpen: boolean; userId: string | null; action: 'suspend' | 'unsuspend' | null; reason: string }>({ isOpen: false, userId: null, action: null, reason: '' });
  const [userCurrentPage, setUserCurrentPage] = useState<number>(1);
  const [userTotalCount, setUserTotalCount] = useState<number>(0);
  const usersPerPage = 50;
  
  // Coin Packages Management
  const [coinPackages, setCoinPackages] = useState<any[]>([
    { id: 1, coins: 50, price: 4.99 },
    { id: 2, coins: 150, price: 12.99 },
    { id: 3, coins: 350, price: 24.99 },
    { id: 4, coins: 1000, price: 59.99 }
  ]);
  const [editingPackageId, setEditingPackageId] = useState<number | null>(null);
  const [editingPackageForm, setEditingPackageForm] = useState<{ coins: string; price: string }>({ coins: '', price: '' });
  const [showAddPackageForm, setShowAddPackageForm] = useState(false);
  const [newPackageForm, setNewPackageForm] = useState<{ coins: string; price: string }>({ coins: '', price: '' });
  const [loadingCoinPackages, setLoadingCoinPackages] = useState(false);
  const [coinPackagesError, setCoinPackagesError] = useState<string | null>(null);

  // Recent Coin Purchases
  const [coinPurchases, setCoinPurchases] = useState<any[]>([]);
  const [loadingCoinPurchases, setLoadingCoinPurchases] = useState(false);
  const [coinPurchasesError, setCoinPurchasesError] = useState<string | null>(null);

  // Premium Packages Management
  const [premiumPackages, setPremiumPackages] = useState<any[]>([]);
  const [editingPremiumPackageId, setEditingPremiumPackageId] = useState<string | null>(null);
  const [editingPremiumPackageForm, setEditingPremiumPackageForm] = useState<{ name: string; duration: string; plan: string; price: string }>({ name: '', duration: '', plan: '', price: '' });
  const [showAddPremiumPackageForm, setShowAddPremiumPackageForm] = useState(false);
  const [newPremiumPackageForm, setNewPremiumPackageForm] = useState<{ name: string; duration: string; plan: string; price: string }>({ name: '', duration: '', plan: '1_month', price: '' });
  const [loadingPremiumPackages, setLoadingPremiumPackages] = useState(false);
  const [premiumPackagesError, setPremiumPackagesError] = useState<string | null>(null);

  // Premium User Management
  const [selectedUserForPremium, setSelectedUserForPremium] = useState<string | null>(null);
  const [premiumActionPlan, setPremiumActionPlan] = useState<string>('1_month');
  const [premiumActionType, setPremiumActionType] = useState<'grant' | 'revoke'>('grant');

  // Transaction Management
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [transactionFilter, setTransactionFilter] = useState<'ALL' | 'COIN_PURCHASE' | 'PREMIUM_UPGRADE'>('ALL');
  const [transactionPage, setTransactionPage] = useState(0);
  const [transactionStats, setTransactionStats] = useState<any>(null);

  // Coin Sales Statistics
  const [coinRevenue, setCoinRevenue] = useState<number>(0);
  const [coinPurchasesCount, setCoinPurchasesCount] = useState<number>(0);
  const [avgTransaction, setAvgTransaction] = useState<number>(0);
  const [activePayingUsers, setActivePayingUsers] = useState<number>(0);

  // Profile Management
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserForm, setEditingUserForm] = useState({
    username: '',
    email: '',
    name: '',
    age: '',
    bio: '',
    location: '',
    role: 'USER',
  });
  const [editingUserImages, setEditingUserImages] = useState<string[]>([]);
  const [uploadingEditProfile, setUploadingEditProfile] = useState(false);
  const [uploadProgressEditProfile, setUploadProgressEditProfile] = useState(0);

  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [newProfileForm, setNewProfileForm] = useState({
    username: '',
    email: '',
    name: '',
    age: '',
    bio: '',
    location: '',
    password: '',
    role: 'USER',
    accountType: 'APP',
  });
  const [newProfileImages, setNewProfileImages] = useState<string[]>([]);
  const [uploadingNewProfile, setUploadingNewProfile] = useState(false);
  const [uploadProgressNewProfile, setUploadProgressNewProfile] = useState(0);
  const [creatingProfile, setCreatingProfile] = useState(false);

  // Earnings tracking state
  const [allModeratorsEarnings, setAllModeratorsEarnings] = useState<any[]>([]);
  const [selectedModeratorEarnings, setSelectedModeratorEarnings] = useState<any>(null);
  const [earningsHistory, setEarningsHistory] = useState<any[]>([]);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [earningHistoryLoading, setEarningHistoryLoading] = useState(false);

  // Activity Log state
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loadingActivityLogs, setLoadingActivityLogs] = useState(false);
  const [activityLogFilter, setActivityLogFilter] = useState({
    category: '',
    action: '',
    status: '',
    limit: 50,
    skip: 0
  });
  const [activityLogSummary, setActivityLogSummary] = useState<any>(null);
  const [activityLogTotalCount, setActivityLogTotalCount] = useState(0);

  // Helper function to safely format dates
  const formatDate = (dateInput: any, includeTime = false) => {
    if (!dateInput) return 'N/A';
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return 'N/A';
      if (includeTime) {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString();
    } catch (error) {
      return 'N/A';
    }
  };

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
      const operators = standaloneRes.operators || [];
      
      // Fetch onboarded moderators (app users with moderator role)
      const onboardedRes = await apiClient.get('/moderation/onboarded');
      const moderators = onboardedRes.moderators || [];
      
      // Fetch chat counts for each operator
      const operatorsWithCounts = await Promise.all(
        operators.map(async (op: any) => {
          try {
            const chatCountRes = await apiClient.getModeratorChatCount(op.id);
            const earningsRes = await apiClient.getModeratorEarnings(op.id);
            return {
              ...op,
              chatsModerated: chatCountRes.chatCount || 0,
              earnings: earningsRes.summary || {}
            };
          } catch (error) {
            console.error(`Failed to fetch data for operator ${op.id}:`, error);
            return { ...op, chatsModerated: 0, earnings: {} };
          }
        })
      );
      
      // Fetch chat counts for each moderator
      const moderatorsWithCounts = await Promise.all(
        moderators.map(async (mod: any) => {
          try {
            const chatCountRes = await apiClient.getModeratorChatCount(mod.id);
            const earningsRes = await apiClient.getModeratorEarnings(mod.id);
            return {
              ...mod,
              chatsModerated: chatCountRes.chatCount || 0,
              earnings: earningsRes.summary || {}
            };
          } catch (error) {
            console.error(`Failed to fetch data for moderator ${mod.id}:`, error);
            return { ...mod, chatsModerated: 0, earnings: {} };
          }
        })
      );
      
      setStandaloneOperators(operatorsWithCounts);
      setOnboardedModerators(moderatorsWithCounts);
      
    } catch (error) {
      console.error('Failed to fetch operators:', error);
      setStandaloneOperators([]);
      setOnboardedModerators([]);
    } finally {
      setLoadingModerators(false);
    }
  };

  // Fetch all moderators earnings
  const fetchAllModeratorsEarnings = async () => {
    try {
      setLoadingEarnings(true);
      const response = await apiClient.getAllModeratorsEarnings();
      setAllModeratorsEarnings(response.earnings || []);
      console.log('[DEBUG] Fetched earnings for', response.count, 'moderators');
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
      showNotification('Failed to fetch earnings data', 'error');
      setAllModeratorsEarnings([]);
    } finally {
      setLoadingEarnings(false);
    }
  };

  // Fetch earnings history for a specific moderator
  const fetchModeratorEarningsHistory = async (moderatorId: string) => {
    try {
      setEarningHistoryLoading(true);
      const response = await apiClient.getModeratorEarningsHistory(moderatorId, 50, 0);
      setEarningsHistory(response.earnings || []);
      console.log('[DEBUG] Fetched earnings history for moderator:', moderatorId);
    } catch (error) {
      console.error('Failed to fetch earnings history:', error);
      showNotification('Failed to fetch earnings history', 'error');
      setEarningsHistory([]);
    } finally {
      setEarningHistoryLoading(false);
    }
  };

  // Fetch activity logs with filters
  const fetchActivityLogs = async (filters: any = {}) => {
    try {
      setLoadingActivityLogs(true);
      const response = await apiClient.getActivityLogs({
        ...activityLogFilter,
        ...filters
      });
      setActivityLogs(response.data || []);
      setActivityLogTotalCount(response.pagination?.total || 0);
      console.log('[DEBUG] Fetched activity logs:', response.data?.length);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
      showNotification('Failed to fetch activity logs', 'error');
      setActivityLogs([]);
    } finally {
      setLoadingActivityLogs(false);
    }
  };

  // Fetch activity log summary
  const fetchActivityLogSummary = async () => {
    try {
      const response = await apiClient.getActivitySummary();
      setActivityLogSummary(response.data);
      console.log('[DEBUG] Fetched activity summary');
    } catch (error) {
      console.error('Failed to fetch activity summary:', error);
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

  // Fetch contact messages
  const fetchContactMessages = async () => {
    try {
      setLoadingMessages(true);
      const response = await apiClient.get('/support/messages?limit=50');
      setContactMessages(response.messages || []);
      console.log('[DEBUG] Fetched contact messages:', response.messages?.length);
    } catch (error) {
      console.error('Failed to fetch contact messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Fetch message statistics
  const fetchMessageStats = async () => {
    try {
      const response = await apiClient.get('/support/stats');
      setMessageStats(response);
      console.log('[DEBUG] Fetched message stats:', response);
    } catch (error) {
      console.error('Failed to fetch message stats:', error);
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
      fetchAllModeratorsEarnings();
    } else if (activeTab === 'RESOLVED') {
      fetchActivityLogs();
      fetchActivityLogSummary();
    } else if (activeTab === 'USERS') {
      fetchAllUsers();
    } else if (activeTab === 'PAYMENTS') {
      fetchCoinPackages();
      fetchCoinPurchases();
      fetchPremiumPackages();
      fetchAllTransactions();
    } else if (activeTab === 'SUPPORT') {
      fetchContactMessages();
      fetchMessageStats();
    }
    
    // No auto-refresh - user manually refreshes via buttons
    return () => {};
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
  const fetchAllUsers = async (page: number = 1) => {
    try {
      setLoadingUsers(true);
      setUserCurrentPage(page);

      // Build query params for single page
      const skip = (page - 1) * usersPerPage;
      const params: any = { limit: usersPerPage, skip };
      if (searchQuery.trim()) params.search = searchQuery;
      if (userRoleFilter) params.role = userRoleFilter;
      if (userAccountTypeFilter) params.accountType = userAccountTypeFilter;
      if (userSuspendedFilter) params.suspended = userSuspendedFilter;

      const query = new URLSearchParams(params).toString();
      const response = await apiClient.get(
        `/moderation/users/all?${query}`,
      );

      const { users = [], total = 0 } = response as any;
      setAllUsers(users);
      setUserTotalCount(total);
      console.log(`[DEBUG ModeratorPanel] Page ${page}: Loaded ${users.length} users (Total: ${total})`);
    } catch (error) {
      console.error('[ERROR ModeratorPanel] Failed to fetch users:', error);
      setAllUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Suspend/unsuspend user - shows confirmation modal
  const toggleUserSuspension = (userId: string, shouldSuspend: boolean, reason?: string) => {
    setConfirmationModal({
      isOpen: true,
      userId,
      action: shouldSuspend ? 'suspend' : 'unsuspend',
      reason: reason || 'Admin action'
    });
  };

  // Confirm suspension action and execute it
  const confirmSuspensionAction = async () => {
    const { userId, action, reason } = confirmationModal;
    if (!userId || !action) return;

    try {
      setActioningUserId(userId);
      const shouldSuspend = action === 'suspend';
      
      const response = await apiClient.put(`/moderation/users/${userId}/suspend`, {
        suspend: shouldSuspend,
        reason: reason || 'Admin action'
      });

      // Log the action
      try {
        await apiClient.post('/api/moderation/logs/activity', {
          action: 'moderator_action',
          userId,
          description: `User ${shouldSuspend ? 'suspended' : 'unsuspended'} by admin`,
          details: reason,
          metadata: { actionType: shouldSuspend ? 'suspend' : 'unsuspend', reason }
        });
      } catch (logError) {
        console.warn('[WARN] Failed to log action:', logError);
      }

      // Close confirmation modal
      setConfirmationModal({ isOpen: false, userId: null, action: null, reason: '' });
      
      // Refresh users list and activity log
      await fetchAllUsers();
      await fetchActivityLog();
      
    } catch (error: any) {
      console.error('[ERROR ModeratorPanel] Failed to update user suspension:', error);
      showNotification(`Failed to ${confirmationModal.action} user: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setActioningUserId(null);
    }
  };

  // Change user role
  const changeUserRole = async (userId: string, newRole: string) => {
    try {
      setActioningUserId(userId);
      console.log(`[DEBUG] Changing role for ${userId} to ${newRole}`);
      const response = await apiClient.put(`/moderation/users/${userId}/role`, { newRole });
      console.log('[DEBUG] Role change response:', response);
      // Refresh users list
      await fetchAllUsers();
    } catch (error: any) {
      console.error('[ERROR ModeratorPanel] Failed to change user role:', error);
      showNotification(`Failed to change user role: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setActioningUserId(null);
    }
  };

  // Change account type
  const changeAccountType = async (userId: string, newAccountType: string) => {
    try {
      setActioningUserId(userId);
      console.log(`[DEBUG] Changing account type for ${userId} to ${newAccountType}`);
      const response = await apiClient.put(`/moderation/users/${userId}/account-type`, { newAccountType });
      console.log('[DEBUG] Account type change response:', response);
      // Refresh users list
      await fetchAllUsers();
    } catch (error: any) {
      console.error('[ERROR ModeratorPanel] Failed to change account type:', error);
      showNotification(`Failed to change account type: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setActioningUserId(null);
    }
  };

  // Toggle user verification
  const toggleUserVerification = async (userId: string, verified: boolean) => {
    try {
      setActioningUserId(userId);
      console.log(`[DEBUG] Toggling verification for ${userId} to ${verified}`);
      const response = await apiClient.put(`/moderation/users/${userId}/verify`, { verified });
      console.log('[DEBUG] Verification toggle response:', response);
      // Refresh users list
      await fetchAllUsers();
    } catch (error: any) {
      console.error('[ERROR ModeratorPanel] Failed to toggle user verification:', error);
      showNotification(`Failed to toggle user verification: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setActioningUserId(null);
    }
  };

  // Edit user profile
  const handleEditUser = (user: any) => {
    setEditingUserId(user.id);
    setEditingUserForm({
      username: user.username || '',
      email: user.email || '',
      name: user.name || '',
      age: user.age?.toString() || '',
      bio: user.bio || '',
      location: user.location || '',
      role: user.role || 'USER',
    });
    // Initialize images from existing user data
    setEditingUserImages(user.images || []);
  };

  const handleSaveUserProfile = async () => {
    if (!editingUserId) return;
    try {
      setActioningUserId(editingUserId);
      console.log('[DEBUG ModeratorPanel] Saving user profile:', editingUserForm);
      const response = await apiClient.updateUserProfile(editingUserId, {
        username: editingUserForm.username,
        email: editingUserForm.email,
        name: editingUserForm.name,
        age: editingUserForm.age ? parseInt(editingUserForm.age) : undefined,
        bio: editingUserForm.bio,
        location: editingUserForm.location,
        role: editingUserForm.role,
        images: editingUserImages,
      });
      showNotification('Profile updated successfully', 'success');
      setEditingUserId(null);
      setEditingUserImages([]);
      await fetchAllUsers();
    } catch (error: any) {
      console.error('[ERROR ModeratorPanel] Failed to update user profile:', error);
      showNotification(`Failed to update profile: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setActioningUserId(null);
    }
  };

  // Create new profile (manual onboarding)
  const handleCreateProfile = async () => {
    if (!newProfileForm.username || !newProfileForm.email || !newProfileForm.password) {
      showNotification('Please fill in username, email, and password', 'warning');
      return;
    }

    try {
      setCreatingProfile(true);
      console.log('[DEBUG ModeratorPanel] Creating new profile:', newProfileForm);
      const response = await apiClient.createUserProfile({
        username: newProfileForm.username.toLowerCase().trim(),
        email: newProfileForm.email.toLowerCase().trim(),
        password: newProfileForm.password,
        name: newProfileForm.name || newProfileForm.username,
        age: newProfileForm.age ? parseInt(newProfileForm.age) : 25,
        bio: newProfileForm.bio || 'Onboarded by admin',
        location: newProfileForm.location || '',
        role: newProfileForm.role,
        accountType: newProfileForm.accountType,
        images: newProfileImages,
      });
      showNotification('Profile created successfully', 'success');
      setShowAddProfileModal(false);
      setNewProfileForm({
        username: '',
        email: '',
        name: '',
        age: '',
        bio: '',
        location: '',
        password: '',
        role: 'USER',
        accountType: 'APP',
      });
      setNewProfileImages([]);
      await fetchAllUsers();
    } catch (error: any) {
      console.error('[ERROR ModeratorPanel] Failed to create profile:', error);
      showNotification(`Failed to create profile: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setCreatingProfile(false);
    }
  };

  // Handle image upload for edit profile
  const handleEditProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    try {
      setUploadingEditProfile(true);
      const fileArray = Array.from(files);
      let uploaded = 0;

      for (const file of fileArray) {
        try {
          setUploadProgressEditProfile((uploaded / fileArray.length) * 100);
          const result = await apiClient.uploadImage(file);
          setEditingUserImages(prev => [...prev, result.imageUrl]);
          uploaded++;
        } catch (err: any) {
          console.error('[ERROR] Failed to upload image:', err);
          showNotification(`Failed to upload image: ${err?.message || 'Unknown error'}`, 'error');
        }
      }
      setUploadProgressEditProfile(100);
      setTimeout(() => setUploadProgressEditProfile(0), 1000);
    } catch (error: any) {
      console.error('[ERROR] Image upload failed:', error);
      showNotification(`Image upload failed: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setUploadingEditProfile(false);
    }
  };

  // Handle image upload for new profile
  const handleNewProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    try {
      setUploadingNewProfile(true);
      const fileArray = Array.from(files);
      let uploaded = 0;

      for (const file of fileArray) {
        try {
          setUploadProgressNewProfile((uploaded / fileArray.length) * 100);
          const result = await apiClient.uploadImage(file);
          setNewProfileImages(prev => [...prev, result.imageUrl]);
          uploaded++;
        } catch (err: any) {
          console.error('[ERROR] Failed to upload image:', err);
          showNotification(`Failed to upload image: ${err?.message || 'Unknown error'}`, 'error');
        }
      }
      setUploadProgressNewProfile(100);
      setTimeout(() => setUploadProgressNewProfile(0), 1000);
    } catch (error: any) {
      console.error('[ERROR] Image upload failed:', error);
      showNotification(`Image upload failed: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setUploadingNewProfile(false);
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

  // Fetch coin packages from backend
  const fetchCoinPackages = async () => {
    try {
      setLoadingCoinPackages(true);
      setCoinPackagesError(null);
      const response = await apiClient.getCoinPackages(true);
      if (response.success && response.packages) {
        setCoinPackages(response.packages);
      }
    } catch (error) {
      console.error('[ERROR] Failed to fetch coin packages:', error);
      setCoinPackagesError((error as any).message || 'Failed to fetch coin packages');
    } finally {
      setLoadingCoinPackages(false);
    }
  };

  // Fetch recent coin purchases from backend
  const fetchCoinPurchases = async () => {
    try {
      setLoadingCoinPurchases(true);
      setCoinPurchasesError(null);
      const response = await apiClient.getCoinPurchases(100, 0);
      if (response.success && response.purchases) {
        setCoinPurchases(response.purchases);
      }
    } catch (error) {
      console.error('[ERROR] Failed to fetch coin purchases:', error);
      setCoinPurchasesError((error as any).message || 'Failed to fetch coin purchases');
    } finally {
      setLoadingCoinPurchases(false);
    }
  };

  const handleBan = (id: string) => {
    const item = flaggedItems.find(f => f.id === id);
    if (item) {
      setResolvedItems([...resolvedItems, { ...item, status: 'banned', action: 'User Banned' }]);
      setFlaggedItems(flaggedItems.filter(f => f.id !== id));
    }
  };

  // Coin Package Management Functions


  const handleEditPackage = (pkg: any) => {
    setEditingPackageId(pkg.id);
    setEditingPackageForm({ coins: String(pkg.coins), price: String(pkg.price) });
  };

  const handleSavePackage = async () => {
    if (!editingPackageForm.coins || !editingPackageForm.price) {
      showNotification('Please fill in all fields', 'warning');
      return;
    }

    try {
      const coins = parseInt(editingPackageForm.coins);
      const price = parseFloat(editingPackageForm.price);

      if (coins <= 0 || price <= 0) {
        showNotification('Coins and price must be greater than 0', 'warning');
        return;
      }

      console.log('[DEBUG ModeratorPanel] Saving package:', { id: editingPackageId, coins, price });

      // Call backend API to update package
      const response = await apiClient.updateCoinPackage(editingPackageId!, {
        coins,
        price
      });

      if (response.success) {
        // Update local state with the response from backend
        setCoinPackages(coinPackages.map(pkg => 
          pkg.id === editingPackageId 
            ? response.package
            : pkg
        ));
        setEditingPackageId(null);
        setEditingPackageForm({ coins: '', price: '' });
        showNotification('Package updated successfully', 'success');
        
        // Refetch packages in global context so ProfileSettings sees the update
        console.log('[DEBUG ModeratorPanel] Triggering global coin packages refetch');
        await refetchCoinPackages();
      }
    } catch (error) {
      console.error('[ERROR ModeratorPanel] Failed to save package:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      showNotification(errorMsg || 'Failed to save package', 'error');
    }
  };

  const handleDeletePackage = async (id: number) => {
    if (confirm('Are you sure you want to delete this package?')) {
      try {
        console.log('[DEBUG ModeratorPanel] Deleting package:', id);
        const response = await apiClient.deleteCoinPackage(id);

        if (response.success) {
          setCoinPackages(coinPackages.filter(pkg => pkg.id !== id));
          showNotification('Package deleted successfully', 'success');
          
          // Refetch packages in global context
          console.log('[DEBUG ModeratorPanel] Triggering global coin packages refetch after delete');
          await refetchCoinPackages();
        }
      } catch (error) {
        console.error('[ERROR ModeratorPanel] Failed to delete package:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        showNotification(errorMsg || 'Failed to delete package', 'error');
      }
    }
  };

  const handleAddPackage = async () => {
    if (!newPackageForm.coins || !newPackageForm.price) {
      showNotification('Please fill in all fields', 'warning');
      return;
    }

    try {
      const coins = parseInt(newPackageForm.coins);
      const price = parseFloat(newPackageForm.price);

      if (coins <= 0 || price <= 0) {
        showNotification('Coins and price must be greater than 0', 'warning');
        return;
      }

      console.log('[DEBUG ModeratorPanel] Adding new package:', { coins, price });

      // Call backend API to create package
      const response = await apiClient.createCoinPackage({
        coins,
        price
      });

      if (response.success) {
        setCoinPackages([...coinPackages, response.package]);
        setNewPackageForm({ coins: '', price: '' });
        setShowAddPackageForm(false);
        showNotification('Package created successfully', 'success');
        
        // Refetch packages in global context
        console.log('[DEBUG ModeratorPanel] Triggering global coin packages refetch after add');
        await refetchCoinPackages();
      }
    } catch (error) {
      console.error('[ERROR ModeratorPanel] Failed to create package:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      showNotification(errorMsg || 'Failed to create package', 'error');
    }
  };

  // Premium Package Handlers
  const fetchPremiumPackages = async () => {
    try {
      setLoadingPremiumPackages(true);
      const response = await apiClient.getPremiumPackages(true);
      if (response.success && Array.isArray(response.packages)) {
        setPremiumPackages(response.packages);
        setPremiumPackagesError(null);
      } else if (response.premium_packages && Array.isArray(response.premium_packages)) {
        setPremiumPackages(response.premium_packages);
        setPremiumPackagesError(null);
      }
    } catch (error) {
      console.error('[ERROR] Failed to fetch premium packages:', error);
      setPremiumPackagesError((error as any).message || 'Failed to fetch premium packages');
    } finally {
      setLoadingPremiumPackages(false);
    }
  };

  const handleEditPremiumPackage = (pkg: any) => {
    setEditingPremiumPackageId(pkg._id || pkg.id);
    setEditingPremiumPackageForm({
      name: pkg.name,
      duration: String(pkg.duration),
      plan: pkg.plan || '1_month',
      price: String(pkg.price)
    });
  };

  const handleSavePremiumPackage = async () => {
    if (!editingPremiumPackageForm.name || !editingPremiumPackageForm.duration || !editingPremiumPackageForm.price) {
      showNotification('Please fill in all fields', 'warning');
      return;
    }

    try {
      const duration = parseInt(editingPremiumPackageForm.duration);
      const price = parseFloat(editingPremiumPackageForm.price);

      if (duration <= 0 || price < 0) {
        showNotification('Duration must be > 0 and price must be >= 0', 'warning');
        return;
      }

      const response = await apiClient.updatePremiumPackage(editingPremiumPackageId!, {
        name: editingPremiumPackageForm.name,
        duration,
        plan: editingPremiumPackageForm.plan,
        price
      });

      if (response.success) {
        setPremiumPackages(premiumPackages.map(pkg =>
          pkg._id === editingPremiumPackageId || pkg.id === editingPremiumPackageId
            ? response.package
            : pkg
        ));
        setEditingPremiumPackageId(null);
        setEditingPremiumPackageForm({ name: '', duration: '', plan: '', price: '' });
        showNotification('Premium package updated successfully', 'success');
      }
    } catch (error) {
      console.error('[ERROR] Failed to save premium package:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      showNotification(errorMsg || 'Failed to save premium package', 'error');
    }
  };

  const handleDeletePremiumPackage = async (id: string) => {
    if (confirm('Are you sure you want to delete this premium package?')) {
      try {
        const response = await apiClient.deletePremiumPackage(id);

        if (response.success) {
          setPremiumPackages(premiumPackages.filter(pkg => pkg._id !== id && pkg.id !== id));
          showNotification('Premium package deleted successfully', 'success');
        }
      } catch (error) {
        console.error('[ERROR] Failed to delete premium package:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        showNotification(errorMsg || 'Failed to delete premium package', 'error');
      }
    }
  };

  const handleAddPremiumPackage = async () => {
    if (!newPremiumPackageForm.name || !newPremiumPackageForm.duration || !newPremiumPackageForm.price) {
      showNotification('Please fill in all fields', 'warning');
      return;
    }

    try {
      const duration = parseInt(newPremiumPackageForm.duration);
      const price = parseFloat(newPremiumPackageForm.price);

      if (duration <= 0 || price < 0) {
        showNotification('Duration must be > 0 and price must be >= 0', 'warning');
        return;
      }

      const response = await apiClient.createPremiumPackage({
        packageId: `premium_${Date.now()}`,
        name: newPremiumPackageForm.name,
        duration,
        plan: newPremiumPackageForm.plan,
        price,
        features: ['Unlimited Rewinds', 'Unlimited Super Likes', 'No Coin Cost']
      });

      if (response.success) {
        setPremiumPackages([...premiumPackages, response.package]);
        setNewPremiumPackageForm({ name: '', duration: '', plan: '1_month', price: '' });
        setShowAddPremiumPackageForm(false);
        showNotification('Premium package created successfully', 'success');
      }
    } catch (error) {
      console.error('[ERROR] Failed to create premium package:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      showNotification(errorMsg || 'Failed to create premium package', 'error');
    }
  };

  const handleGrantPremium = async (userId: string, plan: string) => {
    try {
      const response = await apiClient.grantPremiumToUser(userId, plan);
      if (response.success) {
        showNotification(`Premium granted to user for ${plan}`, 'success');
        setSelectedUserForPremium(null);
      }
    } catch (error) {
      console.error('[ERROR] Failed to grant premium:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      showNotification(errorMsg || 'Failed to grant premium', 'error');
    }
  };

  const handleRevokePremium = async (userId: string) => {
    try {
      const response = await apiClient.revokePremiumFromUser(userId);
      if (response.success) {
        showNotification('Premium revoked from user', 'success');
        setSelectedUserForPremium(null);
      }
    } catch (error) {
      console.error('[ERROR] Failed to revoke premium:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      showNotification(errorMsg || 'Failed to revoke premium', 'error');
    }
  };

  // Transaction Handlers
  const fetchAllTransactions = async () => {
    try {
      setLoadingTransactions(true);
      setTransactionsError(null);
      const type = transactionFilter === 'ALL' ? undefined : transactionFilter;
      const response = await apiClient.getAllTransactions(50, transactionPage * 50, type);
      
      if (response.success && Array.isArray(response.transactions)) {
        setAllTransactions(response.transactions);
        setTransactionStats(response.stats);
        calculateCoinSalesStats(response.transactions);
      } else {
        setTransactionsError('Failed to fetch transactions');
      }
    } catch (error) {
      console.error('[ERROR] Failed to fetch transactions:', error);
      setTransactionsError((error as any).message || 'Failed to fetch transactions');
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Calculate coin sales statistics from transactions
  const calculateCoinSalesStats = (transactions: any[]) => {
    if (!transactions || transactions.length === 0) {
      setCoinRevenue(0);
      setCoinPurchasesCount(0);
      setAvgTransaction(0);
      setActivePayingUsers(0);
      return;
    }

    // Filter coin purchases only
    const coinPurchases = transactions.filter(t => t.type === 'COIN_PURCHASE');
    
    // Calculate total revenue
    const totalRevenue = coinPurchases.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Calculate average transaction
    const avgTx = coinPurchases.length > 0 ? totalRevenue / coinPurchases.length : 0;
    
    // Get unique paying users (coin purchases only)
    const uniqueUsers = new Set(coinPurchases.map(t => t.userId));
    
    setCoinRevenue(totalRevenue);
    setCoinPurchasesCount(coinPurchases.length);
    setAvgTransaction(avgTx);
    setActivePayingUsers(uniqueUsers.size);
  };

  // Recalculate stats when transactions change
  useEffect(() => {
    if (allTransactions.length > 0) {
      calculateCoinSalesStats(allTransactions);
    }
  }, [allTransactions]);

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Professional Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 border-b border-slate-600 shadow-lg">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black text-white flex items-center gap-3">
                <i className="fa-solid fa-shield-halved text-amber-400"></i>
                Moderation Center
              </h2>
              <p className="text-sm text-slate-300 mt-2 flex items-center gap-2">
                <i className="fa-solid fa-circle text-green-400 text-xs"></i>
                AI-assisted moderation, user management & payment tracking
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-right bg-slate-700 bg-opacity-50 rounded-lg px-4 py-3 border border-slate-600">
                <p className="text-xs text-slate-400 font-semibold">Last Refresh</p>
                <p className="text-sm text-white font-bold">{new Date(lastRefresh).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Chat Display - Professional */}
      {selectedChat && (
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 border-b border-blue-700 px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                <div className="w-14 h-14 rounded-full border-3 border-white bg-gradient-to-br from-blue-300 to-blue-500 flex items-center justify-center text-lg font-bold text-white shadow-lg">
                  {selectedChat.participants[0]?.charAt(0).toUpperCase()}
                </div>
                {selectedChat.participants[1] && (
                  <div className="w-14 h-14 rounded-full border-3 border-white bg-gradient-to-br from-purple-300 to-purple-500 flex items-center justify-center text-lg font-bold text-white shadow-lg">
                    {selectedChat.participants[1]?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">
                    <i className="fa-solid fa-comments mr-2"></i>
                    {selectedChat.participants.slice(0, 2).join(' & ')}
                  </h3>
                  {selectedChat.flaggedCount > 0 && (
                    <span className="bg-red-400 text-white text-xs font-black px-3 py-1 rounded-full animate-pulse shadow-lg">
                      <i className="fa-solid fa-exclamation-circle mr-1"></i>
                      {selectedChat.flaggedCount} FLAGGED
                    </span>
                  )}
                </div>
                <p className="text-sm text-blue-100 mt-1">
                  <i className="fa-solid fa-hashtag mr-1"></i>
                  Chat ID: {selectedChat.id}
                </p>
                <p className="text-xs text-blue-50 mt-0.5">
                  <i className="fa-solid fa-message mr-1"></i>
                  {selectedChat.messages?.length || 0} messages • Last update: {new Date(selectedChat.lastUpdated).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewingChatModal(selectedChat)}
                className="bg-white text-blue-600 font-bold py-2.5 px-5 rounded-lg shadow-lg hover:bg-blue-50 hover:shadow-xl active:scale-95 transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-magnifying-glass"></i>
                View & Moderate
              </button>
              <button
                onClick={() => setSelectedChat(null)}
                className="bg-white bg-opacity-20 text-white font-bold py-2.5 px-5 rounded-lg border border-white border-opacity-30 hover:bg-opacity-30 hover:shadow-lg active:scale-95 transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-times"></i> Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-5 overflow-y-auto flex-1 flex flex-col">
        {/* Tab Navigation - Professional Styling */}
        <div className="mb-7 bg-white rounded-2xl p-2.5 shadow-md border border-gray-200">
          <div className="flex gap-1.5 flex-wrap">
            <button 
              onClick={() => setActiveTab('CHATS')}
              className={`flex-1 min-w-max py-3 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${ activeTab === 'CHATS' 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg scale-105' 
                : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <i className="fa-solid fa-comments"></i>
              <span>Live Chats</span>
            </button>
            <button 
              onClick={() => setActiveTab('PENDING')}
              className={`flex-1 min-w-max py-3 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'PENDING' 
                  ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-lg scale-105' 
                  : 'bg-white text-gray-600 hover:bg-emerald-50 hover:text-emerald-600'
              }`}
            >
              <i className="fa-solid fa-check-circle"></i>
              <span>Replied Chats</span>
            </button>
            <button 
              onClick={() => setActiveTab('STALLED')}
              className={`flex-1 min-w-max py-3 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'STALLED' 
                  ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-lg scale-105' 
                  : 'bg-white text-gray-600 hover:bg-amber-50 hover:text-amber-600'
              }`}
            >
              <i className="fa-solid fa-headset"></i>
              <span>Support Needed</span>
            </button>
            <button 
              onClick={() => setActiveTab('OPERATORS')}
              className={`flex-1 min-w-max py-3 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'OPERATORS' 
                  ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg scale-105' 
                  : 'bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-600'
              }`}
            >
              <i className="fa-solid fa-users-gear"></i>
              <span>Moderators</span>
            </button>
            <button 
              onClick={() => setActiveTab('USERS')}
              className={`flex-1 min-w-max py-3 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'USERS' 
                  ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg scale-105' 
                  : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
              }`}
            >
              <i className="fa-solid fa-user-check"></i>
              <span>Users</span>
            </button>
            <button 
              onClick={() => setActiveTab('PAYMENTS')}
              className={`flex-1 min-w-max py-3 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'PAYMENTS' 
                  ? 'bg-gradient-to-br from-green-600 to-green-700 text-white shadow-lg scale-105' 
                  : 'bg-white text-gray-600 hover:bg-green-50 hover:text-green-600'
              }`}
            >
              <i className="fa-solid fa-credit-card"></i>
              <span>Payments</span>
            </button>
            <button 
              onClick={() => setActiveTab('REVENUE')}
              className={`flex-1 min-w-max py-3 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'REVENUE' 
                  ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white shadow-lg scale-105' 
                  : 'bg-white text-gray-600 hover:bg-orange-50 hover:text-orange-600'
              }`}
            >
              <i className="fa-solid fa-chart-pie"></i>
              <span>Revenue</span>
            </button>
            <button 
              onClick={() => setActiveTab('RESOLVED')}
              className={`flex-1 min-w-max py-3 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'RESOLVED' 
                  ? 'bg-gradient-to-br from-cyan-600 to-cyan-700 text-white shadow-lg scale-105' 
                  : 'bg-white text-gray-600 hover:bg-cyan-50 hover:text-cyan-600'
              }`}
            >
              <i className="fa-solid fa-list-check"></i>
              <span>Activity Log</span>
            </button>
            <button 
              onClick={() => setActiveTab('SUPPORT')}
              className={`flex-1 min-w-max py-3 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'SUPPORT' 
                  ? 'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg scale-105' 
                  : 'bg-white text-gray-600 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <i className="fa-solid fa-envelope"></i>
              <span>Contact Messages</span>
            </button>
            <button 
              onClick={() => setActiveTab('SETTINGS')}
              className={`flex-1 min-w-max py-3 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'SETTINGS' 
                  ? 'bg-gradient-to-br from-slate-600 to-slate-700 text-white shadow-lg scale-105' 
                  : 'bg-white text-gray-600 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              <i className="fa-solid fa-cog"></i>
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Advanced Search Bar */}
        <div className="mb-7">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Search by username, chat ID, user ID, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 text-sm font-medium border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-0 focus:border-blue-500 focus:shadow-lg bg-white transition-all duration-200 placeholder-gray-400"
            />
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-3.5 text-gray-400 text-sm pointer-events-none"></i>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-all"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            )}
          </div>
        </div>

        {activeTab === 'PENDING' && (
          <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                  <i className="fa-solid fa-check-circle"></i>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Replied Chats</h3>
                  <p className="text-xs text-gray-500">Moderation actions completed</p>
                </div>
              </div>
              <button
                onClick={() => fetchRepliedChats()}
                disabled={loadingRepliedChats}
                className="text-sm font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-emerald-50 transition-all border border-emerald-200"
              >
                <i className={`fa-solid fa-rotate-right ${loadingRepliedChats ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>
            </div>

            {loadingRepliedChats ? (
              <div className="text-center py-12">
                <div className="inline-block">
                  <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-emerald-600 animate-spin"></div>
                </div>
                <p className="text-gray-500 text-sm mt-4 font-medium">Loading replied chats...</p>
              </div>
            ) : repliedChats.length === 0 ? (
              <div className="text-center py-12 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200">
                <i className="fa-solid fa-check-circle text-5xl text-emerald-300 mb-3"></i>
                <p className="text-gray-600 text-lg font-semibold">No replied chats yet</p>
                <p className="text-gray-500 text-sm mt-1">Chats that moderators have replied to will appear here</p>
              </div>
            ) : selectedModeratorInPending ? (
              // Show chats for selected moderator
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedModeratorInPending(null)}
                  className="mb-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg flex items-center gap-2 transition-all border border-slate-300"
                >
                  <i className="fa-solid fa-arrow-left"></i>
                  Back to All Moderators
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
                      <div className="text-center py-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                        <i className="fa-solid fa-search text-5xl text-blue-300 mb-3"></i>
                        <p className="text-gray-600 font-semibold">No chats match your search</p>
                        <p className="text-gray-500 text-sm mt-1">"{searchQuery}"</p>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="text-blue-600 hover:text-blue-700 text-sm mt-3 font-semibold underline"
                        >
                          Clear search
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filtered.map(chat => {
                        const user1 = userMap.get(chat.participants[0]) || { id: chat.participants[0], username: chat.participants[0], name: chat.participants[0] };
                        const user2 = userMap.get(chat.participants[1]) || { id: chat.participants[1], username: chat.participants[1], name: chat.participants[1] };
                        const participantNames = `${user1.name || user1.username} & ${user2.name || user2.username}`;
                        const replyTime = formatDate(chat.markedAsRepliedAt, true);
                        
                        return (
                          <div 
                            key={chat.id} 
                            className="bg-white rounded-xl border-2 border-gray-200 hover:border-emerald-400 hover:shadow-lg transition-all p-4 cursor-pointer transform hover:scale-105"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-200 to-emerald-400 flex items-center justify-center text-emerald-700 font-bold shadow-sm">
                                  {(user1.name || user1.username)[0]?.toUpperCase()}{(user2.name || user2.username)[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-sm font-bold text-gray-900">{participantNames}</h4>
                                  <p className="text-xs text-gray-500">Chat ID: {chat.id.slice(0, 10)}...</p>
                                </div>
                              </div>
                              <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-lg font-black border border-emerald-200">
                                <i className="fa-solid fa-check mr-1"></i>Replied
                              </span>
                            </div>
                            
                            <div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-200">
                              <p className="text-xs text-gray-600 font-semibold mb-2">
                                <i className="fa-solid fa-message mr-1"></i>
                                Last Message:
                              </p>
                              {chat.messages && chat.messages.length > 0 ? (
                                <p className="text-xs text-gray-700 italic line-clamp-2">"{chat.messages[chat.messages.length - 1].text.slice(0, 100)}{chat.messages[chat.messages.length - 1].text.length > 100 ? '...' : ''}"</p>
                              ) : (
                                <p className="text-xs text-gray-500 italic">No messages</p>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                              <div className="text-xs text-gray-500">
                                <i className="fa-solid fa-clock text-emerald-500 mr-1"></i>
                                {replyTime}
                              </div>
                              <button 
                                onClick={() => { setSelectedChat(chat); setViewingChatModal(chat); }}
                                className="py-1.5 px-3 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95"
                              >
                                <i className="fa-solid fa-eye mr-1"></i>
                                View
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
          <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                  <i className="fa-solid fa-comments"></i>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Live Chats</h3>
                  <p className="text-xs text-gray-500">Real-time conversations requiring moderation</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-gray-500 font-medium">
                  <i className="fa-solid fa-history mr-1 text-blue-500"></i>
                  {new Date(lastRefresh).toLocaleTimeString()}
                </div>
                <button
                  onClick={() => fetchChats()}
                  disabled={loadingChats}
                  className="text-sm font-bold text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 transition-all border border-blue-200"
                >
                  <i className={`fa-solid fa-rotate-right ${loadingChats ? 'animate-spin' : ''}`}></i>
                  Refresh
                </button>
              </div>
            </div>

            {chatError && (
              <div className="bg-amber-50 border-2 border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2">
                <i className="fa-solid fa-exclamation-triangle"></i>
                {chatError}
              </div>
            )}
            {loadingChats ? (
              <div className="text-center py-12">
                <div className="inline-block">
                  <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin"></div>
                </div>
                <p className="text-gray-500 text-sm mt-4 font-medium">Loading live chats...</p>
              </div>
            ) : chats.length === 0 ? (
              <div className="text-center py-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <i className="fa-solid fa-comments text-5xl text-blue-300 mb-3"></i>
                <p className="text-gray-600 text-lg font-semibold">No chats available</p>
                <p className="text-gray-500 text-sm mt-1">Active conversations will appear here</p>
              </div>
            ) : getFilteredLiveChats().length === 0 ? (
              <div className="text-center py-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <i className="fa-solid fa-search text-5xl text-blue-300 mb-3"></i>
                <p className="text-gray-600 font-semibold">No chats match your search</p>
                <p className="text-gray-500 text-sm mt-1">"{searchQuery}"</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-blue-600 hover:text-blue-700 text-sm mt-3 font-semibold underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {getFilteredLiveChats().map(chat => {
                  // Get user data from map, fallback to participant ID
                  const user1 = userMap.get(chat.participants[0]) || { id: chat.participants[0], username: chat.participants[0], name: chat.participants[0] };
                  const user2 = userMap.get(chat.participants[1]) || { id: chat.participants[1], username: chat.participants[1], name: chat.participants[1] };
                  const participantNames = `${user1.name || user1.username} & ${user2.name || user2.username}`;
                  
                  return (
                    <div 
                      key={chat.id} 
                      onClick={() => { setSelectedChat(chat); setViewingChatModal(chat); }}
                      className={`bg-white rounded-xl border-2 flex items-center justify-between p-4 transition-all duration-200 cursor-pointer ${
                        selectedChat?.id === chat.id 
                          ? 'border-blue-500 bg-blue-50 shadow-lg' 
                          : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                      } active:scale-98`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex -space-x-2">
                          <div className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-blue-300 to-blue-500 flex items-center justify-center text-sm font-bold text-white shadow-md">
                            {user1.name?.charAt(0).toUpperCase() || chat.participants[0].charAt(0).toUpperCase()}
                          </div>
                          {chat.participants[1] && (
                            <div className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-purple-300 to-purple-500 flex items-center justify-center text-sm font-bold text-white shadow-md">
                              {user2.name?.charAt(0).toUpperCase() || chat.participants[1].charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-gray-900">{participantNames}</h4>
                          <p className="text-xs text-gray-500">
                            <i className="fa-solid fa-hashtag mr-1"></i>
                            {chat.id.substring(0, 12)}...
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {chat.flaggedCount > 0 && (
                          <div className="bg-red-100 text-red-600 text-xs font-black px-3 py-1 rounded-full border border-red-200 animate-pulse">
                            <i className="fa-solid fa-flag mr-1"></i>
                            {chat.flaggedCount} FLAGGED
                          </div>
                        )}
                        <div className={`text-lg transition-all ${selectedChat?.id === chat.id ? 'text-blue-500' : 'text-gray-400'}`}>
                          {selectedChat?.id === chat.id ? (
                            <i className="fa-solid fa-check-circle"></i>
                          ) : (
                            <i className="fa-solid fa-chevron-right"></i>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'STALLED' && (
          <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-amber-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-lg">
                  <i className="fa-solid fa-headset"></i>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Support Needed</h3>
                  <p className="text-xs text-gray-500">Chats requiring moderator intervention</p>
                </div>
              </div>
              <button
                onClick={() => fetchStalledChats()}
                disabled={loadingStalled}
                className="text-sm font-bold text-amber-600 hover:text-amber-700 disabled:opacity-50 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-amber-50 transition-all border border-amber-200"
              >
                <i className={`fa-solid fa-rotate-right ${loadingStalled ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>
            </div>
            {loadingStalled ? (
              <div className="text-center py-12">
                <div className="inline-block">
                  <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-amber-600 animate-spin"></div>
                </div>
                <p className="text-gray-500 text-sm mt-4 font-medium">Loading stalled chats...</p>
              </div>
            ) : stalledChats.length === 0 ? (
              <div className="text-center py-12 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
                <i className="fa-solid fa-clock text-5xl text-amber-300 mb-3"></i>
                <p className="text-gray-600 text-lg font-semibold">No stalled chats</p>
                <p className="text-gray-500 text-sm mt-1">Chats inactive for 24+ hours will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {stalledChats.map(chat => (
                  <div 
                    key={chat.id} 
                    className="bg-white rounded-xl border-2 border-gray-200 hover:border-amber-400 hover:shadow-lg transition-all p-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex -space-x-2">
                          <div className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-blue-300 to-blue-500 flex items-center justify-center text-sm font-bold text-white shadow-md">
                            {chat.sender?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-purple-300 to-purple-500 flex items-center justify-center text-sm font-bold text-white shadow-md">
                            {chat.receiver?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-gray-900">
                            {chat.sender?.name} → {chat.receiver?.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            <i className="fa-solid fa-hourglass-end text-amber-500 mr-1"></i>
                            Inactive for {chat.hoursStalled} hours
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="inline-block bg-amber-100 text-amber-700 text-xs px-3 py-1.5 rounded-lg font-black border border-amber-200">
                          <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                          ACTION NEEDED
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-200">
                      <p className="text-xs text-gray-600 font-semibold mb-2">
                        <i className="fa-solid fa-message mr-1"></i>
                        Last Message:
                      </p>
                      <p className="text-xs text-gray-700 italic line-clamp-2">
                        "{chat.lastMessage?.text?.substring(0, 120)}{chat.lastMessage?.text?.length > 120 ? '...' : ''}"
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        <i className="fa-solid fa-clock mr-1"></i>
                        {formatDate(chat.lastMessage?.timestamp, true)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <select 
                        className="flex-1 text-sm border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-0 focus:border-amber-500 transition-all font-medium"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          <i className="fa-solid fa-users-gear mr-1"></i>
                          Select Moderator...
                        </option>
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
                        className="px-5 py-2 bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold rounded-lg hover:shadow-lg active:scale-95 transition-all flex items-center gap-2"
                      >
                        <i className="fa-solid fa-check"></i>
                        Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'OPERATORS' && (
          <div className="space-y-8">
            {/* Standalone Operators Section */}
            <div>
              <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                    <i className="fa-solid fa-user-tie"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Standalone Operators</h3>
                    <p className="text-xs text-gray-500">Direct platform partners</p>
                  </div>
                </div>
                <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600 font-semibold">Total</p>
                  <p className="text-xl font-black text-blue-600">{standaloneOperators.length}</p>
                </div>
              </div>
              {loadingModerators ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin">
                    <i className="fa-solid fa-spinner text-gray-400 text-2xl"></i>
                  </div>
                  <p className="text-gray-400 text-sm mt-3">Loading operators...</p>
                </div>
              ) : standaloneOperators.length === 0 ? (
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-8 text-center border border-blue-200">
                  <i className="fa-solid fa-users text-3xl text-blue-300 mb-3"></i>
                  <p className="text-gray-500 text-sm font-medium">No standalone operators yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {standaloneOperators.map((op: any) => (
                    <div 
                      key={op.id} 
                      onClick={() => {
                        setSelectedModeratorEarnings(op);
                        fetchModeratorEarningsHistory(op.id);
                      }}
                      className="bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105 p-4"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-sm text-gray-900">{op.name || op.username}</p>
                              <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium">{op.email}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              <i className="fa-solid fa-id-card mr-1"></i>
                              {op.id.slice(0, 12)}...
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="bg-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-lg font-bold">
                              <i className="fa-solid fa-comments mr-1"></i>
                              {op.chatsModerated || 0}
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-500 font-semibold mb-2">
                            <i className="fa-solid fa-calendar mr-1"></i>
                            Joined {formatDate(op.joinDate)}
                          </p>
                        </div>
                        
                        {/* Earnings Summary */}
                        {op.earnings && (
                          <div className="grid grid-cols-3 gap-2 pt-2 bg-gray-50 rounded-lg p-3">
                            <div className="text-center">
                              <p className="text-xs text-gray-500 font-semibold">Earned</p>
                              <p className="font-bold text-green-600 text-sm">${(op.earnings.totalEarned || 0).toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-500 font-semibold">Pending</p>
                              <p className="font-bold text-amber-600 text-sm">${(op.earnings.totalPending || 0).toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-500 font-semibold">Paid</p>
                              <p className="font-bold text-blue-600 text-sm">${(op.earnings.totalPaid || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Onboarded Moderators Section */}
            <div>
              <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                    <i className="fa-solid fa-user-check"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Onboarded Moderators</h3>
                    <p className="text-xs text-gray-500">Verified & certified team members</p>
                  </div>
                </div>
                <div className="bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
                  <p className="text-xs text-gray-600 font-semibold">Total</p>
                  <p className="text-xl font-black text-emerald-600">{onboardedModerators.length}</p>
                </div>
              </div>
              {loadingModerators ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin">
                    <i className="fa-solid fa-spinner text-gray-400 text-2xl"></i>
                  </div>
                  <p className="text-gray-400 text-sm mt-3">Loading moderators...</p>
                </div>
              ) : onboardedModerators.length === 0 ? (
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-8 text-center border border-emerald-200">
                  <i className="fa-solid fa-user-check text-3xl text-emerald-300 mb-3"></i>
                  <p className="text-gray-500 text-sm font-medium">No onboarded moderators yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {onboardedModerators.map((mod: any) => (
                    <div 
                      key={mod.id} 
                      onClick={() => {
                        setSelectedModeratorEarnings(mod);
                        fetchModeratorEarningsHistory(mod.id);
                      }}
                      className="bg-white rounded-xl border-2 border-gray-200 hover:border-emerald-400 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105 p-4"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-sm text-gray-900">{mod.name || mod.username}</p>
                              <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium">{mod.email}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              <i className="fa-solid fa-id-card mr-1"></i>
                              {mod.id.slice(0, 12)}...
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1.5 rounded-lg font-bold">
                              <i className="fa-solid fa-comments mr-1"></i>
                              {mod.chatsModerated || 0}
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-500 font-semibold mb-2">
                            <i className="fa-solid fa-calendar mr-1"></i>
                            Since {formatDate(mod.onboardDate)}
                          </p>
                        </div>
                        
                        {/* Earnings Summary */}
                        {mod.earnings && (
                          <div className="grid grid-cols-3 gap-2 pt-2 bg-gray-50 rounded-lg p-3">
                            <div className="text-center">
                              <p className="text-xs text-gray-500 font-semibold">Earned</p>
                              <p className="font-bold text-green-600 text-sm">${(mod.earnings.totalEarned || 0).toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-500 font-semibold">Pending</p>
                              <p className="font-bold text-amber-600 text-sm">${(mod.earnings.totalPending || 0).toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-500 font-semibold">Paid</p>
                              <p className="font-bold text-blue-600 text-sm">${(mod.earnings.totalPaid || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Earnings Detail Modal - Professional */}
            {selectedModeratorEarnings && (
              <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-300 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  {/* Modal Header */}
                  <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 flex items-center justify-between border-b border-slate-700 rounded-t-2xl">
                    <div>
                      <h2 className="text-xl font-bold text-white">Earnings Report</h2>
                      <p className="text-xs text-slate-300 mt-1">Detailed activity and payment summary</p>
                    </div>
                    <button 
                      onClick={() => setSelectedModeratorEarnings(null)}
                      className="text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg p-2 transition-all"
                    >
                      <i className="fa-solid fa-times text-lg"></i>
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Moderator Info Card */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-xl border border-slate-200">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{selectedModeratorEarnings.name || selectedModeratorEarnings.username}</h3>
                          <p className="text-sm text-gray-600 mt-1">{selectedModeratorEarnings.email}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            <i className="fa-solid fa-id-card mr-1"></i>
                            {selectedModeratorEarnings.id}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600 font-semibold mb-1">Status</p>
                          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span className="text-xs font-bold">Active</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Key Metrics Cards */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200 text-center">
                        <i className="fa-solid fa-coins text-green-500 text-xl mb-2"></i>
                        <p className="text-xs text-gray-600 font-semibold">Total Earned</p>
                        <p className="font-black text-green-600 text-lg">${(selectedModeratorEarnings.earnings?.totalEarned || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200 text-center">
                        <i className="fa-solid fa-hourglass-end text-amber-500 text-xl mb-2"></i>
                        <p className="text-xs text-gray-600 font-semibold">Pending</p>
                        <p className="font-black text-amber-600 text-lg">${(selectedModeratorEarnings.earnings?.totalPending || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 text-center">
                        <i className="fa-solid fa-check-circle text-blue-500 text-xl mb-2"></i>
                        <p className="text-xs text-gray-600 font-semibold">Paid Out</p>
                        <p className="font-black text-blue-600 text-lg">${(selectedModeratorEarnings.earnings?.totalPaid || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200 text-center">
                        <i className="fa-solid fa-comments text-purple-500 text-xl mb-2"></i>
                        <p className="text-xs text-gray-600 font-semibold">Chats</p>
                        <p className="font-black text-purple-600 text-lg">{selectedModeratorEarnings.earnings?.chatsCompleted || 0}</p>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-clock text-blue-500"></i>
                        Recent Earnings History
                      </h4>
                      {earningHistoryLoading ? (
                        <div className="text-center py-8">
                          <div className="inline-block animate-spin">
                            <i className="fa-solid fa-spinner text-gray-400 text-2xl"></i>
                          </div>
                          <p className="text-gray-400 text-sm mt-3">Loading earnings history...</p>
                        </div>
                      ) : earningsHistory.length === 0 ? (
                        <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
                          <i className="fa-solid fa-box-open text-gray-300 text-2xl mb-2"></i>
                          <p className="text-gray-500 text-sm font-medium">No earnings history available</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                          {earningsHistory.map((earning: any) => (
                            <div key={earning._id} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all">
                              <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900">
                                  <i className="fa-solid fa-comments text-blue-500 mr-2"></i>
                                  Chat {earning.chatId.slice(0, 8)}...
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  <i className="fa-solid fa-clock mr-1"></i>
                                  {formatDate(earning.repliedAt, true)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-green-600 text-sm">${earning.earnedAmount.toFixed(2)}</p>
                                <span className={`inline-block text-xs px-2.5 py-1 rounded-md font-bold mt-1 ${
                                  earning.status === 'paid' ? 'bg-green-100 text-green-700' :
                                  earning.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                  earning.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {earning.status.charAt(0).toUpperCase() + earning.status.slice(1)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'USERS' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6 bg-white p-4 rounded-xl border border-gray-200">
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
                  onClick={() => fetchAllUsers(1)}
                  disabled={loadingUsers}
                  className="w-full py-2 px-3 bg-pink-600 text-white text-xs font-bold rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <i className={`fa-solid fa-rotate-right ${loadingUsers ? 'animate-spin' : ''}`}></i>
                  {loadingUsers ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">&nbsp;</label>
                <button 
                  onClick={() => setShowAddProfileModal(true)}
                  className="w-full py-2 px-3 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-plus"></i>
                  Add Profile
                </button>
              </div>
            </div>

            {/* Pagination Info */}
            {userTotalCount > 0 && (
              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-700 font-bold">
                  Page <span className="text-blue-900">{userCurrentPage}</span> of <span className="text-blue-900">{Math.ceil(userTotalCount / usersPerPage)}</span>&nbsp;•&nbsp;<span className="text-blue-900">{userTotalCount.toLocaleString()}</span> total users
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchAllUsers(Math.max(1, userCurrentPage - 1))}
                    disabled={userCurrentPage === 1 || loadingUsers}
                    className="px-3 py-1.5 text-xs font-bold bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-all"
                  >
                    <i className="fa-solid fa-chevron-left"></i> Previous
                  </button>
                  <button
                    onClick={() => fetchAllUsers(userCurrentPage + 1)}
                    disabled={userCurrentPage >= Math.ceil(userTotalCount / usersPerPage) || loadingUsers}
                    className="px-3 py-1.5 text-xs font-bold bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-all"
                  >
                    Next <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}

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
                      <div className="flex flex-row gap-2 min-w-fit flex-wrap justify-end">
                        {/* Edit Profile Button */}
                        <button
                          onClick={() => handleEditUser(user)}
                          title="Edit user profile"
                          className="text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap bg-cyan-100 text-cyan-600 hover:bg-cyan-200"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                          Edit
                        </button>

                        {/* Suspension Toggle */}
                        <button
                          onClick={() => toggleUserSuspension(user.id, !user.suspended, 'Admin action')}
                          disabled={actioningUserId === user.id}
                          title={user.suspended ? 'Unsuspend user' : 'Suspend user'}
                          className={`text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            user.suspended
                              ? 'bg-green-100 text-green-600 hover:bg-green-200 disabled:opacity-50'
                              : 'bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50'
                          }`}
                        >
                          <i className={`fa-solid fa-${user.suspended ? 'unlock' : 'lock'}`}></i>
                          {actioningUserId === user.id ? '...' : (user.suspended ? 'Unsuspend' : 'Suspend')}
                        </button>

                        {/* Verification Toggle */}
                        <button
                          onClick={() => toggleUserVerification(user.id, !user.isPhotoVerified)}
                          disabled={actioningUserId === user.id}
                          title={user.isPhotoVerified ? 'Unverify user' : 'Verify user'}
                          className={`text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            user.isPhotoVerified
                              ? 'bg-green-100 text-green-600 hover:bg-green-200 disabled:opacity-50'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'
                          }`}
                        >
                          <i className={`fa-solid fa-${user.isPhotoVerified ? 'check-circle' : 'circle'}`}></i>
                          {actioningUserId === user.id ? '...' : (user.isPhotoVerified ? 'Verified' : 'Verify')}
                        </button>

                        {/* Role Change */}
                        <select
                          value={user.role}
                          onChange={(e) => changeUserRole(user.id, e.target.value)}
                          disabled={actioningUserId === user.id}
                          title="Change user role"
                          className="text-xs font-bold px-2 py-1.5 rounded-lg border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          <option value="USER">User</option>
                          <option value="MODERATOR">Moderator</option>
                          <option value="ADMIN">Admin</option>
                        </select>

                        {/* Account Type Change */}
                        <select
                          value={user.accountType}
                          onChange={(e) => changeAccountType(user.id, e.target.value)}
                          disabled={actioningUserId === user.id}
                          title="Change account type"
                          className="text-xs font-bold px-2 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          <option value="APP">App</option>
                          <option value="STANDALONE">Standalone</option>
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

        {/* Suspension Confirmation Modal */}
        {/* Edit User Profile Modal */}
        {editingUserId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Edit User Profile</h2>
                <button 
                  onClick={() => setEditingUserId(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fa-solid fa-times text-xl"></i>
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Username</label>
                  <input
                    type="text"
                    value={editingUserForm.username}
                    onChange={(e) => setEditingUserForm({...editingUserForm, username: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Email</label>
                  <input
                    type="email"
                    value={editingUserForm.email}
                    onChange={(e) => setEditingUserForm({...editingUserForm, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editingUserForm.name}
                    onChange={(e) => setEditingUserForm({...editingUserForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Age</label>
                  <input
                    type="number"
                    value={editingUserForm.age}
                    onChange={(e) => setEditingUserForm({...editingUserForm, age: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Bio</label>
                  <textarea
                    value={editingUserForm.bio}
                    onChange={(e) => setEditingUserForm({...editingUserForm, bio: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Location</label>
                  <input
                    type="text"
                    value={editingUserForm.location}
                    onChange={(e) => setEditingUserForm({...editingUserForm, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Role</label>
                  <select
                    value={editingUserForm.role}
                    onChange={(e) => setEditingUserForm({...editingUserForm, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  >
                    <option value="USER">User</option>
                    <option value="MODERATOR">Moderator</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                {/* Image Upload Section */}
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-2">Profile Images</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                    <input
                      type="file"
                      id="editProfileImages"
                      multiple
                      accept="image/*"
                      onChange={handleEditProfileImageUpload}
                      disabled={uploadingEditProfile}
                      className="hidden"
                    />
                    <label htmlFor="editProfileImages" className="cursor-pointer block">
                      <div className="text-gray-600">
                        <i className="fa-solid fa-cloud-arrow-up text-xl mb-2 block"></i>
                        <p className="text-xs font-medium">Click to upload or drag images</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                      </div>
                    </label>
                  </div>
                  {uploadingEditProfile && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-cyan-600 h-2 rounded-full transition-all duration-300"
                          style={{width: `${uploadProgressEditProfile}%`}}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600 text-center mt-1">{Math.round(uploadProgressEditProfile)}%</p>
                    </div>
                  )}
                  
                  {/* Display uploaded images */}
                  {editingUserImages.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {editingUserImages.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={imageUrl} 
                            alt={`uploaded-${index}`}
                            className="w-full h-20 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => setEditingUserImages(prev => prev.filter((_, i) => i !== index))}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                            title="Delete image"
                          >
                            <i className="fa-solid fa-times"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingUserId(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUserProfile}
                  disabled={actioningUserId === editingUserId}
                  className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {actioningUserId === editingUserId ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Profile Modal */}
        {showAddProfileModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Add New Profile</h2>
                <button 
                  onClick={() => setShowAddProfileModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fa-solid fa-times text-xl"></i>
                </button>
              </div>

              <p className="text-xs text-gray-600 mb-4">Manual member onboarding - Enter profile information</p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Username *</label>
                  <input
                    type="text"
                    value={newProfileForm.username}
                    onChange={(e) => setNewProfileForm({...newProfileForm, username: e.target.value})}
                    placeholder="username"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Email *</label>
                  <input
                    type="email"
                    value={newProfileForm.email}
                    onChange={(e) => setNewProfileForm({...newProfileForm, email: e.target.value})}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Password *</label>
                  <input
                    type="password"
                    value={newProfileForm.password}
                    onChange={(e) => setNewProfileForm({...newProfileForm, password: e.target.value})}
                    placeholder="Secure password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={newProfileForm.name}
                    onChange={(e) => setNewProfileForm({...newProfileForm, name: e.target.value})}
                    placeholder="Full name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Age</label>
                  <input
                    type="number"
                    value={newProfileForm.age}
                    onChange={(e) => setNewProfileForm({...newProfileForm, age: e.target.value})}
                    placeholder="25"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Bio</label>
                  <textarea
                    value={newProfileForm.bio}
                    onChange={(e) => setNewProfileForm({...newProfileForm, bio: e.target.value})}
                    rows={2}
                    placeholder="Profile bio"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Location</label>
                  <input
                    type="text"
                    value={newProfileForm.location}
                    onChange={(e) => setNewProfileForm({...newProfileForm, location: e.target.value})}
                    placeholder="City, Country"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Role</label>
                  <select
                    value={newProfileForm.role}
                    onChange={(e) => setNewProfileForm({...newProfileForm, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="USER">User</option>
                    <option value="MODERATOR">Moderator</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Account Type</label>
                  <select
                    value={newProfileForm.accountType}
                    onChange={(e) => setNewProfileForm({...newProfileForm, accountType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="APP">App</option>
                    <option value="STANDALONE">Standalone</option>
                  </select>
                </div>

                {/* Image Upload Section */}
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-2">Profile Images</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                    <input
                      type="file"
                      id="newProfileImages"
                      multiple
                      accept="image/*"
                      onChange={handleNewProfileImageUpload}
                      disabled={uploadingNewProfile}
                      className="hidden"
                    />
                    <label htmlFor="newProfileImages" className="cursor-pointer block">
                      <div className="text-gray-600">
                        <i className="fa-solid fa-cloud-arrow-up text-xl mb-2 block"></i>
                        <p className="text-xs font-medium">Click to upload or drag images</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                      </div>
                    </label>
                  </div>
                  {uploadingNewProfile && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{width: `${uploadProgressNewProfile}%`}}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600 text-center mt-1">{Math.round(uploadProgressNewProfile)}%</p>
                    </div>
                  )}
                  
                  {/* Display uploaded images */}
                  {newProfileImages.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {newProfileImages.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={imageUrl} 
                            alt={`uploaded-${index}`}
                            className="w-full h-20 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => setNewProfileImages(prev => prev.filter((_, i) => i !== index))}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                            title="Delete image"
                          >
                            <i className="fa-solid fa-times"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddProfileModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProfile}
                  disabled={creatingProfile}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {creatingProfile ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmationModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded-xl">
            <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <i className="fa-solid fa-exclamation-triangle text-amber-600"></i>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Confirm Action</h2>
              </div>
              
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to <span className="font-bold text-amber-600">{confirmationModal.action === 'suspend' ? 'suspend' : 'unsuspend'}</span> this user?
              </p>
              
              {confirmationModal.reason && (
                <div className="bg-gray-50 p-3 rounded-lg mb-6 border border-gray-200">
                  <p className="text-xs text-gray-600 font-semibold mb-1">Reason:</p>
                  <p className="text-sm text-gray-700">{confirmationModal.reason}</p>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmationModal({ isOpen: false, userId: null, action: null, reason: '' })}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSuspensionAction}
                  disabled={actioningUserId === confirmationModal.userId}
                  className={`flex-1 px-4 py-2 font-bold rounded-lg transition-all text-white ${
                    confirmationModal.action === 'suspend'
                      ? 'bg-red-600 hover:bg-red-700 disabled:opacity-50'
                      : 'bg-green-600 hover:bg-green-700 disabled:opacity-50'
                  }`}
                >
                  {actioningUserId === confirmationModal.userId ? 'Processing...' : (confirmationModal.action === 'suspend' ? 'Suspend' : 'Unsuspend')}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'PAYMENTS' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <i className="fa-solid fa-dollar-sign text-green-600 text-xl"></i>
              Coin Sales & Transactions
            </h3>
            
            {/* Summary Cards - User Coins */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Coin Revenue</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">${coinRevenue.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">All time</p>
                  </div>
                  <div className="bg-green-100 rounded-full p-4">
                    <i className="fa-solid fa-dollar-sign text-green-600 text-2xl"></i>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Coin Purchases</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{coinPurchasesCount}</p>
                    <p className="text-xs text-gray-500 mt-1">This month</p>
                  </div>
                  <div className="bg-blue-100 rounded-full p-4">
                    <i className="fa-solid fa-cart-shopping text-blue-600 text-2xl"></i>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Avg Transaction</p>
                    <p className="text-3xl font-bold text-purple-600 mt-2">${avgTransaction.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">Per purchase</p>
                  </div>
                  <div className="bg-purple-100 rounded-full p-4">
                    <i className="fa-solid fa-arrow-trend-up text-purple-600 text-2xl"></i>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Active Users</p>
                    <p className="text-3xl font-bold text-indigo-600 mt-2">{activePayingUsers}</p>
                    <p className="text-xs text-gray-500 mt-1">Paying customers</p>
                  </div>
                  <div className="bg-indigo-100 rounded-full p-4">
                    <i className="fa-solid fa-users text-indigo-600 text-2xl"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Coin Packages Management */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <i className="fa-solid fa-gift text-blue-600"></i>
                  Coin Packages Management
                </h4>
                <button 
                  onClick={() => setShowAddPackageForm(!showAddPackageForm)}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                >
                  <i className="fa-solid fa-plus"></i>
                  Add Package
                </button>
              </div>

              {/* Add New Package Form */}
              {showAddPackageForm && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-4 mb-6">
                  <h5 className="font-bold text-gray-700 text-xs mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-circle-plus text-green-600"></i>
                    Create New Package
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Coins</label>
                      <input 
                        type="number" 
                        placeholder="e.g., 100"
                        value={newPackageForm.coins}
                        onChange={(e) => setNewPackageForm({...newPackageForm, coins: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Price ($)</label>
                      <input 
                        type="number" 
                        placeholder="e.g., 9.99"
                        value={newPackageForm.price}
                        onChange={(e) => setNewPackageForm({...newPackageForm, price: e.target.value})}
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div className="flex gap-2 items-end">
                      <button 
                        onClick={handleAddPackage}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all"
                      >
                        <i className="fa-solid fa-check mr-1"></i>Save
                      </button>
                      <button 
                        onClick={() => setShowAddPackageForm(false)}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                      >
                        <i className="fa-solid fa-times mr-1"></i>Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Packages Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {coinPackages.map((pkg) => (
                  <div key={pkg.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all">
                    {editingPackageId === pkg.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1">Coins</label>
                          <input 
                            type="number" 
                            value={editingPackageForm.coins}
                            onChange={(e) => setEditingPackageForm({...editingPackageForm, coins: e.target.value})}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1">Price ($)</label>
                          <input 
                            type="number" 
                            value={editingPackageForm.price}
                            onChange={(e) => setEditingPackageForm({...editingPackageForm, price: e.target.value})}
                            step="0.01"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={handleSavePackage}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-bold transition-all"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setEditingPackageId(null)}
                            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-2 py-1 rounded text-xs font-bold transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-center mb-3">
                          <div className="text-3xl font-bold text-green-600 mb-1">{pkg.coins}</div>
                          <p className="text-xs text-gray-600 font-medium">Coins</p>
                        </div>
                        <div className="bg-green-50 rounded-lg py-2 px-3 text-center mb-3">
                          <p className="text-lg font-bold text-green-700">${pkg.price.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEditPackage(pkg)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded text-xs font-bold transition-all flex items-center justify-center gap-1"
                          >
                            <i className="fa-solid fa-edit"></i>Edit
                          </button>
                          <button 
                            onClick={() => handleDeletePackage(pkg.id)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-2 py-1.5 rounded text-xs font-bold transition-all flex items-center justify-center gap-1"
                          >
                            <i className="fa-solid fa-trash"></i>Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-800 flex items-center gap-2">
                  <i className="fa-solid fa-info-circle text-blue-600"></i>
                  <strong>Note:</strong> Packages modified here will appear to users on their profiles when they buy coins.
                </p>
              </div>
            </div>

            {/* User Coin Purchases Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <i className="fa-solid fa-file-invoice text-green-600"></i>
                  Recent Coin Purchases
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-600">User</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-600">Coins</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-600">Amount</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-600">Method</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-600">Status</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCoinPurchases ? (
                      <tr className="border-b border-gray-200">
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          <div className="profile-spinner" style={{ display: 'inline-block', marginBottom: '8px' }}></div>
                          <p className="text-sm font-medium">Loading purchases...</p>
                        </td>
                      </tr>
                    ) : coinPurchases.length === 0 ? (
                      <tr className="border-b border-gray-200">
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          <i className="fa-solid fa-inbox text-3xl text-gray-300 mb-2 block"></i>
                          <p className="text-sm font-medium">No coin purchases yet</p>
                        </td>
                      </tr>
                    ) : (
                      coinPurchases.map((purchase) => (
                        <tr key={purchase.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-gray-900">{purchase.username}</span>
                              <span className="text-xs text-gray-500">{purchase.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-blue-600">{purchase.coins}</td>
                          <td className="px-6 py-4 font-medium text-gray-900">${purchase.price}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                              purchase.method === 'card' ? 'bg-blue-100 text-blue-700' :
                              purchase.method === 'momo' ? 'bg-green-100 text-green-700' :
                              purchase.method === 'apple' ? 'bg-gray-100 text-gray-700' :
                              purchase.method === 'google' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {purchase.method || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              purchase.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                              purchase.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                              purchase.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {purchase.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-xs">
                            {formatDate(purchase.createdAt, true)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Premium Packages Management */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <i className="fa-solid fa-crown text-purple-600"></i>
                  Premium Packages Management
                </h4>
                <button 
                  onClick={() => setShowAddPremiumPackageForm(!showAddPremiumPackageForm)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                >
                  <i className="fa-solid fa-plus"></i>
                  Add Package
                </button>
              </div>

              {/* Add New Premium Package Form */}
              {showAddPremiumPackageForm && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-4 mb-6">
                  <h5 className="font-bold text-gray-700 text-xs mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-circle-plus text-purple-600"></i>
                    Create New Premium Package
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Premium Plus"
                        value={newPremiumPackageForm.name}
                        onChange={(e) => setNewPremiumPackageForm({...newPremiumPackageForm, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Duration (days)</label>
                      <input 
                        type="number" 
                        placeholder="e.g., 30"
                        value={newPremiumPackageForm.duration}
                        onChange={(e) => setNewPremiumPackageForm({...newPremiumPackageForm, duration: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Plan</label>
                      <select 
                        value={newPremiumPackageForm.plan}
                        onChange={(e) => setNewPremiumPackageForm({...newPremiumPackageForm, plan: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="1_month">1 Month</option>
                        <option value="3_months">3 Months</option>
                        <option value="6_months">6 Months</option>
                        <option value="12_months">12 Months</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Price ($)</label>
                      <input 
                        type="number" 
                        placeholder="e.g., 9.99"
                        value={newPremiumPackageForm.price}
                        onChange={(e) => setNewPremiumPackageForm({...newPremiumPackageForm, price: e.target.value})}
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div className="flex gap-2 items-end">
                      <button 
                        onClick={handleAddPremiumPackage}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all"
                      >
                        <i className="fa-solid fa-check mr-1"></i>Save
                      </button>
                      <button 
                        onClick={() => setShowAddPremiumPackageForm(false)}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                      >
                        <i className="fa-solid fa-times mr-1"></i>Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Premium Packages Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {premiumPackages.length === 0 ? (
                  <div className="md:col-span-4 text-center py-12 text-gray-500">
                    <i className="fa-solid fa-inbox text-4xl text-gray-300 mb-2 block"></i>
                    <p className="font-medium">No premium packages</p>
                    <p className="text-xs mt-1">Create your first premium package to get started</p>
                  </div>
                ) : (
                  premiumPackages.map((pkg) => (
                    <div key={pkg._id || pkg.id} className="border border-purple-200 rounded-lg p-4 hover:border-purple-500 hover:shadow-md transition-all bg-gradient-to-br from-white to-purple-50">
                      {editingPremiumPackageId === pkg._id || editingPremiumPackageId === pkg.id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Name</label>
                            <input 
                              type="text" 
                              value={editingPremiumPackageForm.name}
                              onChange={(e) => setEditingPremiumPackageForm({...editingPremiumPackageForm, name: e.target.value})}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Duration (days)</label>
                            <input 
                              type="number" 
                              value={editingPremiumPackageForm.duration}
                              onChange={(e) => setEditingPremiumPackageForm({...editingPremiumPackageForm, duration: e.target.value})}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Price ($)</label>
                            <input 
                              type="number" 
                              value={editingPremiumPackageForm.price}
                              onChange={(e) => setEditingPremiumPackageForm({...editingPremiumPackageForm, price: e.target.value})}
                              step="0.01"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={handleSavePremiumPackage}
                              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-bold transition-all"
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setEditingPremiumPackageId(null)}
                              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-2 py-1 rounded text-xs font-bold transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-center mb-3">
                            <div className="text-2xl font-bold text-purple-600 mb-1">{pkg.name}</div>
                            <p className="text-xs text-gray-600 font-medium">{pkg.duration} days</p>
                          </div>
                          <div className="bg-purple-100 rounded-lg py-2 px-3 text-center mb-3">
                            <p className="text-lg font-bold text-purple-700">${pkg.price.toFixed(2)}</p>
                            <p className="text-xs text-purple-600 mt-0.5">{pkg.plan.replace(/_/g, ' ')}</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleEditPremiumPackage(pkg)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded text-xs font-bold transition-all flex items-center justify-center gap-1"
                            >
                              <i className="fa-solid fa-edit"></i>Edit
                            </button>
                            <button 
                              onClick={() => handleDeletePremiumPackage(pkg._id || pkg.id)}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-2 py-1.5 rounded text-xs font-bold transition-all flex items-center justify-center gap-1"
                            >
                              <i className="fa-solid fa-trash"></i>Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-800 flex items-center gap-2">
                  <i className="fa-solid fa-info-circle text-purple-600"></i>
                  <strong>Note:</strong> Packages modified here will appear to users in ProfileSettings when they purchase premium membership.
                </p>
              </div>
            </div>

            {/* All Transactions Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <i className="fa-solid fa-receipt text-green-600"></i>
                  All Transactions (Coins & Premium)
                </h4>
                <button 
                  onClick={fetchAllTransactions}
                  disabled={loadingTransactions}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                >
                  <i className="fa-solid fa-refresh"></i>
                  {loadingTransactions ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {/* Transaction Filter Tabs */}
              <div className="flex gap-2 mb-4 border-b border-gray-200">
                {['ALL', 'COIN_PURCHASE', 'PREMIUM_UPGRADE'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      setTransactionFilter(filter as any);
                      setTransactionPage(0);
                    }}
                    className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                      transactionFilter === filter
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {filter === 'COIN_PURCHASE' && 'Coin Purchases'}
                    {filter === 'PREMIUM_UPGRADE' && 'Premium Upgrades'}
                    {filter === 'ALL' && 'All Transactions'}
                  </button>
                ))}
              </div>

              {/* Transaction Stats */}
              {transactionStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {transactionStats.byType && Object.entries(transactionStats.byType).map(([type, data]: any) => (
                    <div key={type} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-xs text-gray-600 font-semibold mb-2">{type === 'COIN_PURCHASE' ? 'Coin Purchases' : 'Premium Upgrades'}</p>
                      <p className="text-2xl font-bold text-gray-800">{data.count}</p>
                      <p className="text-xs text-gray-500 mt-1">${data.totalAmount?.toFixed(2) || 0}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Transactions Table */}
              {transactionsError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <i className="fa-solid fa-exclamation-circle mr-2"></i>{transactionsError}
                </div>
              ) : allTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">User</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Type</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Amount</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Method</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTransactions.map((tx: any) => (
                        <tr key={tx.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                                {tx.user?.avatar ? (
                                  <img src={tx.user.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-600">
                                    {tx.user?.username?.charAt(0)?.toUpperCase() || 'U'}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">{tx.user?.username || 'Unknown'}</p>
                                <p className="text-xs text-gray-500">{tx.userId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                              tx.type === 'COIN_PURCHASE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              <i className={`fa-solid ${tx.type === 'COIN_PURCHASE' ? 'fa-coins' : 'fa-crown'}`}></i>
                              {tx.type === 'COIN_PURCHASE' ? 'Coin' : 'Premium'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-800">{tx.price || `${tx.amount} coins`}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-xs">
                              <i className={`fa-solid ${
                                tx.method === 'momo' || tx.method === 'lipana' ? 'fa-mobile' : 'fa-credit-card'
                              } text-gray-600`}></i>
                              {tx.method === 'momo' || tx.method === 'lipana' ? 'Mobile Money' : 'Card'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                              tx.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                              tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              <i className={`fa-solid ${
                                tx.status === 'COMPLETED' ? 'fa-check-circle' :
                                tx.status === 'PENDING' ? 'fa-hourglass-end' :
                                'fa-times-circle'
                              }`}></i>
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : loadingTransactions ? (
                <div className="flex justify-center items-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin"><i className="fa-solid fa-spinner text-2xl text-blue-600"></i></div>
                    <p className="text-sm text-gray-600">Loading transactions...</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <i className="fa-solid fa-inbox text-4xl text-gray-300 mb-2 block"></i>
                  <p className="text-gray-600">No transactions found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'REVENUE' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <i className="fa-solid fa-hand-holding-dollar text-amber-600 text-xl"></i>
              Revenue & Moderator Payouts
            </h3>

            {/* Summary Cards - Moderator */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Total Distributed</p>
                    <p className="text-3xl font-bold text-amber-600 mt-2">$0.00</p>
                    <p className="text-xs text-gray-500 mt-1">To moderators</p>
                  </div>
                  <div className="bg-amber-100 rounded-full p-4">
                    <i className="fa-solid fa-hand-holding-dollar text-amber-600 text-2xl"></i>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Pending Payouts</p>
                    <p className="text-3xl font-bold text-orange-600 mt-2">$0.00</p>
                    <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
                  </div>
                  <div className="bg-orange-100 rounded-full p-4">
                    <i className="fa-solid fa-clock text-orange-600 text-2xl"></i>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Active Moderators</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">0</p>
                    <p className="text-xs text-gray-500 mt-1">Earning commissions</p>
                  </div>
                  <div className="bg-blue-100 rounded-full p-4">
                    <i className="fa-solid fa-users text-blue-600 text-2xl"></i>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Monthly Budget</p>
                    <p className="text-3xl font-bold text-rose-600 mt-2">$0.00</p>
                    <p className="text-xs text-gray-500 mt-1">Allocated</p>
                  </div>
                  <div className="bg-rose-100 rounded-full p-4">
                    <i className="fa-solid fa-chart-column text-rose-600 text-2xl"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Commission Structure */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
              <h4 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
                <i className="fa-solid fa-percent text-amber-600"></i>
                Commission Structure
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-amber-100">
                  <p className="text-xs text-gray-600 font-semibold mb-2">Chat Moderation</p>
                  <p className="text-2xl font-bold text-amber-600">15%</p>
                  <p className="text-xs text-gray-500 mt-1">Per flagged message resolved</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-amber-100">
                  <p className="text-xs text-gray-600 font-semibold mb-2">Photo Verification</p>
                  <p className="text-2xl font-bold text-amber-600">20%</p>
                  <p className="text-xs text-gray-500 mt-1">Per verified photo package</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-amber-100">
                  <p className="text-xs text-gray-600 font-semibold mb-2">User Reports</p>
                  <p className="text-2xl font-bold text-amber-600">10%</p>
                  <p className="text-xs text-gray-500 mt-1">Per resolved report</p>
                </div>
              </div>
            </div>

            {/* Moderator Earnings Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <i className="fa-solid fa-list-check text-blue-600"></i>
                  Moderator Earnings
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-600">Moderator</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-600">Tasks Completed</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-600">This Month</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-600">Total Earned</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-600">Balance Due</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-600">Status</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        <i className="fa-solid fa-inbox text-3xl text-gray-300 mb-2 block"></i>
                        <p className="text-sm font-medium">No moderators with activity yet</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payout Methods */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h4 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
                <i className="fa-solid fa-credit-card text-blue-600"></i>
                Payout Methods
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <i className="fa-brands fa-stripe text-2xl text-blue-600"></i>
                    <div>
                      <p className="font-semibold text-gray-700 text-sm">Stripe Connect</p>
                      <p className="text-xs text-gray-500">Fast transfers, low fees</p>
                    </div>
                  </div>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Active</span>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-building-columns text-2xl text-gray-400"></i>
                    <div>
                      <p className="font-semibold text-gray-700 text-sm">Bank Transfer</p>
                      <p className="text-xs text-gray-500">Direct to bank account</p>
                    </div>
                  </div>
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">Inactive</span>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <i className="fa-brands fa-paypal text-2xl text-blue-500"></i>
                    <div>
                      <p className="font-semibold text-gray-700 text-sm">PayPal</p>
                      <p className="text-xs text-gray-500">Via PayPal account</p>
                    </div>
                  </div>
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">Inactive</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'RESOLVED' && (
          <div className="space-y-6">
            {/* Section Header with Metrics */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-cyan-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white shadow-lg">
                  <i className="fa-solid fa-list-check"></i>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Activity Log</h3>
                  <p className="text-xs text-gray-500">Complete system activity history and audit trail</p>
                </div>
              </div>
              <button
                onClick={() => {
                  fetchActivityLogs();
                  fetchActivityLogSummary();
                }}
                disabled={loadingActivityLogs}
                className="text-sm font-bold text-cyan-600 hover:text-cyan-700 disabled:opacity-50 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cyan-50 transition-all border border-cyan-200"
              >
                <i className={`fa-solid fa-rotate-right ${loadingActivityLogs ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>
            </div>

            {/* Quick Stats */}
            {activityLogSummary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <p className="text-xs text-gray-600 font-semibold">Moderation</p>
                  <p className="text-2xl font-black text-blue-600 mt-1">
                    {activityLogSummary.byCategory?.find((c: any) => c._id === 'moderation')?.count || 0}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                  <p className="text-xs text-gray-600 font-semibold">Moderators</p>
                  <p className="text-2xl font-black text-purple-600 mt-1">
                    {activityLogSummary.byCategory?.find((c: any) => c._id === 'moderators')?.count || 0}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                  <p className="text-xs text-gray-600 font-semibold">Payments</p>
                  <p className="text-2xl font-black text-green-600 mt-1">
                    ${activityLogSummary.financial?.reduce((sum: number, f: any) => sum + (f.totalAmount || 0), 0).toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
                  <p className="text-xs text-gray-600 font-semibold">Users</p>
                  <p className="text-2xl font-black text-amber-600 mt-1">
                    {activityLogSummary.byCategory?.find((c: any) => c._id === 'users')?.count || 0}
                  </p>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h4 className="text-sm font-bold text-gray-900">Filters</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select
                  value={activityLogFilter.category}
                  onChange={(e) => {
                    setActivityLogFilter({ ...activityLogFilter, category: e.target.value, skip: 0 });
                    fetchActivityLogs({ category: e.target.value, skip: 0 });
                  }}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                >
                  <option value="">All Categories</option>
                  <option value="moderation">Moderation</option>
                  <option value="moderators">Moderators</option>
                  <option value="payments">Payments</option>
                  <option value="users">Users</option>
                  <option value="reports">Reports</option>
                  <option value="admin">Admin</option>
                  <option value="system">System</option>
                </select>

                <select
                  value={activityLogFilter.status}
                  onChange={(e) => {
                    setActivityLogFilter({ ...activityLogFilter, status: e.target.value, skip: 0 });
                    fetchActivityLogs({ status: e.target.value, skip: 0 });
                  }}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                >
                  <option value="">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="failure">Failure</option>
                  <option value="pending">Pending</option>
                </select>

                <input
                  type="text"
                  placeholder="Search activities..."
                  onChange={(e) => {
                    setActivityLogFilter({ ...activityLogFilter, skip: 0 });
                    // Implement search with debounce in real app
                  }}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                />

                <button
                  onClick={() => {
                    setActivityLogFilter({ category: '', action: '', status: '', limit: 50, skip: 0 });
                    fetchActivityLogs({ category: '', action: '', status: '', skip: 0 });
                  }}
                  className="px-3 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                >
                  <i className="fa-solid fa-redo mr-1"></i>Reset Filters
                </button>
              </div>
            </div>

            {/* Activity Logs Table */}
            {loadingActivityLogs ? (
              <div className="text-center py-12">
                <div className="inline-block">
                  <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-cyan-600 animate-spin"></div>
                </div>
                <p className="text-gray-500 text-sm mt-4 font-medium">Loading activity logs...</p>
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="text-center py-12 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg border border-cyan-200">
                <i className="fa-solid fa-inbox text-5xl text-cyan-300 mb-3"></i>
                <p className="text-gray-600 text-lg font-semibold">No activities found</p>
                <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activityLogs.map((log: any) => {
                  const categoryColors: any = {
                    moderation: { bg: 'from-red-50 to-red-100', border: 'border-red-200', icon: 'fa-flag', text: 'text-red-600' },
                    moderators: { bg: 'from-purple-50 to-purple-100', border: 'border-purple-200', icon: 'fa-users-gear', text: 'text-purple-600' },
                    payments: { bg: 'from-green-50 to-green-100', border: 'border-green-200', icon: 'fa-credit-card', text: 'text-green-600' },
                    users: { bg: 'from-blue-50 to-blue-100', border: 'border-blue-200', icon: 'fa-user', text: 'text-blue-600' },
                    reports: { bg: 'from-orange-50 to-orange-100', border: 'border-orange-200', icon: 'fa-triangle-exclamation', text: 'text-orange-600' },
                    admin: { bg: 'from-indigo-50 to-indigo-100', border: 'border-indigo-200', icon: 'fa-shield', text: 'text-indigo-600' },
                    system: { bg: 'from-gray-50 to-gray-100', border: 'border-gray-200', icon: 'fa-gears', text: 'text-gray-600' }
                  };

                  const colors = categoryColors[log.category] || categoryColors.system;
                  const statusBadges: any = {
                    success: 'bg-green-100 text-green-700',
                    failure: 'bg-red-100 text-red-700',
                    pending: 'bg-amber-100 text-amber-700'
                  };

                  return (
                    <div key={log.id} className={`bg-gradient-to-r ${colors.bg} border-2 ${colors.border} rounded-xl p-4 hover:shadow-md transition-all`}>
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0 border ${colors.border}`}>
                          <i className={`fa-solid ${colors.icon} ${colors.text} text-lg`}></i>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-gray-900">{log.description}</h4>
                              <p className="text-xs text-gray-600 mt-1">
                                <i className="fa-solid fa-user-circle mr-1"></i>
                                {log.actor?.name || log.actor?.userId || 'System'} • 
                                <i className="fa-solid fa-tag ml-2 mr-1"></i>
                                {log.action.replace(/_/g, ' ').toUpperCase()}
                              </p>
                              {log.details && (
                                <p className="text-xs text-gray-600 mt-2">
                                  <i className="fa-solid fa-file-text mr-1"></i>
                                  {log.details}
                                </p>
                              )}
                              {log.reason && (
                                <p className="text-xs text-gray-700 mt-1">
                                  <i className="fa-solid fa-circle-info mr-1 text-amber-500"></i>
                                  <span className="font-semibold">Reason:</span> {log.reason}
                                </p>
                              )}
                              {log.financial?.amount && (
                                <p className="text-xs text-green-700 mt-1 font-bold">
                                  <i className="fa-solid fa-dollar-sign mr-1"></i>
                                  ${log.financial.amount.toFixed(2)} {log.financial.currency}
                                </p>
                              )}
                            </div>

                            {/* Status & Time */}
                            <div className="text-right flex-shrink-0">
                              <span className={`inline-block text-xs px-2.5 py-1 rounded-lg font-bold ${statusBadges[log.status]}`}>
                                {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                              </span>
                              <p className="text-xs text-gray-500 mt-2">
                                {formatDate(log.timestamp, true)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {activityLogs.length > 0 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-gray-600">
                  Showing {activityLogFilter.skip + 1} to {Math.min(activityLogFilter.skip + activityLogFilter.limit, activityLogTotalCount)} of {activityLogTotalCount} activities
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const newSkip = Math.max(0, activityLogFilter.skip - activityLogFilter.limit);
                      setActivityLogFilter({ ...activityLogFilter, skip: newSkip });
                      fetchActivityLogs({ skip: newSkip });
                    }}
                    disabled={activityLogFilter.skip === 0}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                  <button
                    onClick={() => {
                      const newSkip = activityLogFilter.skip + activityLogFilter.limit;
                      if (newSkip < activityLogTotalCount) {
                        setActivityLogFilter({ ...activityLogFilter, skip: newSkip });
                        fetchActivityLogs({ skip: newSkip });
                      }
                    }}
                    disabled={activityLogFilter.skip + activityLogFilter.limit >= activityLogTotalCount}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'SUPPORT' && (
          <div className="space-y-6">
            {/* Section Header with Stats */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white shadow-lg">
                  <i className="fa-solid fa-envelope"></i>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Contact Messages</h3>
                  <p className="text-xs text-gray-500">Messages from users through the contact form</p>
                </div>
              </div>
              <button
                onClick={() => {
                  fetchContactMessages();
                  fetchMessageStats();
                }}
                disabled={loadingMessages}
                className="text-sm font-bold text-red-600 hover:text-red-700 disabled:opacity-50 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 transition-all border border-red-200"
              >
                <i className={`fa-solid fa-rotate-right ${loadingMessages ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>
            </div>

            {/* Stats Cards */}
            {messageStats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-black text-red-600">{messageStats.new || 0}</p>
                  <p className="text-xs font-semibold text-gray-600 mt-1">New</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-black text-blue-600">{messageStats.read || 0}</p>
                  <p className="text-xs font-semibold text-gray-600 mt-1">Read</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-black text-green-600">{messageStats.responded || 0}</p>
                  <p className="text-xs font-semibold text-gray-600 mt-1">Responded</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-black text-purple-600">{messageStats.resolved || 0}</p>
                  <p className="text-xs font-semibold text-gray-600 mt-1">Resolved</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-black text-orange-600">{messageStats.high_priority || 0}</p>
                  <p className="text-xs font-semibold text-gray-600 mt-1">High Priority</p>
                </div>
              </div>
            )}

            {/* Messages List */}
            {loadingMessages ? (
              <div className="text-center py-12">
                <div className="inline-block">
                  <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-red-600 animate-spin"></div>
                </div>
                <p className="text-gray-500 text-sm mt-4 font-medium">Loading contact messages...</p>
              </div>
            ) : contactMessages.length === 0 ? (
              <div className="text-center py-12 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                <i className="fa-solid fa-inbox text-5xl text-red-300 mb-3"></i>
                <p className="text-gray-600 text-lg font-semibold">No contact messages</p>
                <p className="text-gray-500 text-sm mt-1">Contact form submissions will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contactMessages.map((msg: any) => (
                  <div key={msg._id} className="bg-white rounded-lg border-2 border-gray-200 hover:border-red-300 hover:shadow-lg transition-all p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-bold text-gray-900">{msg.name}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            msg.status === 'new' ? 'bg-red-100 text-red-700' :
                            msg.status === 'read' ? 'bg-blue-100 text-blue-700' :
                            msg.status === 'responded' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                          </span>
                          {msg.priority === 'high' && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-orange-100 text-orange-700">
                              <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                              HIGH PRIORITY
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{msg.email}</p>
                      </div>
                      <p className="text-xs text-gray-400 text-right">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg mb-3 border border-gray-200">
                      <p className="text-xs font-bold text-gray-600 mb-1"><i className="fa-solid fa-heading mr-1"></i>Subject:</p>
                      <p className="text-sm text-gray-800 font-semibold">{msg.subject}</p>
                      <p className="text-xs font-bold text-gray-600 mt-2 mb-1"><i className="fa-solid fa-message mr-1"></i>Message:</p>
                      <p className="text-sm text-gray-700">{msg.message}</p>
                    </div>

                    {msg.response && (
                      <div className="bg-green-50 p-3 rounded-lg mb-3 border border-green-200">
                        <p className="text-xs font-bold text-green-600 mb-1"><i className="fa-solid fa-reply mr-1"></i>Response:</p>
                        <p className="text-sm text-green-900">{msg.response}</p>
                        {msg.respondedBy && (
                          <p className="text-xs text-green-600 mt-2">By: {msg.respondedBy.username || 'Moderator'}</p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {msg.status !== 'read' && (
                        <button 
                          onClick={async () => {
                            try {
                              await apiClient.patch(`/support/messages/${msg._id}/read`, {});
                              fetchContactMessages();
                            } catch (err) {
                              console.error('Error marking as read:', err);
                            }
                          }}
                          className="flex-1 text-xs bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-lg transition-all"
                        >
                          <i className="fa-solid fa-eye mr-1"></i>
                          Mark as Read
                        </button>
                      )}
                      {msg.status !== 'resolved' && (
                        <button 
                          onClick={async () => {
                            try {
                              await apiClient.patch(`/support/messages/${msg._id}/resolve`, {});
                              fetchContactMessages();
                              fetchMessageStats();
                            } catch (err) {
                              console.error('Error resolving:', err);
                            }
                          }}
                          className="flex-1 text-xs bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-lg transition-all"
                        >
                          <i className="fa-solid fa-check mr-1"></i>
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'SETTINGS' && (
          <LandingPageSettingsPanel isOpen={true} embedded={true} />
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
