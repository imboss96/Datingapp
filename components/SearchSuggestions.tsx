/**
 * Search Suggestions Component - Displays search results in list format
 * Used in SwiperScreen for finding profiles by username or name
 */

import React from 'react';
import { UserProfile } from '../types';

interface SearchSuggestionsProps {
  query: string;
  results: UserProfile[]; // Pre-filtered search results from database
  onSelectProfile: (profile: UserProfile) => void;
  onClose: () => void;
  isOpen: boolean;
  loading?: boolean; // Loading state for search
}

const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  query,
  results,
  onSelectProfile,
  onClose,
  isOpen,
  loading = false,
}) => {
  if (!isOpen || !query.trim()) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Search Results Modal */}
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-auto">
        <div className="bg-white rounded-t-3xl md:rounded-3xl w-full md:w-full md:max-w-md max-h-[80vh] md:max-h-[75vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-center">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Search Results</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {loading ? 'Searching...' : `${results.length} profile${results.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Close search"
            >
              <i className="fa-solid fa-xmark text-gray-600" />
            </button>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-8 h-full text-center">
                <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-gray-600 font-medium">Searching...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 h-full text-center">
                <i className="fa-solid fa-magnifying-glass text-4xl text-gray-300 mb-3" />
                <p className="text-gray-600 font-medium">No profiles found</p>
                <p className="text-sm text-gray-500 mt-1">
                  Try searching with a different username or name
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {results.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => {
                      onSelectProfile(profile);
                      onClose();
                    }}
                    className="w-full p-4 hover:bg-gray-50 transition-colors text-left active:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      {/* Profile Image */}
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden flex-shrink-0 border border-gray-200">
                        {profile.images && profile.images[0] ? (
                          <img
                            src={profile.images[0]}
                            alt={profile.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <i className="fa-solid fa-user text-gray-400 text-xl" />
                          </div>
                        )}
                      </div>

                      {/* Profile Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 truncate">
                            {profile.username || profile.name}
                          </h3>
                          {profile.isPremium && (
                            <span className="premium-gradient px-2 py-0.5 rounded text-[10px] font-black text-white flex-shrink-0">
                              PREMIUM
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                          <span className="font-semibold">
                            {profile.name}, {profile.age}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <i className="fa-solid fa-location-dot text-red-500" />
                          <span className="truncate">{profile.location}</span>
                        </div>
                        {profile.bio && (
                          <p className="text-xs text-gray-600 mt-1 truncate">
                            {profile.bio}
                          </p>
                        )}
                      </div>

                      {/* Arrow Indicator */}
                      <div className="flex-shrink-0 text-gray-400">
                        <i className="fa-solid fa-chevron-right" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer with hint */}
          {results.length > 0 && (
            <div className="border-t border-gray-100 p-3 bg-gray-50 text-center text-xs text-gray-500 rounded-b-3xl">
              Click on a profile to view and swipe
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SearchSuggestions;
