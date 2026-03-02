import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { UserProfile } from '../types';

interface FeaturedMembersPageProps {
  currentUser?: UserProfile | null;
  isModal?: boolean;
  onClose?: () => void;
  filterType?: 'top' | 'new' | 'online';
  onOpenLoginModal?: () => void;
}

interface Member {
  id: string;
  _id?: string;
  name: string;
  age: number;
  location: string;
  images: string[];
  profilePicture?: string;
  interests?: string[];
  isPremium?: boolean;
  verification?: {
    status: 'VERIFIED' | 'PENDING' | 'REJECTED' | 'UNVERIFIED';
    verifiedAt?: number;
  };
  createdAt?: string;
  lastActiveAt?: string;
  bio?: string;
  trustScore?: number;
}

const FeaturedMembersPage: React.FC<FeaturedMembersPageProps> = ({ 
  currentUser = null,
  isModal = false, 
  onClose,
  filterType = 'top',
  onOpenLoginModal
}) => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'top' | 'new' | 'online'>(filterType);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated
  const isAuthenticated = !!(currentUser?.id);

  // Show login/signup prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className={`${isModal ? 'h-96 w-full flex flex-col' : 'min-h-screen'} bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4`}>
        <div className="max-w-md text-center">
          <h2 className="text-3xl font-bold text-white mb-4">👤 Sign In Required</h2>
          <p className="text-gray-300 mb-6">
            You need to be logged in to view featured members and discover potential matches.
          </p>
          <p className="text-gray-400 text-sm mb-8">
            This information is only available to authenticated members to protect privacy and ensure safety.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                if (onOpenLoginModal) {
                  onOpenLoginModal();
                } else {
                  navigate('/login');
                }
                if (isModal && onClose) onClose();
              }}
              className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
            >
              Log In or Sign Up
            </button>
            <button
              onClick={() => {
                if (isModal && onClose) onClose();
              }}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all"
            >
              {isModal ? 'Close' : 'Back'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchMembers();
  }, [activeTab]);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch users based on active tab
      const response = await apiClient.get('/users?limit=12&skip=0');
      let filteredMembers = response.data || response || [];

      if (Array.isArray(filteredMembers)) {
        // Filter based on tab
        if (activeTab === 'new') {
          // Sort by newest (createdAt descending)
          filteredMembers = filteredMembers.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
        } else if (activeTab === 'online') {
          // Filter by recently active (lastActiveAt)
          filteredMembers = filteredMembers.filter(m => {
            if (!m.lastActiveAt) return false;
            const lastActive = new Date(m.lastActiveAt).getTime();
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
            return lastActive > fiveMinutesAgo;
          });
          // Sort by most recently active
          filteredMembers = filteredMembers.sort((a, b) => {
            const dateA = new Date(a.lastActiveAt || 0).getTime();
            const dateB = new Date(b.lastActiveAt || 0).getTime();
            return dateB - dateA;
          });
        } else {
          // Top members: sort by verification status, then trustScore, then premium
          filteredMembers = filteredMembers.sort((a, b) => {
            const aVerified = a.verification?.status === 'VERIFIED' ? 1 : 0;
            const bVerified = b.verification?.status === 'VERIFIED' ? 1 : 0;
            if (aVerified !== bVerified) return bVerified - aVerified;

            const aPremium = a.isPremium ? 1 : 0;
            const bPremium = b.isPremium ? 1 : 0;
            if (aPremium !== bPremium) return bPremium - aPremium;

            const aTrust = a.trustScore || 0;
            const bTrust = b.trustScore || 0;
            return bTrust - aTrust;
          });
        }

        setMembers(filteredMembers.slice(0, 12));
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
      setError('Unable to load members. Please try again later.');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (isModal && onClose) {
      onClose();
    } else if (!isModal) {
      navigate(-1);
    }
  };

  const getTabDescription = () => {
    switch (activeTab) {
      case 'new':
        return 'Meet the newest members who just joined LunesaLove';
      case 'online':
        return 'Connect with members who are online right now';
      default:
        return 'Our most active and trusted members';
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'new':
        return '⭐ New Members';
      case 'online':
        return '🟢 Online Now';
      default:
        return '👑 Top Members';
    }
  };

  return (
    <div className="w-full bg-white overflow-y-auto flex flex-col" style={{ height: isModal ? '600px' : '100vh' }}>
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-red-500 text-white p-6 shadow-md z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{getTabTitle()}</h1>
            <p className="text-pink-100 text-sm mt-1">{getTabDescription()}</p>
          </div>
          {isModal && (
            <button
              onClick={handleClose}
              className="text-white text-2xl hover:text-pink-200 transition"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-16">
        <div className="max-w-6xl mx-auto px-6 flex gap-1">
          {(['top', 'new', 'online'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 font-semibold border-b-2 transition ${
                activeTab === tab
                  ? 'border-red-500 text-red-500'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'top' ? '👑 Top' : tab === 'new' ? '⭐ New' : '🟢 Online'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin">
                <i className="fas fa-spinner text-4xl text-red-500"></i>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-700">
              <i className="fas fa-exclamation-circle text-2xl mb-2"></i>
              <p>{error}</p>
              <button
                onClick={fetchMembers}
                className="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Try Again
              </button>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <i className="fas fa-users text-4xl mb-4 opacity-30"></i>
              <p className="text-lg">No members found in this category</p>
              <p className="text-sm mt-2">Check back later!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {members.map((member) => (
                <div
                  key={member.id || member._id}
                  className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition cursor-pointer"
                >
                  {/* Image */}
                  <div className="relative h-64 bg-gray-300 overflow-hidden">
                    <img
                      src={member.images?.[0] || member.profilePicture || 'https://via.placeholder.com/300x400?text=No+Photo'}
                      alt={member.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />

                    {/* Badges */}
                    <div className="absolute top-3 right-3 flex gap-2">
                      {member.verification?.status === 'VERIFIED' && (
                        <div className="bg-emerald-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <i className="fas fa-check-circle"></i>
                          Verified
                        </div>
                      )}
                      {member.isPremium && (
                        <div className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <i className="fas fa-crown"></i>
                          Premium
                        </div>
                      )}
                    </div>

                    {/* Online Status */}
                    {activeTab === 'online' && (
                      <div className="absolute bottom-3 left-3 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <span className="h-2 w-2 bg-white rounded-full animate-pulse"></span>
                        Online
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {member.name}, {member.age}
                      </h3>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <i className="fas fa-map-marker-alt text-red-500"></i>
                        {member.location}
                      </p>
                    </div>

                    {member.bio && (
                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                        {member.bio}
                      </p>
                    )}

                    {member.interests && member.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {member.interests.slice(0, 3).map((interest, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full"
                          >
                            {interest}
                          </span>
                        ))}
                        {member.interests.length > 3 && (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                            +{member.interests.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {activeTab === 'new' && member.createdAt && (
                      <p className="text-xs text-gray-500">
                        <i className="fas fa-clock mr-1"></i>
                        Joined {getTimeAgo(new Date(member.createdAt))}
                      </p>
                    )}

                    <button className="w-full mt-3 bg-gradient-to-r from-pink-500 to-red-500 text-white py-2 rounded-lg font-semibold hover:from-pink-600 hover:to-red-600 transition">
                      <i className="fas fa-heart mr-2"></i>
                      View Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {isModal && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-6xl mx-auto">
            <button
              onClick={handleClose}
              className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold hover:from-pink-600 hover:to-red-600 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to format time ago
const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

export default FeaturedMembersPage;
