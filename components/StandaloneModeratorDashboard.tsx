import React, { useState, useEffect, useRef } from 'react';
import { useModerationAuth } from '../services/ModerationAuthContext';
import ChatModerationView, { ModeratorChat, Message } from './ChatModerationView';
import PaymentMethodModal from './PaymentMethodModal';
import ModeratedChatsModal from './ModeratedChatsModal';
import apiClient from '../services/apiClient';
import { useWebSocketContext } from '../services/WebSocketProvider';

interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  age?: number;
  location?: string;
  bio?: string;
  phone?: string;
  interests?: string[];
  images?: string[];
  accountType: 'APP' | 'STANDALONE';
  coins?: number;
}

interface ModerationStats {
  warningsIssued?: number;
  bansIssued?: number;
  chatsModerated?: number;
  averageResponseTime?: number;
  totalReports?: number;
  flaggedMessages?: number;
}

interface ModeratorNotification {
  id: string;
  type: 'system' | 'chat';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  category?: string;
  metadata?: any;
}

const areModerationStatsEqual = (left: ModerationStats = {}, right: ModerationStats = {}) => (
  (left.warningsIssued || 0) === (right.warningsIssued || 0) &&
  (left.bansIssued || 0) === (right.bansIssued || 0) &&
  (left.chatsModerated || 0) === (right.chatsModerated || 0) &&
  (left.averageResponseTime || 0) === (right.averageResponseTime || 0) &&
  (left.totalReports || 0) === (right.totalReports || 0) &&
  (left.flaggedMessages || 0) === (right.flaggedMessages || 0)
);

const areChatCollectionsEqual = (left: ModeratorChat[] = [], right: ModeratorChat[] = []) => {
  if (left.length !== right.length) return false;

  return left.every((chat, index) => {
    const other = right[index];
    if (!other) return false;

    return chat.id === other.id &&
      (chat.lastUpdated || 0) === (other.lastUpdated || 0) &&
      (chat.markedAsRepliedAt || 0) === (other.markedAsRepliedAt || 0) &&
      (chat.replyStatus || '') === (other.replyStatus || '') &&
      Boolean(chat.isReplied) === Boolean(other.isReplied) &&
      (chat.flaggedCount || 0) === (other.flaggedCount || 0) &&
      (chat.messages?.length || 0) === (other.messages?.length || 0);
  });
};

const arePaymentEntriesEqual = (left: any[] = [], right: any[] = []) => {
  if (left.length !== right.length) return false;

  return left.every((payment, index) => {
    const other = right[index];
    if (!other) return false;

    return (payment.id || payment._id || index) === (other.id || other._id || index) &&
      (payment.amount || 0) === (other.amount || 0) &&
      (payment.date || payment.createdAt || '') === (other.date || other.createdAt || '') &&
      (payment.status || '') === (other.status || '');
  });
};

