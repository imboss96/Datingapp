import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import apiClient from '../services/apiClient';
import { formatLastSeen } from '../services/lastSeenUtils';
import displayName from '../src/utils/formatName';

interface Match {
  id: string;
  user: UserProfile;
  matchScore: number;
  matchedAt: string;
  messageCount: number;
}

interface MatchesListProps {
  currentUser: UserProfile;
  onSelectMatch: (match: Match) => void;
}

const MatchesList: React.FC<MatchesListProps> = ({ currentUser, onSelectMatch }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'score'>('recent');

  useEffect(() => {
    fetchMatches();
  }, [currentUser.id]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch user's matches from backend
      const response = await apiClient.get(`/users/${currentUser.id}/matches`);
      setMatches(response.data || []);
    } catch (err: any) {
      console.error('[ERROR MatchesList] Failed to fetch matches:', err);
      setError(err.message || 'Failed to load matches');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const sortedMatches = [...matches].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime();
    } else {
      return b.matchScore - a.matchScore;
    }
  });

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your matches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <i className="fa-solid fa-exclamation-circle text-4xl text-red-500 mb-4"></i>
          <p className="text-gray-700 font-semibold mb-4">{error}</p>
          <button
            onClick={fetchMatches}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <i className="fa-solid fa-heart-broken text-5xl text-gray-300 mb-4"></i>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Matches Yet</h2>
          <p className="text-gray-500 mb-6">Start swiping to find your perfect match!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <i className="fa-solid fa-heart text-red-500"></i>
            Your Matches ({matches.length})
          </h2>
        </div>
        
        {/* Sort Options */}
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('recent')}
            className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${
              sortBy === 'recent'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Most Recent
          </button>
          <button
            onClick={() => setSortBy('score')}
            className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${
              sortBy === 'score'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Best Match
          </button>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedMatches.map((match) => (
            <div
              key={match.id}
              onClick={() => onSelectMatch(match)}
              className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer transform hover:scale-105 active:scale-95"
            >
              {/* Profile Image */}
              <div className="relative h-64 bg-gray-200 overflow-hidden">
                <img
                  src={match.user.profilePicture || match.user.images[0]}
                  alt={match.user.name}
                  className="w-full h-full object-cover"
                />
                
                {/* Online Status Indicator */}
                <div className="absolute top-4 left-4">
                  <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full ${
                    match.user.isOnline ? 'bg-emerald-500' : 'bg-gray-500'
                  } text-white text-[10px] font-bold uppercase shadow-lg`}>
                    <span className={`w-2 h-2 rounded-full ${match.user.isOnline ? 'bg-white animate-pulse' : 'bg-gray-300'}`}></span>
                    {match.user.isOnline ? 'Active Now' : 'Offline'}
                  </div>
                </div>
                
                {/* Match Score Badge */}
                <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1 font-bold shadow-lg">
                  <i className="fa-solid fa-heart text-sm"></i>
                  {match.matchScore}%
                </div>

                {/* Matched Date */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-white text-xs font-medium">Matched {timeAgo(match.matchedAt)}</p>
                </div>
              </div>

              {/* Profile Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800">
                      {displayName(match.user)}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <i className="fa-solid fa-map-pin text-red-500 text-xs"></i>
                      {match.user.location}
                    </p>
                    <p className={`text-xs font-semibold mt-1 ${match.user.isOnline ? 'text-emerald-600' : 'text-gray-600'}`}>
                      {formatLastSeen(match.user.lastSeen, !!match.user.isOnline)}
                    </p>
                  </div>
                </div>

                {/* Bio Preview */}
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {match.user.bio || 'No bio yet'}
                </p>

                {/* Common Interests */}
                {currentUser.interests && match.user.interests && (
                  <div className="mb-3">
                    {(() => {
                      const commonInterests = match.user.interests.filter(interest =>
                        currentUser.interests.includes(interest)
                      );
                      if (commonInterests.length > 0) {
                        return (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {commonInterests.slice(0, 3).map((interest) => (
                              <span
                                key={interest}
                                className="px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs font-semibold"
                              >
                                {interest}
                              </span>
                            ))}
                            {commonInterests.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                                +{commonInterests.length - 3}
                              </span>
                            )}
                          </div>
                        );
                      }
                    })()}
                  </div>
                )}

                {/* Message Count / Action */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <i className="fa-solid fa-message"></i>
                    {match.messageCount} message{match.messageCount !== 1 ? 's' : ''}
                  </span>
                  <button className="px-4 py-2 bg-red-500 text-white rounded-full font-semibold text-xs hover:bg-red-600 transition-colors flex items-center gap-1">
                    <i className="fa-solid fa-arrow-right text-xs"></i>
                    Chat
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MatchesList;
