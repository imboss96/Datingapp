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
  interests?: string[];
  images?: string[];
  accountType: 'APP' | 'STANDALONE';
  coins?: number;
}

const StandaloneModeratorDashboard: React.FC = () => {
  const { user, logout, accountType } = useModerationAuth();
  
  // UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'moderation'>('overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showModeratedChatsModal, setShowModeratedChatsModal] = useState(false);
  const [showModerationView, setShowModerationView] = useState(false);
  
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

  useEffect(() => {
    if (user) {
      setProfileData(user);
    }
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      const earnings = await apiClient.getSessionEarnings();
      setSessionEarnings(earnings.sessionEarnings || 0);
      setTotalEarnings(earnings.totalEarnings || 0);

      const chats = await apiClient.getModeratedChats();
      setModeratedChatsCount(chats.moderatedChats?.length || 0);
    } catch (error) {
      console.error('Error fetching stats:', error);
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

      const response = await apiClient.put(`/users/${user.id}`, profileChanges);
      
      setProfileData(response);
      setProfileSuccess('Profile updated successfully!');
      setIsEditingProfile(false);
      setProfileChanges({});
      setTimeout(() => setProfileSuccess(''), 3000);
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

  // Mock chat data for moderation view
  const mockChat: ModeratorChat = {
    id: 'mock-chat-001',
    participants: ['user-1', 'user-2'],
    messages: [
      {
        id: '1',
        senderId: 'user-1',
        text: 'Hello, how are you?',
        timestamp: Date.now() - 60000,
        isFlagged: false
      },
      {
        id: '2',
        senderId: 'user-2',
        text: 'I am doing great! How about you?',
        timestamp: Date.now() - 50000,
        isFlagged: false
      }
    ],
    lastUpdated: Date.now(),
    flaggedCount: 0
  };

  if (showModerationView && user) {
    return (
      <ChatModerationView
        chat={mockChat}
        currentUserId={user.id}
        onClose={() => setShowModerationView(false)}
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
              <h1 className="text-2xl font-black text-gray-900">Moderation Portal</h1>
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
        {/* Tabs */}
        <div className="mb-8 flex gap-4 border-b border-gray-200 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: 'fa-chart-line' },
            { id: 'profile', label: 'Profile', icon: 'fa-user' },
            { id: 'moderation', label: 'Moderation', icon: 'fa-comments' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <i className={`fa-solid ${tab.icon}`}></i>
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
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-bold">Session Earnings</p>
                    <p className="text-3xl font-black text-blue-600 mt-1">${sessionEarnings.toFixed(2)}</p>
                  </div>
                  <i className="fa-solid fa-wallet text-blue-600 text-3xl opacity-20"></i>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-bold">Total Earnings</p>
                    <p className="text-3xl font-black text-green-600 mt-1">${totalEarnings.toFixed(2)}</p>
                  </div>
                  <i className="fa-solid fa-coins text-green-600 text-3xl opacity-20"></i>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-bold">Moderated Chats</p>
                    <p className="text-3xl font-black text-purple-600 mt-1">{moderatedChatsCount}</p>
                  </div>
                  <i className="fa-solid fa-comments text-purple-600 text-3xl opacity-20"></i>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-bold">Account Type</p>
                    <p className="text-xl font-black text-amber-600 mt-1">
                      {accountType === 'STANDALONE' ? 'Standalone' : 'App User'}
                    </p>
                  </div>
                  <i className={`fa-solid ${accountType === 'STANDALONE' ? 'fa-lock' : 'fa-mobile'} text-amber-600 text-3xl opacity-20`}></i>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setShowModerationView(true)}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-play"></i>
                  </div>
                  <h3 className="font-bold text-gray-900">Launch Moderation</h3>
                </div>
                <p className="text-sm text-gray-600">Start moderating chat messages</p>
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
                <p className="text-sm text-gray-600">View chats you've replied to</p>
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
                <p className="text-sm text-gray-600">Manage payment information</p>
              </button>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            {profileSuccess && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-600 p-4 rounded-lg flex items-center gap-2">
                <i className="fa-solid fa-check-circle"></i>
                {profileSuccess}
              </div>
            )}
            {profileError && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg flex items-center gap-2">
                <i className="fa-solid fa-exclamation-circle"></i>
                {profileError}
              </div>
            )}

            {isEditingProfile ? (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">Edit Profile</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={profileChanges.name || profileData?.name || ''}
                      onChange={(e) => handleProfileChange('name', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Username</label>
                    <input
                      type="text"
                      value={profileChanges.username || profileData?.username || ''}
                      onChange={(e) => handleProfileChange('username', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Age</label>
                    <input
                      type="number"
                      value={profileChanges.age || profileData?.age || ''}
                      onChange={(e) => handleProfileChange('age', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      value={profileChanges.location || profileData?.location || ''}
                      onChange={(e) => handleProfileChange('location', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Bio</label>
                  <textarea
                    value={profileChanges.bio || profileData?.bio || ''}
                    onChange={(e) => handleProfileChange('bio', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleSaveProfile}
                    disabled={uploadingProfile}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
                  >
                    {uploadingProfile ? (
                      <>
                        <i className="fa-solid fa-spinner animate-spin mr-2"></i>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-save mr-2"></i>
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelProfile}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-3 px-6 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 font-bold">Full Name</p>
                    <p className="text-lg text-gray-900 mt-1">{profileData?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-bold">Username</p>
                    <p className="text-lg text-gray-900 mt-1">@{profileData?.username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-bold">Email</p>
                    <p className="text-lg text-gray-900 mt-1">{profileData?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-bold">Age</p>
                    <p className="text-lg text-gray-900 mt-1">{profileData?.age || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-bold">Location</p>
                    <p className="text-lg text-gray-900 mt-1">{profileData?.location || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-bold">Role</p>
                    <p className="text-lg text-gray-900 mt-1">{profileData?.role}</p>
                  </div>
                </div>
                {profileData?.bio && (
                  <div>
                    <p className="text-sm text-gray-600 font-bold">Bio</p>
                    <p className="text-gray-900 mt-1">{profileData.bio}</p>
                  </div>
                )}
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setShowModerationView(true)}
                className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl p-8 transition-all transform hover:scale-105 shadow-lg flex flex-col items-center gap-4"
              >
                <i className="fa-solid fa-play text-5xl"></i>
                <h3 className="text-2xl font-black">Launch Moderation View</h3>
                <p className="text-sm opacity-90">Start moderating chats and earned money</p>
              </button>

              <button
                onClick={() => setShowModeratedChatsModal(true)}
                className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl p-8 transition-all transform hover:scale-105 shadow-lg flex flex-col items-center gap-4"
              >
                <i className="fa-solid fa-history text-5xl"></i>
                <h3 className="text-2xl font-black">View Moderated Chats</h3>
                <p className="text-sm opacity-90">See {moderatedChatsCount} chats you've worked on</p>
              </button>
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
