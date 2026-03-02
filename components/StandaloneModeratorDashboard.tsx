import React, { useState, useEffect } from 'react';
import { useModerationAuth } from '../services/ModerationAuthContext';
import ChatModerationView, { ModeratorChat, Message } from './ChatModerationView';
import PaymentMethodModal from './PaymentMethodModal';
import ModeratedChatsModal from './ModeratedChatsModal';
import apiClient from '../services/apiClient';

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

const StandaloneModeratorDashboard: React.FC = () => {
  const { user, logout, accountType } = useModerationAuth();
  
  // UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'moderation' | 'activity'>('overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showModeratedChatsModal, setShowModeratedChatsModal] = useState(false);
  const [showModerationView, setShowModerationView] = useState(false);
  const [selectedChat, setSelectedChat] = useState<ModeratorChat | null>(null);
  
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

  useEffect(() => {
    if (user) {
      setProfileData(user);
    }
    fetchAllStats();
    if (user?.id) {
      fetchPaymentData();
      fetchChatsData();
    }
  }, [user]);

  const fetchAllStats = async () => {
    try {
      setStatsLoading(true);
      // Fetch earnings
      const earnings = await apiClient.getSessionEarnings();
      setSessionEarnings(earnings.sessionEarnings || 0);
      setTotalEarnings(earnings.totalEarnings || 0);

      // Fetch moderated chats count
      const chats = await apiClient.getModeratedChats();
      setModeratedChatsCount(chats.moderatedChats?.length || 0);

      // Fetch moderation stats
      try {
        const stats = await apiClient.get('/moderation/stats');
        if (stats.data) {
          setModerationStats(stats.data);
        }
      } catch (statsError) {
        console.warn('Could not fetch moderation stats:', statsError);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchChatsData = async () => {
    try {
      setLoadingChats(true);
      setChatsError('');

      // Fetch unreplied chats
      const unrepliedRes = await apiClient.getUnrepliedChats();
      setUnrepliedChats(unrepliedRes.chats || unrepliedRes || []);
      setUnrepliedChatsCount((unrepliedRes.chats || unrepliedRes || []).length);

      // Fetch replied chats
      try {
        const repliedRes = await apiClient.getRepliedChats();
        setRepliedChats(repliedRes.chats || repliedRes || []);
      } catch (err) {
        console.warn('Could not fetch replied chats:', err);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      setChatsError(error instanceof Error ? error.message : 'Failed to fetch chats');
    } finally {
      setLoadingChats(false);
    }
  };

  const fetchPaymentData = async () => {
    if (!user?.id) return;
    try {
      setPaymentLoading(true);
      
      // Fetch payment balance
      const balanceData = await apiClient.getPaymentBalance(user.id);
      setPaymentBalance(balanceData.balance || 0);

      // Fetch payment history
      const historyData = await apiClient.getPaymentHistory(user.id, 20, 0);
      setPaymentHistory(historyData.payments || []);
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
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
      await fetchChatsData();
    } catch (error) {
      console.error('Error marking chat as replied:', error);
    }
  };

  const handleCloseModerationView = async () => {
    setShowModerationView(false);
    setSelectedChat(null);
    // Refresh stats after moderation
    await fetchAllStats();
    await fetchChatsData();
  };

  if (showModerationView && user && selectedChat) {
    return (
      <ChatModerationView
        chat={selectedChat}
        currentUserId={user.id}
        onClose={handleCloseModerationView}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
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
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors flex items-center gap-2 font-bold"
            >
              <i className="fa-solid fa-sign-out-alt"></i>
              Logout
            </button>
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

            {/* Payment Balance & History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Payout Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-wallet text-green-600"></i>
                  Pending Payout
                </h3>
                {paymentLoading ? (
                  <div className="text-center py-4">
                    <i className="fa-solid fa-spinner animate-spin text-gray-400"></i>
                  </div>
                ) : (
                  <div>
                    <p className="text-5xl font-black text-green-600 mb-2">${paymentBalance.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Available for payout</p>
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-credit-card"></i>
                      Manage Payment Methods
                    </button>
                  </div>
                )}
              </div>

              {/* Payment History Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-history text-blue-600"></i>
                  Recent Payments
                </h3>
                {paymentLoading ? (
                  <div className="text-center py-4">
                    <i className="fa-solid fa-spinner animate-spin text-gray-400"></i>
                  </div>
                ) : paymentHistory.length === 0 ? (
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
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-8 border border-white/20">
            {profileSuccess && (
              <div className="mb-6 bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 p-4 rounded-lg flex items-center gap-2 animate-in fade-in">
                <i className="fa-solid fa-check-circle"></i>
                <span>{profileSuccess}</span>
              </div>
            )}
            {profileError && (
              <div className="mb-6 bg-red-500/20 border border-red-400/50 text-red-300 p-4 rounded-lg flex items-center gap-2 animate-in fade-in">
                <i className="fa-solid fa-exclamation-circle"></i>
                <span>{profileError}</span>
              </div>
            )}

            {isEditingProfile ? (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white">Edit Profile</h3>
                    <p className="text-gray-400 text-sm mt-1">Update your personal and contact information</p>
                  </div>
                </div>

                {/* Personal Information Section */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-user text-blue-300"></i>
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={profileChanges.name || profileData?.name || ''}
                        onChange={(e) => handleProfileChange('name', e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">Age</label>
                      <input
                        type="number"
                        min="18"
                        max="120"
                        value={profileChanges.age || profileData?.age || ''}
                        onChange={(e) => handleProfileChange('age', e.target.value ? parseInt(e.target.value) : '')}
                        placeholder="Enter your age"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-envelope text-purple-300"></i>
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">Email Address</label>
                      <input
                        type="email"
                        value={profileChanges.email || profileData?.email || ''}
                        onChange={(e) => handleProfileChange('email', e.target.value)}
                        placeholder="Enter your email address"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                      />
                      <p className="text-xs text-gray-400 mt-1">Your email address will be used for account recovery and notifications</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={profileChanges.phone || profileData?.phone || ''}
                        onChange={(e) => handleProfileChange('phone', e.target.value)}
                        placeholder="Enter your phone number"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Location & Bio Section */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-location-dot text-emerald-300"></i>
                    Location & Description
                  </h4>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-white mb-2">Location</label>
                    <input
                      type="text"
                      value={profileChanges.location || profileData?.location || ''}
                      onChange={(e) => handleProfileChange('location', e.target.value)}
                      placeholder="City, Country"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Bio</label>
                    <textarea
                      value={profileChanges.bio || profileData?.bio || ''}
                      onChange={(e) => handleProfileChange('bio', e.target.value)}
                      placeholder="Write a short bio about yourself... (max 500 characters)"
                      maxLength={500}
                      rows={4}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">
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
                    className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
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
                    <h3 className="text-2xl font-bold text-white">Profile Information</h3>
                    <p className="text-gray-400 text-sm mt-1">View and manage your profile details</p>
                  </div>
                </div>

                {/* Personal Information Display */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-user text-blue-300"></i>
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-400 font-semibold">Full Name</p>
                      <p className="text-lg text-white mt-2 font-medium">{profileData?.name || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 font-semibold">Age</p>
                      <p className="text-lg text-white mt-2 font-medium">{profileData?.age ? `${profileData.age} years old` : 'Not set'}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Information Display */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-envelope text-purple-300"></i>
                    Contact Information
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-400 font-semibold">Email Address</p>
                      <p className="text-lg text-white mt-2 font-medium break-all">{profileData?.email || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 font-semibold">Phone Number</p>
                      <p className="text-lg text-white mt-2 font-medium">{profileData?.phone || 'Not set'}</p>
                    </div>
                  </div>
                </div>

                {/* Location & Bio Display */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-location-dot text-emerald-300"></i>
                    Location & Bio
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-400 font-semibold">Location</p>
                      <p className="text-lg text-white mt-2 font-medium">{profileData?.location || 'Not set'}</p>
                    </div>
                    {profileData?.bio && (
                      <div>
                        <p className="text-sm text-gray-400 font-semibold">Bio</p>
                        <p className="text-gray-300 mt-2 leading-relaxed">{profileData.bio}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Account Information Display */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-shield text-amber-300"></i>
                    Account Information
                  </h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-400 font-semibold">Username</p>
                      <p className="text-lg text-white mt-2 font-medium">@{profileData?.username || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 font-semibold">Role</p>
                      <div className="mt-2">
                        <span className="inline-block px-4 py-1 bg-purple-500/30 border border-purple-400/50 text-purple-200 rounded-full text-sm font-bold">
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
                  <p className="text-xs text-gray-500">{unrepliedChatsCount} chats waiting for your response</p>
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

            {loadingChats ? (
              <div className="text-center py-12">
                <div className="inline-block">
                  <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-emerald-600 animate-spin"></div>
                </div>
                <p className="text-gray-500 mt-4">Loading chats...</p>
              </div>
            ) : unrepliedChats.length === 0 ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-inbox text-5xl text-gray-300 mb-3"></i>
                <p className="text-gray-600 font-bold">No unreplied chats</p>
                <p className="text-sm text-gray-500">All caught up! Check back soon for new chats to moderate.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {unrepliedChats.map((chat) => (
                  <div
                    key={chat.id}
                    className="bg-white rounded-xl p-6 border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <i className="fa-solid fa-comments text-sm"></i>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">Chat ID: {chat.id.substring(0, 12)}</p>
                            <p className="text-xs text-gray-500">{new Date(chat.lastUpdated).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
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
                          <div className="bg-gray-50 rounded-lg p-3 mb-3 max-h-20 overflow-y-auto">
                            <p className="text-xs text-gray-600">
                              <strong>Latest message:</strong> "{chat.messages[chat.messages.length - 1]?.text?.substring(0, 60)}..."
                            </p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleStartModeration(chat)}
                        className="ml-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-2 px-6 rounded-lg transition-all flex items-center gap-2 flex-shrink-0 shadow-lg hover:shadow-emerald-500/50"
                      >
                        <i className="fa-solid fa-play"></i>
                        Moderate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-2xl p-6 border border-red-400/30 hover:border-red-400/50 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-semibold">Warnings Issued</p>
                    <p className="text-3xl font-black text-red-300 mt-2">{moderationStats.warningsIssued || 0}</p>
                  </div>
                  <div className="w-14 h-14 rounded-lg bg-red-500/30 flex items-center justify-center">
                    <i className="fa-solid fa-triangle-exclamation text-red-300 text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-2xl p-6 border border-orange-400/30 hover:border-orange-400/50 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-semibold">Bans Issued</p>
                    <p className="text-3xl font-black text-orange-300 mt-2">{moderationStats.bansIssued || 0}</p>
                  </div>
                  <div className="w-14 h-14 rounded-lg bg-orange-500/30 flex items-center justify-center">
                    <i className="fa-solid fa-ban text-orange-300 text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 rounded-2xl p-6 border border-indigo-400/30 hover:border-indigo-400/50 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-semibold">Reports Submitted</p>
                    <p className="text-3xl font-black text-indigo-300 mt-2">{moderationStats.totalReports || 0}</p>
                  </div>
                  <div className="w-14 h-14 rounded-lg bg-indigo-500/30 flex items-center justify-center">
                    <i className="fa-solid fa-flag text-indigo-300 text-xl"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Section */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <i className="fa-solid fa-list text-amber-300"></i>
                Recent Moderated Chats
              </h4>

              {statsLoading ? (
                <div className="text-center py-8">
                  <i className="fa-solid fa-spinner animate-spin text-gray-400 text-2xl"></i>
                </div>
              ) : repliedChats.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <i className="fa-solid fa-inbox text-3xl mb-2 text-white/20"></i>
                  <p>No moderation activity yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {repliedChats.slice(0, 10).map((chat, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:border-amber-400/50 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/30 flex items-center justify-center text-amber-300 flex-shrink-0">
                          <i className="fa-solid fa-check text-xs"></i>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white text-sm">Chat {chat.id.substring(0, 8)}</p>
                          <p className="text-xs text-gray-400">{new Date(chat.lastUpdated).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {chat.flaggedCount > 0 && (
                          <span className="bg-red-500/30 text-red-300 px-2 py-1 rounded text-xs font-bold border border-red-400/50">
                            <i className="fa-solid fa-flag mr-1"></i>
                            {chat.flaggedCount}
                          </span>
                        )}
                        <span className="bg-emerald-500/30 text-emerald-300 px-2 py-1 rounded text-xs font-bold border border-emerald-400/50">
                          <i className="fa-solid fa-check-circle mr-1"></i>
                          Done
                        </span>
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