const StandaloneModeratorDashboard: React.FC = () => {
  const { user, logout, accountType } = useModerationAuth();
  const { addMessageHandler } = useWebSocketContext();
  const hasLoadedStatsRef = useRef(false);
  const hasLoadedChatsRef = useRef(false);
  const hasLoadedPaymentsRef = useRef(false);
  const silentRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'moderation' | 'activity'>('overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showModeratedChatsModal, setShowModeratedChatsModal] = useState(false);
  const [showModerationView, setShowModerationView] = useState(false);
  const [showChatDropdown, setShowChatDropdown] = useState(false); // ✅ Chat notification dropdown
  const [showSystemNotifications, setShowSystemNotifications] = useState(false);
  const [selectedChat, setSelectedChat] = useState<ModeratorChat | null>(null);
  const [systemNotifications, setSystemNotifications] = useState<ModeratorNotification[]>([]);
  
  // Profile Editing
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState<User | null>(user || null);
  const [profileChanges, setProfileChanges] = useState<Partial<User>>({});
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Stats
  const [sessionEarnings, setSessionEarnings] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [moderatedChatsCount, setModeratedChatsCount] = useState(0);
  const [unrepliedChatsCount, setUnrepliedChatsCount] = useState(0);
  const [moderationStats, setModerationStats] = useState<ModerationStats>({});
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Moderation data
  const [unrepliedChats, setUnrepliedChats] = useState<ModeratorChat[]>([]);
  const [repliedChats, setRepliedChats] = useState<ModeratorChat[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [chatsError, setChatsError] = useState('');
  
  // Payment tracking
  const [paymentBalance, setPaymentBalance] = useState(0);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [approvedPayoutBalance, setApprovedPayoutBalance] = useState(0);
  const [pendingApprovalBalance, setPendingApprovalBalance] = useState(0);
  const [nextPayoutDate, setNextPayoutDate] = useState<string | null>(null);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<any>(null);
  const unreadSystemNotifications = systemNotifications.filter(notification => !notification.read).length;

  // ✅ Fetch full user profile on mount
  useEffect(() => {
    const fetchProfileData = async () => {
      if (user?.id) {
        try {
          const fullUserData = await apiClient.get(`/users/${user.id}`);
          setProfileData(fullUserData);
          console.log('[DEBUG] Loaded full user profile:', fullUserData);
        } catch (err) {
          console.warn('Failed to fetch full user profile, using session data:', err);
          setProfileData(user);
        }
      } else {
        setProfileData(user);
      }
    };

    fetchProfileData();
    fetchAllStats({ silent: true });
    if (user?.id) {
      fetchPaymentData({ silent: true });
      fetchChatsData({ silent: true });
    }
  }, [user]);

  // ✅ Real-time chat updates every 5 seconds
  useEffect(() => {
    const chatRefreshInterval = setInterval(() => {
      if (user?.id) {
        fetchChatsData({ silent: true });
        fetchAllStats({ silent: true });
        fetchPaymentData({ silent: true });
      }
    }, 15000);

    return () => clearInterval(chatRefreshInterval);
  }, [user?.id]);

  useEffect(() => {
    const unregister = addMessageHandler((data: any) => {
      if (!data) return;
      if (data.type === 'system_notification') {
        setSystemNotifications(prev => [
          {
            id: data.id || `system-${Date.now()}`,
            type: 'system',
            title: data.title || 'Moderator Update',
            message: data.message || 'A new system update is available.',
            timestamp: data.timestamp || Date.now(),
            read: false,
            category: data.category,
            metadata: data.metadata || {}
          },
          ...prev
        ].slice(0, 30));
        return;
      }
      if (data.type !== 'new_message') return;
      if (silentRefreshTimeoutRef.current) {
        clearTimeout(silentRefreshTimeoutRef.current);
      }
      silentRefreshTimeoutRef.current = setTimeout(() => {
        fetchChatsData({ silent: true });
        fetchAllStats({ silent: true });
        fetchPaymentData({ silent: true });
      }, 150);
    });

    return () => {
      unregister();
      if (silentRefreshTimeoutRef.current) {
        clearTimeout(silentRefreshTimeoutRef.current);
        silentRefreshTimeoutRef.current = null;
      }
    };
  }, [addMessageHandler, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    setSystemNotifications(prev => {
      const existingIndex = prev.findIndex(notification => notification.category === 'payout_schedule');
      const formattedPayoutDate = nextPayoutDate
        ? new Date(nextPayoutDate).toLocaleDateString()
        : 'the 15th of this month';
      const approvedAmount = Number(approvedPayoutBalance || 0);
      const reminderTitle = approvedAmount > 0 ? 'Upcoming Monthly Payout' : 'Monthly Payout Schedule';
      const reminderMessage = approvedAmount > 0
        ? `You have $${approvedAmount.toFixed(2)} approved for payout on ${formattedPayoutDate}.${defaultPaymentMethod ? ` Default method: ${defaultPaymentMethod.type || 'saved method'}.` : ' Set a default payout method to avoid delays.'}`
        : 'Approved chats are paid on the 15th through your default payout method.';

      const nextNotification: ModeratorNotification = {
        id: `payout-schedule-${user.id}`,
        type: 'system',
        title: reminderTitle,
        message: reminderMessage,
        timestamp: Date.now(),
        read: existingIndex === -1 ? false : prev[existingIndex].read,
        category: 'payout_schedule',
        metadata: {
          nextPayoutDate,
          approvedPayoutBalance: approvedAmount,
          payoutMethod: defaultPaymentMethod?.type || null
        }
      };

      if (existingIndex === -1) {
        return [nextNotification, ...prev].slice(0, 30);
      }

      const updated = [...prev];
      updated[existingIndex] = nextNotification;
      return updated;
    });
  }, [user?.id, nextPayoutDate, approvedPayoutBalance, defaultPaymentMethod]);

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-chat-dropdown]')) {
        setShowChatDropdown(false);
      }
      if (!target.closest('[data-system-dropdown]')) {
        setShowSystemNotifications(false);
      }
    };

    if (showChatDropdown || showSystemNotifications) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showChatDropdown, showSystemNotifications]);

  const markAllSystemNotificationsRead = () => {
    setSystemNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
  };

  const markSystemNotificationRead = (notificationId: string) => {
    setSystemNotifications(prev => prev.map(notification => (
      notification.id === notificationId ? { ...notification, read: true } : notification
    )));
  };

  const getNotificationTone = (category?: string) => {
    switch (category) {
      case 'earning_approved':
        return {
          icon: 'fa-solid fa-circle-check',
          iconClass: 'text-blue-600 bg-blue-100',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
          label: 'Approved'
        };
      case 'earning_rejected':
        return {
          icon: 'fa-solid fa-circle-xmark',
          iconClass: 'text-red-600 bg-red-100',
          badgeClass: 'bg-red-50 text-red-700 border-red-200',
          label: 'Rejected'
        };
      case 'payout_processed':
        return {
          icon: 'fa-solid fa-money-check-dollar',
          iconClass: 'text-emerald-600 bg-emerald-100',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'Paid'
        };
      case 'payout_schedule':
        return {
          icon: 'fa-solid fa-calendar-days',
          iconClass: 'text-amber-600 bg-amber-100',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'Schedule'
        };
      default:
        return {
          icon: 'fa-solid fa-bell',
          iconClass: 'text-slate-600 bg-slate-100',
          badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
          label: 'Update'
        };
    }
  };

  const formatNotificationTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;

    return date.toLocaleString();
  };

  const fetchAllStats = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent && !hasLoadedStatsRef.current) {
        setStatsLoading(true);
      }
      // Fetch earnings
      const earnings = await apiClient.getSessionEarnings();
      const nextSessionEarnings = earnings.sessionEarnings || 0;
      const nextTotalEarnings = earnings.totalEarnings || 0;
      setSessionEarnings(prev => prev === nextSessionEarnings ? prev : nextSessionEarnings);
      setTotalEarnings(prev => prev === nextTotalEarnings ? prev : nextTotalEarnings);

      // Fetch moderated chats count
      const chats = await apiClient.getModeratedChats();
      const nextModeratedChatsCount = chats.moderatedChats?.length || 0;
      setModeratedChatsCount(prev => prev === nextModeratedChatsCount ? prev : nextModeratedChatsCount);

      // Fetch moderation stats
      try {
        const stats = await apiClient.get('/moderation/stats');
        if (stats.data) {
          setModerationStats(prev => areModerationStatsEqual(prev, stats.data) ? prev : stats.data);
        }
      } catch (statsError) {
        console.warn('Could not fetch moderation stats:', statsError);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      hasLoadedStatsRef.current = true;
      setStatsLoading(false);
    }
  };

  const fetchChatsData = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent && !hasLoadedChatsRef.current) {
        setLoadingChats(true);
      }
      setChatsError('');

      // Fetch replied chats first so we can filter them out ✅
      let repliedChatsData: ModeratorChat[] = [];
      try {
        const repliedRes = await apiClient.getRepliedChats();
        console.log('[DEBUG] Full replied response:', repliedRes);
        repliedChatsData = repliedRes.repliedChats || repliedRes.chats || [];
        setRepliedChats(prev => areChatCollectionsEqual(prev, repliedChatsData) ? prev : repliedChatsData);
        console.log('[DEBUG StandaloneModeratorDashboard] Replied chats:', repliedChatsData.length, repliedChatsData.map(c => c.id));
      } catch (err) {
        console.warn('Could not fetch replied chats:', err);
      }

      // Fetch unreplied chats
      const unrepliedRes = await apiClient.getUnrepliedChats();
      console.log('[DEBUG] Full unreplied response:', unrepliedRes);
      let allUnrepliedChats = unrepliedRes.unrepliedChats || unrepliedRes.chats || [];
      console.log('[DEBUG StandaloneModeratorDashboard] Raw unreplied chats count:', allUnrepliedChats.length);
      console.log('[DEBUG StandaloneModeratorDashboard] All unreplied from backend:', allUnrepliedChats.map((c: any) => ({ id: c.id, replyStatus: c.replyStatus, isReplied: c.isReplied })));
      
      // Get IDs and statuses of already-replied chats ✅
      const repliedChatIds = new Set(repliedChatsData.map(c => c.id));
      
      // Filter out any unreplied chats that are actually replied ✅
      allUnrepliedChats = allUnrepliedChats.filter(chat => {
        const isInRepliedSet = repliedChatIds.has(chat.id);
        const hasRepliedStatus = chat.replyStatus === 'replied' || (chat as any).isReplied === true;
        
        if (isInRepliedSet || hasRepliedStatus) {
          console.log('[DEBUG] Filtering out chat (already replied):', chat.id, { isInRepliedSet, hasRepliedStatus });
          return false;
        }
        return true;
      });

      // Fetch assigned chats (live chats from moderator center) ✅
      try {
        const assignedRes = await apiClient.getAssignedChats();
        console.log('[DEBUG] Full assigned response:', assignedRes);
        const assignedChatsData = assignedRes.assignedChats || [];
        console.log('[DEBUG StandaloneModeratorDashboard] Assigned chats from API:', assignedChatsData.length, assignedChatsData.map((c: any) => c.id));
        
        // Convert assigned chats to ModeratorChat format and filter out replied ones
        const convertedAssignedChats = assignedChatsData
          .filter((chat: any) => {
            const chatId = chat.id || chat._id;
            const isInRepliedSet = repliedChatIds.has(chatId);
            const hasRepliedStatus = chat.replyStatus === 'replied' || chat.isReplied === true;
            
            if (isInRepliedSet || hasRepliedStatus) {
              console.log('[DEBUG] Filtering out assigned chat (already replied):', chatId, { isInRepliedSet, hasRepliedStatus });
              return false;
            }
            return true;
          })
          .map((chat: any) => ({
            id: chat.id || chat._id,
            participants: chat.participants || [],
            messages: chat.messages || [],
            lastUpdated: chat.lastUpdated || new Date().getTime(),
            flaggedCount: chat.flaggedCount || 0,
            isAssigned: true,
            assignedModerator: chat.assignedModerator,
          }));
        
        console.log('[DEBUG] Converted assigned chats after filtering:', convertedAssignedChats.length, convertedAssignedChats.map(c => c.id));
        // Merge assigned chats with unreplied chats
        allUnrepliedChats = [...convertedAssignedChats, ...allUnrepliedChats];
      } catch (err) {
        console.warn('Could not fetch assigned chats:', err);
      }
      
      console.log('[DEBUG] Final unreplied chats count:', allUnrepliedChats.length, allUnrepliedChats.map(c => c.id));
      setUnrepliedChats(prev => areChatCollectionsEqual(prev, allUnrepliedChats) ? prev : allUnrepliedChats);
      setUnrepliedChatsCount(prev => prev === allUnrepliedChats.length ? prev : allUnrepliedChats.length);
    } catch (error) {
      console.error('Error fetching chats:', error);
      setChatsError(error instanceof Error ? error.message : 'Failed to fetch chats');
    } finally {
      hasLoadedChatsRef.current = true;
      setLoadingChats(false);
    }
  };

  const fetchPaymentData = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!user?.id) return;
    try {
      if (!silent && !hasLoadedPaymentsRef.current) {
        setPaymentLoading(true);
      }

      const [balanceData, earningsData, historyData] = await Promise.all([
        apiClient.getPaymentBalance(user.id),
        apiClient.getModeratorEarnings(user.id),
        apiClient.getPaymentHistory(user.id, 20, 0)
      ]);

      const earningsSummary = earningsData?.summary || {};
      const approvedAmount = Math.max(0, Number(((earningsSummary.totalApproved || 0) - (earningsSummary.totalPaid || 0)).toFixed(2)));
      const awaitingApprovalAmount = Number((earningsSummary.totalPending || 0).toFixed(2));
      const unpaidTotal = Number((approvedAmount + awaitingApprovalAmount).toFixed(2));

      setPaymentBalance(prev => prev === unpaidTotal ? prev : unpaidTotal);
      setApprovedPayoutBalance(prev => prev === approvedAmount ? prev : approvedAmount);
      setPendingApprovalBalance(prev => prev === awaitingApprovalAmount ? prev : awaitingApprovalAmount);
      setNextPayoutDate(prev => prev === (earningsSummary.nextPayoutDate || balanceData.nextPayoutDate || null) ? prev : (earningsSummary.nextPayoutDate || balanceData.nextPayoutDate || null));
      setDefaultPaymentMethod(prev => {
        const nextMethod = earningsSummary.defaultPaymentMethod || balanceData.defaultPaymentMethod || null;
        if ((prev?.id || null) === (nextMethod?.id || null) && (prev?.type || null) === (nextMethod?.type || null)) {
          return prev;
        }
        return nextMethod;
      });

      const nextPaymentHistory = historyData.payments || [];
      setPaymentHistory(prev => arePaymentEntriesEqual(prev, nextPaymentHistory) ? prev : nextPaymentHistory);
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      hasLoadedPaymentsRef.current = true;
      setPaymentLoading(false);
    }
  };

  const recordPaymentTransaction = async (methodId: string, description: string = 'Moderation earnings') => {
    if (!user?.id) return;
    try {
      const response = await apiClient.recordPayment(user.id, {
        amount: sessionEarnings,
        methodId: methodId,
        description: description,
      });
      
      // Refresh payment data
      await fetchPaymentData();
      return response;
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  };

  const handleProfileChange = (field: keyof User, value: any) => {
    setProfileChanges({
      ...profileChanges,
      [field]: value
    });
  };

  const handleSaveProfile = async () => {
    try {
      setUploadingProfile(true);
      setProfileError('');
      
      if (!user?.id) {
        setProfileError('User ID not found');
        return;
      }

      // Validate required fields
      if (!profileChanges.name && !profileData?.name) {
        setProfileError('Full name is required');
        setUploadingProfile(false);
        return;
      }

      // Make request to the new moderator profile endpoint
      const response = await apiClient.put('/moderation/moderator-profile', profileChanges);
      
      if (response.success) {
        setProfileData(response.user);
        setProfileSuccess('Profile updated successfully!');
        setIsEditingProfile(false);
        setProfileChanges({});
        setTimeout(() => setProfileSuccess(''), 4000);
      } else {
        setProfileError(response.error || 'Failed to update profile');
      }
    } catch (error: any) {
      setProfileError(error.message || 'Failed to update profile');
      console.error('Error updating profile:', error);
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleCancelProfile = () => {
    setIsEditingProfile(false);
    setProfileChanges({});
    setProfileError('');
  };

  const handleStartModeration = (chat: ModeratorChat) => {
    setSelectedChat(chat);
    setShowModerationView(true);
  };

  const handleMarkAsReplied = async (chatId: string) => {
    try {
      await apiClient.markChatAsReplied(chatId);
      // Refresh chats
      await fetchChatsData({ silent: true });
    } catch (error) {
      console.error('Error marking chat as replied:', error);
    }
  };

  // ✅ Handle when chat is replied - move it from unreplied to replied section
  const handleChatReplied = (repliedChat: ModeratorChat) => {
    const normalizedRepliedChat: ModeratorChat = {
      ...repliedChat,
      isReplied: true,
      replyStatus: 'replied',
      assignedModerator: repliedChat.assignedModerator || user?.id,
      repliedBy: repliedChat.repliedBy || user?.id,
      markedAsRepliedAt: repliedChat.markedAsRepliedAt || Date.now(),
      moderatorDetails: repliedChat.moderatorDetails || (user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
      } : null),
    };

    setUnrepliedChats(prev => prev.filter(chat => chat.id !== normalizedRepliedChat.id));
    setUnrepliedChatsCount(prev => Math.max(0, prev - 1));
    setRepliedChats(prev => {
      const withoutOld = prev.filter(chat => chat.id !== normalizedRepliedChat.id);
      return [normalizedRepliedChat, ...withoutOld].sort((a, b) =>
        (b.markedAsRepliedAt || b.lastUpdated || 0) - (a.markedAsRepliedAt || a.lastUpdated || 0)
      );
    });
  };

  const handleCloseModerationView = async () => {
    setShowModerationView(false);
    setSelectedChat(null);
    // Refresh stats after moderation
    await fetchAllStats({ silent: true });
    await fetchChatsData({ silent: true });
  };

  // Group replied chats by moderator ✅
  const groupRepliedChatsByModerator = () => {
    const groupedChats: { [key: string]: { moderatorName: string; chats: ModeratorChat[] } } = {};
    
    repliedChats.forEach((chat: any) => {
      const modId = chat.assignedModerator || 'unassigned';
      const modName = chat.moderatorDetails?.name || `Moderator ${modId.substring(0, 8)}`;
      
      if (!groupedChats[modId]) {
        groupedChats[modId] = {
          moderatorName: modName,
          chats: []
        };
      }
      groupedChats[modId].chats.push(chat);
    });
    
    return Object.entries(groupedChats)
      .sort((a, b) => b[1].chats.length - a[1].chats.length)
      .map(([modId, data]) => ({
        moderatorId: modId,
        moderatorName: data.moderatorName,
        chats: data.chats.sort((a: any, b: any) => {
          const timeA = a.markedAsRepliedAt || a.lastUpdated || 0;
          const timeB = b.markedAsRepliedAt || b.lastUpdated || 0;
          return timeB - timeA;
        })
      }));
  };

  if (showModerationView && user && selectedChat) {
    return (
      <ChatModerationView
        chat={selectedChat}
        currentUserId={user.id}
        onClose={handleCloseModerationView}
        onRefresh={fetchChatsData}
        onRepliedChatAdded={handleChatReplied}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 overflow-y-auto">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Moderation Portal</h1>
                <p className="text-xs text-gray-500">Standalone Moderator Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative" data-system-dropdown>
                <button
                  onClick={() => setShowSystemNotifications(!showSystemNotifications)}
                  className="relative flex items-center justify-center w-12 h-12 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all border border-slate-200 font-bold text-lg"
                  aria-label="Open system notifications"
                >
                  <i className="fa-solid fa-bell"></i>
                  {unreadSystemNotifications > 0 && (
                    <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 min-w-[1.4rem] h-6 px-1 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                      {unreadSystemNotifications > 99 ? '99+' : unreadSystemNotifications}
                    </span>
                  )}
                </button>

                {showSystemNotifications && (
                  <div className="absolute top-full mt-2 right-0 w-[26rem] bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden" data-system-dropdown>
                    <div className="p-4 border-b border-gray-200 bg-slate-50">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-gray-900">Notifications</h3>
                          <p className="text-xs text-gray-500">Approvals, rejections, payouts, and account updates.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full font-bold">
                            {systemNotifications.length}
                          </span>
                          <button
                            onClick={markAllSystemNotificationsRead}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700"
                          >
                            Mark all read
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="max-h-[28rem] overflow-y-auto">
                      {systemNotifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <i className="fa-regular fa-bell-slash text-3xl mb-3 text-gray-300"></i>
                          <p className="font-semibold text-gray-700">No notifications yet</p>
                          <p className="text-sm text-gray-500 mt-1">System updates will appear here automatically.</p>
                        </div>
                      ) : (
                        systemNotifications.map((notification) => {
                          const tone = getNotificationTone(notification.category);
                          return (
                            <button
                              key={notification.id}
                              onClick={() => markSystemNotificationRead(notification.id)}
                              className={`w-full text-left p-4 border-b border-gray-100 transition-colors ${
                                notification.read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${tone.iconClass}`}>
                                  <i className={tone.icon}></i>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="font-bold text-gray-900 text-sm">{notification.title}</p>
                                      <p className="text-xs text-gray-500 mt-1">{formatNotificationTime(notification.timestamp)}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {!notification.read && (
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                      )}
                                      <span className={`text-[11px] px-2 py-1 rounded-full border font-bold ${tone.badgeClass}`}>
                                        {tone.label}
                                      </span>
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-700 mt-2 leading-5">{notification.message}</p>
                                  {notification.metadata?.rejectionReason && (
                                    <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-2 py-1">
                                      Reason: {notification.metadata.rejectionReason}
                                    </p>
                                  )}
                                  {notification.metadata?.payoutMethod && (
                                    <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-1">
                                      Method: {notification.metadata.payoutMethod}
                                    </p>
                                  )}
                                  {notification.metadata?.scheduledPayoutDate && (
                                    <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1">
                                      Scheduled payout: {new Date(notification.metadata.scheduledPayoutDate).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* ✅ Chat Notification Badge */}
              <div className="relative" data-chat-dropdown>
                <button
                  onClick={() => setShowChatDropdown(!showChatDropdown)}
                  className="relative flex items-center justify-center w-12 h-12 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all border border-blue-200 font-bold text-lg"
                >
                  <i className="fa-solid fa-comments"></i>
                  {unrepliedChatsCount > 0 && (
                    <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">
                      {unrepliedChatsCount > 99 ? '99+' : unrepliedChatsCount}
                    </span>
                  )}
                </button>

                {/* ✅ Chat Dropdown Menu */}
                {showChatDropdown && (
                  <div className="absolute top-full mt-2 right-0 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50" data-chat-dropdown>
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-900">
                          Unreplied Chats
                          <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-bold">
                            {unrepliedChatsCount}
                          </span>
                        </h3>
                        <button
                          onClick={() => setShowChatDropdown(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <i className="fa-solid fa-times"></i>
                        </button>
                      </div>
                    </div>

                    {/* Chat List */}
                    <div className="max-h-96 overflow-y-auto">
                      {unrepliedChats.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                          <i className="fa-solid fa-inbox text-3xl mb-2 text-gray-300"></i>
                          <p className="text-sm">No unreplied chats</p>
                        </div>
                      ) : (
                        unrepliedChats.slice(0, 10).map((chat) => (
                          <button
                            key={chat.id}
                            onClick={() => {
                              handleStartModeration(chat);
                              setShowChatDropdown(false);
                            }}
                            className="w-full text-left p-3 border-b border-gray-100 hover:bg-blue-50 transition-all flex items-start gap-3"
                          >
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              chat.isAssigned ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
                            }`}></div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-gray-900 text-sm truncate">
                                Chat {chat.id.substring(0, 8)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {chat.participants?.length || 2} participants
                                {chat.isAssigned && <span className="ml-1 text-red-600 font-bold">• ASSIGNED</span>}
                              </p>
                              {chat.messages && chat.messages.length > 0 && (
                                <p className="text-xs text-gray-600 truncate mt-1">
                                  "{chat.messages[chat.messages.length - 1]?.text?.substring(0, 40)}..."
                                </p>
                              )}
                            </div>
                            {chat.flaggedCount > 0 && (
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold flex-shrink-0">
                                {chat.flaggedCount}
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    {unrepliedChats.length > 10 && (
                      <div className="p-3 border-t border-gray-200 text-center bg-gray-50">
                        <button
                          onClick={() => {
                            setActiveTab('moderation');
                            setShowChatDropdown(false);
                          }}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700"
                        >
                          View all {unrepliedChats.length} chats →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => {
                  // ✅ SECURE LOGOUT: Clear all tokens and redirect to moderator login
                  localStorage.removeItem('token');
                  localStorage.removeItem('moderatorToken');
                  sessionStorage.clear();
                  logout();
                  // Redirect to moderator login page
                  window.location.href = '/moderationTest.html';
                }}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors flex items-center gap-2 font-bold"
              >
                <i className="fa-solid fa-sign-out-alt"></i>
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs - Redesigned like Moderation Center */}
        <div className="flex gap-2 mb-8 bg-gray-100 p-1.5 rounded-xl border border-gray-200 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: 'fa-chart-line', color: 'blue' },
            { id: 'moderation', label: 'Moderation', icon: 'fa-comments', color: 'emerald' },
            { id: 'profile', label: 'Profile', icon: 'fa-user', color: 'purple' },
            { id: 'activity', label: 'Activity', icon: 'fa-history', color: 'amber' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-shrink-0 py-2.5 px-4 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? tab.color === 'blue'
                    ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700'
                    : tab.color === 'purple'
                    ? 'bg-purple-600 text-white shadow-lg hover:bg-purple-700'
                    : tab.color === 'emerald'
                    ? 'bg-emerald-600 text-white shadow-lg hover:bg-emerald-700'
                    : 'bg-amber-600 text-white shadow-lg hover:bg-amber-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <i className={`fa-solid ${tab.icon} mr-1.5`}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* User Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                  {profileData?.avatar ? (
                    <img src={profileData.avatar} alt={profileData.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <i className="fa-solid fa-user"></i>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-black text-gray-900">{profileData?.name}</h2>
                  <p className="text-lg text-gray-600">@{profileData?.username}</p>
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                    <i className="fa-solid fa-envelope"></i>
                    {profileData?.email}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <i className="fa-solid fa-badge"></i>
                    {profileData?.role} {accountType === 'STANDALONE' && '(Standalone Account)'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors flex items-center gap-2 font-bold"
                  >
                    <i className="fa-solid fa-edit"></i>
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-bold">Session Earnings</p>
                    <p className="text-3xl font-black text-blue-600 mt-1">${sessionEarnings.toFixed(2)}</p>
                  </div>
                  <i className="fa-solid fa-wallet text-blue-600 text-3xl opacity-20"></i>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-bold">Total Earnings</p>
                    <p className="text-3xl font-black text-green-600 mt-1">${totalEarnings.toFixed(2)}</p>
                  </div>
                  <i className="fa-solid fa-coins text-green-600 text-3xl opacity-20"></i>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-bold">Unreplied Chats</p>
                    <p className="text-3xl font-black text-purple-600 mt-1">{unrepliedChatsCount}</p>
                  </div>
                  <i className="fa-solid fa-inbox text-purple-600 text-3xl opacity-20"></i>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-bold">Moderated Total</p>
                    <p className="text-3xl font-black text-amber-600 mt-1">{moderatedChatsCount}</p>
                  </div>
                  <i className="fa-solid fa-check-circle text-amber-600 text-3xl opacity-20"></i>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('moderation')}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-inbox"></i>
                  </div>
                  <h3 className="font-bold text-gray-900">Unreplied Chats</h3>
                </div>
                <p className="text-sm text-gray-600">{unrepliedChatsCount} chats awaiting moderation</p>
              </button>

              <button
                onClick={() => setShowModeratedChatsModal(true)}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-history"></i>
                  </div>
                  <h3 className="font-bold text-gray-900">Moderated Chats</h3>
                </div>
                <p className="text-sm text-gray-600">View your past moderation work</p>
              </button>

              <button
                onClick={() => setShowPaymentModal(true)}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-credit-card"></i>
                  </div>
                  <h3 className="font-bold text-gray-900">Payment Methods</h3>
                </div>
                <p className="text-sm text-gray-600">Manage your payouts</p>
              </button>
            </div>

            {/* Awaiting Attention - Unreplied Chats */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <i className="fa-solid fa-inbox text-emerald-600"></i>
                  Awaiting Attention
                </h3>
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold">
                  {unrepliedChatsCount} chats
                </span>
              </div>

              {unrepliedChats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="fa-solid fa-check-circle text-3xl mb-2 text-emerald-300"></i>
                  <p className="font-semibold">All caught up!</p>
                  <p className="text-sm">No unreplied chats at the moment</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {unrepliedChats.slice(0, 6).map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => {
                        handleStartModeration(chat);
                      }}
                      className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg p-4 hover:shadow-md transition-all text-left hover:border-emerald-400 group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                          chat.isAssigned ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                        }`}></div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 text-sm truncate">
                            Chat {chat.id.substring(0, 8)}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {chat.participants?.length || 2} participants
                            {chat.isAssigned && <span className="ml-1 text-red-600 font-bold">• ASSIGNED</span>}
                          </p>
                          {chat.messages && chat.messages.length > 0 && (
                            <p className="text-xs text-gray-600 truncate mt-2 bg-white/50 px-2 py-1 rounded">
                              "{chat.messages[chat.messages.length - 1]?.text?.substring(0, 50)}..."
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(chat.lastUpdated).toLocaleString()}
                          </p>
                        </div>
                        {chat.flaggedCount > 0 && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold flex-shrink-0">
                            {chat.flaggedCount} flagged
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {unrepliedChats.length > 6 && (
                <button
                  onClick={() => setActiveTab('moderation')}
                  className="w-full mt-4 py-2 px-4 border border-emerald-300 text-emerald-600 font-bold rounded-lg hover:bg-emerald-50 transition-all"
                >
                  View all {unrepliedChats.length} unreplied chats →
                </button>
              )}
            </div>

            {/* Recently Completed - Replied Chats */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <i className="fa-solid fa-check-double text-blue-600"></i>
                  Recently Completed
                </h3>
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                  {repliedChats.length} total
                </span>
              </div>

              {repliedChats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="fa-solid fa-clipboard-list text-3xl mb-2 text-blue-300"></i>
                  <p className="font-semibold">No completed chats yet</p>
                  <p className="text-sm">Start moderating to build your history</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {repliedChats.slice(0, 6).map((chat) => (
                    <div
                      key={chat.id}
                      className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 rounded-full mt-2 flex-shrink-0 bg-blue-500"></div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 text-sm truncate">
                            Chat {chat.id.substring(0, 8)}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {chat.participants?.length || 2} participants
                          </p>
                          {chat.messages && chat.messages.length > 0 && (
                            <p className="text-xs text-gray-600 truncate mt-2 bg-white/50 px-2 py-1 rounded">
                              "{chat.messages[chat.messages.length - 1]?.text?.substring(0, 50)}..."
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(chat.lastUpdated).toLocaleString()}
                          </p>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                          <i className="fa-solid fa-check text-xs"></i>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {repliedChats.length > 6 && (
                <button
                  onClick={() => setShowModeratedChatsModal(true)}
                  className="w-full mt-4 py-2 px-4 border border-blue-300 text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-all"
                >
                  View all {repliedChats.length} completed chats →
                </button>
              )}
            </div>

            {/* Payment Balance & History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Payout Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-wallet text-green-600"></i>
                  Pending Payout
                </h3>
                <div>
                  <p className="text-5xl font-black text-green-600 mb-2">${paymentBalance.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Total unpaid earnings</p>
                  <div className="mt-3 space-y-1 text-xs text-gray-600">
                    <p>Approved for next payout: <span className="font-bold text-emerald-700">${approvedPayoutBalance.toFixed(2)}</span></p>
                    <p>Awaiting admin approval: <span className="font-bold text-amber-600">${pendingApprovalBalance.toFixed(2)}</span></p>
                    <p>Next payout date: <span className="font-bold text-gray-900">{nextPayoutDate ? new Date(nextPayoutDate).toLocaleDateString() : 'Every month on the 15th'}</span></p>
                    <p>Default method: <span className="font-bold text-gray-900">{defaultPaymentMethod?.name || 'Not set'}</span></p>
                  </div>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-credit-card"></i>
                    Manage Payment Methods
                  </button>
                </div>
              </div>

              {/* Payment History Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-history text-blue-600"></i>
                  Recent Payments
                </h3>
                {paymentHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <i className="fa-solid fa-inbox text-3xl mb-2 text-gray-300"></i>
                    <p>No payment history</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {paymentHistory.map((payment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200 hover:border-gray-300 transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                            <i className="fa-solid fa-arrow-down text-sm"></i>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-900 text-sm">{payment.description || 'Payment'}</p>
                            <p className="text-xs text-gray-600">{new Date(payment.date || payment.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className="font-bold text-green-600 flex-shrink-0 ml-2">${payment.amount?.toFixed(2) || '0.00'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            {profileSuccess && (
              <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-lg flex items-center gap-2 animate-in fade-in">
                <i className="fa-solid fa-check-circle"></i>
                <span>{profileSuccess}</span>
              </div>
            )}
            {profileError && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-2 animate-in fade-in">
                <i className="fa-solid fa-exclamation-circle"></i>
                <span>{profileError}</span>
              </div>
            )}

            {isEditingProfile ? (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Edit Profile</h3>
                    <p className="text-gray-600 text-sm mt-1">Update your personal and contact information</p>
                  </div>
                </div>

                {/* Personal Information Section */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-user text-blue-600"></i>
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={profileChanges.name || profileData?.name || ''}
                        onChange={(e) => handleProfileChange('name', e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Age</label>
                      <input
                        type="number"
                        min="18"
                        max="120"
                        value={profileChanges.age || profileData?.age || ''}
                        onChange={(e) => handleProfileChange('age', e.target.value ? parseInt(e.target.value) : '')}
                        placeholder="Enter your age"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-envelope text-purple-600"></i>
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={profileChanges.email || profileData?.email || ''}
                        onChange={(e) => handleProfileChange('email', e.target.value)}
                        placeholder="Enter your email address"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                      <p className="text-xs text-gray-600 mt-1">Your email address will be used for account recovery and notifications</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={profileChanges.phone || profileData?.phone || ''}
                        onChange={(e) => handleProfileChange('phone', e.target.value)}
                        placeholder="Enter your phone number"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Location & Bio Section */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-location-dot text-emerald-600"></i>
                    Location & Description
                  </h4>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Location</label>
                    <input
                      type="text"
                      value={profileChanges.location || profileData?.location || ''}
                      onChange={(e) => handleProfileChange('location', e.target.value)}
                      placeholder="City, Country"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Bio</label>
                    <textarea
                      value={profileChanges.bio || profileData?.bio || ''}
                      onChange={(e) => handleProfileChange('bio', e.target.value)}
                      placeholder="Write a short bio about yourself... (max 500 characters)"
                      maxLength={500}
                      rows={4}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      {(profileChanges.bio || profileData?.bio || '').length}/500 characters
                    </p>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSaveProfile}
                    disabled={uploadingProfile}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-2"
                  >
                    {uploadingProfile ? (
                      <>
                        <i className="fa-solid fa-spinner animate-spin"></i>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check"></i>
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelProfile}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-times"></i>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Profile Information</h3>
                    <p className="text-gray-600 text-sm mt-1">View and manage your profile details</p>
                  </div>
                </div>

                {/* Personal Information Display */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-user text-blue-600"></i>
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-700 font-semibold">Full Name</p>
                      <p className="text-lg text-gray-900 mt-2 font-medium">{profileData?.name || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 font-semibold">Age</p>
                      <p className="text-lg text-gray-900 mt-2 font-medium">{profileData?.age ? `${profileData.age} years old` : 'Not set'}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Information Display */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-envelope text-purple-600"></i>
                    Contact Information
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-700 font-semibold">Email Address</p>
                      <p className="text-lg text-gray-900 mt-2 font-medium break-all">{profileData?.email || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 font-semibold">Phone Number</p>
                      <p className="text-lg text-gray-900 mt-2 font-medium">{profileData?.phone || 'Not set'}</p>
                    </div>
                  </div>
                </div>

                {/* Location & Bio Display */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-location-dot text-emerald-600"></i>
                    Location & Bio
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-700 font-semibold">Location</p>
                      <p className="text-lg text-gray-900 mt-2 font-medium">{profileData?.location || 'Not set'}</p>
                    </div>
                    {profileData?.bio && (
                      <div>
                        <p className="text-sm text-gray-700 font-semibold">Bio</p>
                        <p className="text-gray-800 mt-2 leading-relaxed">{profileData.bio}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Account Information Display */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-shield text-amber-600"></i>
                    Account Information
                  </h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-700 font-semibold">Username</p>
                      <p className="text-lg text-gray-900 mt-2 font-medium">@{profileData?.username || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 font-semibold">Role</p>
                      <div className="mt-2">
                        <span className="inline-block px-4 py-1 bg-purple-100 border border-purple-300 text-purple-800 rounded-full text-sm font-bold">
                          {profileData?.role || 'Member'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/50"
                >
                  <i className="fa-solid fa-edit"></i>
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        )}

        {/* Moderation Tab */}
        {activeTab === 'moderation' && (
          <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                  <i className="fa-solid fa-comments"></i>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Chat Moderation</h3>
                  <p className="text-xs text-gray-500">{unrepliedChatsCount} chats awaiting response</p>
                </div>
              </div>
              <button
                onClick={() => fetchChatsData()}
                disabled={loadingChats}
                className="text-sm font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-emerald-50 transition-all border border-emerald-200"
              >
                <i className={`fa-solid fa-rotate-right ${loadingChats ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>
            </div>

            {chatsError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg flex items-center gap-2">
                <i className="fa-solid fa-exclamation-circle"></i>
                {chatsError}
              </div>
            )}

            {/* Unreplied & Assigned Chats Section */}
            {unrepliedChats.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-emerald-600">
                    {unrepliedChatsCount} Chat{unrepliedChatsCount !== 1 ? 's' : ''} Awaiting Response
                  </h4>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {unrepliedChats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`rounded-xl p-4 border transition-all ${
                        chat.isAssigned
                          ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200 hover:border-red-400'
                          : 'bg-white border-gray-200 hover:border-emerald-300'
                      } hover:shadow-md`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {chat.isAssigned && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
                                <i className="fa-solid fa-share-nodes mr-1"></i>
                                ASSIGNED
                              </span>
                            )}
                            <p className="font-bold text-gray-900">Chat ID: {chat.id.substring(0, 12)}</p>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            <i className="fa-solid fa-users mr-2"></i>
                            {chat.participants?.length || 2} participants
                            {chat.flaggedCount > 0 && (
                              <span className="ml-3 bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">
                                <i className="fa-solid fa-flag mr-1"></i>
                                {chat.flaggedCount} flagged
                              </span>
                            )}
                          </p>
                          {chat.messages && chat.messages.length > 0 && (
                            <p className="text-xs text-gray-500">
                              Latest: "{chat.messages[chat.messages.length - 1]?.text?.substring(0, 50)}..."
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleStartModeration(chat)}
                          className={`ml-4 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm flex-shrink-0 shadow-md hover:shadow-lg ${
                            chat.isAssigned
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          <i className="fa-solid fa-play mr-1"></i>
                          Moderate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {unrepliedChats.length === 0 ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-inbox text-5xl text-gray-300 mb-3"></i>
                <p className="text-gray-600 font-bold">No chats to moderate</p>
                <p className="text-sm text-gray-500">All chats are up to date!</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-600/30 flex items-center justify-center text-amber-300 shadow-lg">
                  <i className="fa-solid fa-history text-lg"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Activity Log</h3>
                  <p className="text-sm text-gray-400">Your recent moderation actions and activities</p>
                </div>
              </div>
              <button
                onClick={() => fetchAllStats()}
                disabled={statsLoading}
                className="text-sm font-semibold text-amber-300 hover:text-amber-200 disabled:opacity-50 flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 transition-all"
              >
                <i className={`fa-solid fa-rotate-right ${statsLoading ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>
            </div>

            {/* Moderation Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-6 border border-red-500 hover:border-red-400 transition-all shadow-lg hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-red-100 font-semibold">Warnings Issued</p>
                    <p className="text-4xl font-black text-white mt-2">{moderationStats.warningsIssued || 0}</p>
                  </div>
                  <div className="w-14 h-14 rounded-lg bg-white/20 flex items-center justify-center">
                    <i className="fa-solid fa-triangle-exclamation text-white text-2xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl p-6 border border-orange-500 hover:border-orange-400 transition-all shadow-lg hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-orange-100 font-semibold">Bans Issued</p>
                    <p className="text-4xl font-black text-white mt-2">{moderationStats.bansIssued || 0}</p>
                  </div>
                  <div className="w-14 h-14 rounded-lg bg-white/20 flex items-center justify-center">
                    <i className="fa-solid fa-ban text-white text-2xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 border border-indigo-500 hover:border-indigo-400 transition-all shadow-lg hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-indigo-100 font-semibold">Reports Submitted</p>
                    <p className="text-4xl font-black text-white mt-2">{moderationStats.totalReports || 0}</p>
                  </div>
                  <div className="w-14 h-14 rounded-lg bg-white/20 flex items-center justify-center">
                    <i className="fa-solid fa-flag text-white text-2xl"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Section - Grouped by Moderator */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <i className="fa-solid fa-list text-amber-300"></i>
                Moderated Chats by Moderator
              </h4>

              {repliedChats.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <i className="fa-solid fa-inbox text-3xl mb-2 text-white/20"></i>
                  <p>No moderation activity yet</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {groupRepliedChatsByModerator().map((group) => (
                    <div
                      key={group.moderatorId}
                      className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all"
                    >
                      {/* Moderator Header */}
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/10">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {group.moderatorName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm">{group.moderatorName}</p>
                          <p className="text-xs text-gray-400">{group.chats.length} chat{group.chats.length !== 1 ? 's' : ''} moderated</p>
                        </div>
                      </div>

                      {/* Chats List */}
                      <div className="space-y-2">
                        {group.chats.slice(0, 5).map((chat, index) => (
                          <div
                            key={`${group.moderatorId}-${index}`}
                            className="flex items-center justify-between p-2 bg-white/5 border border-white/5 rounded hover:border-amber-400/30 transition-all"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-6 h-6 rounded bg-amber-500/30 flex items-center justify-center text-amber-300 flex-shrink-0">
                                <i className="fa-solid fa-check text-xs"></i>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-gray-300">Chat {chat.id.substring(0, 8)}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(chat.lastUpdated).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            {chat.flaggedCount > 0 && (
                              <span className="text-xs bg-red-500/30 text-red-300 px-2 py-1 rounded border border-red-400/30 flex-shrink-0 ml-2">
                                <i className="fa-solid fa-flag mr-1"></i>
                                {chat.flaggedCount}
                              </span>
                            )}
                          </div>
                        ))}
                        {group.chats.length > 5 && (
                          <p className="text-xs text-gray-500 pt-2">+{group.chats.length - 5} more</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <PaymentMethodModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        moderatorId={user?.id || ''}
      />
      <ModeratedChatsModal
        isOpen={showModeratedChatsModal}
        onClose={() => setShowModeratedChatsModal(false)}
        moderatorId={user?.id || ''}
      />
    </div>
  );
};

export default StandaloneModeratorDashboard;
