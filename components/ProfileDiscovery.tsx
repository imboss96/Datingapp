import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface DiscoveryFilters {
  maxDistance: number;
  minAge: number;
  maxAge: number;
  interests: string[];
  verifiedOnly: boolean;
}

interface ProfileDiscoveryProps {
  currentUser: UserProfile;
  allProfiles: UserProfile[];
  blockedUsers: string[];
  onProfileSelect: (profile: UserProfile) => void;
}

const ProfileDiscovery: React.FC<ProfileDiscoveryProps> = ({
  currentUser,
  allProfiles,
  blockedUsers,
  onProfileSelect,
}) => {
  const [filters, setFilters] = useState<DiscoveryFilters>({
    maxDistance: 50,
    minAge: 18,
    maxAge: 65,
    interests: [],
    verifiedOnly: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filteredProfiles, setFilteredProfiles] = useState<UserProfile[]>([]);

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    let filtered = allProfiles.filter((profile) => {
      // Exclude current user and blocked users
      if (profile.id === currentUser.id || blockedUsers.includes(profile.id)) {
        return false;
      }

      // Age filter
      if (profile.age < filters.minAge || profile.age > filters.maxAge) {
        return false;
      }

      // Distance filter
      if (currentUser.coordinates && profile.coordinates) {
        const distance = calculateDistance(
          currentUser.coordinates.latitude,
          currentUser.coordinates.longitude,
          profile.coordinates.latitude,
          profile.coordinates.longitude
        );
        if (distance > filters.maxDistance) {
          return false;
        }
      }

      // Interests filter
      if (filters.interests.length > 0) {
        const hasMatchingInterest = filters.interests.some((interest) =>
          profile.interests.includes(interest)
        );
        if (!hasMatchingInterest) {
          return false;
        }
      }

      // Verification filter
      if (filters.verifiedOnly && profile.verification.status !== 'VERIFIED') {
        return false;
      }

      return true;
    });

    setFilteredProfiles(filtered);
  }, [filters, allProfiles, currentUser, blockedUsers]);

  const availableInterests = Array.from(
    new Set(allProfiles.flatMap((p) => p.interests))
  ).slice(0, 20);

  return (
    <div className="space-y-4">
      {/* Filter Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:shadow-lg transition"
      >
        <i className="fa-solid fa-sliders"></i>
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-md space-y-4">
          {/* Distance Filter */}
          <div>
            <label className="flex items-center justify-between text-sm font-bold text-gray-700 mb-2">
              <span>
                <i className="fa-solid fa-location-crosshairs text-blue-500 mr-2"></i>
                Distance
              </span>
              <span className="text-blue-500">{filters.maxDistance} mi</span>
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={filters.maxDistance}
              onChange={(e) => setFilters({ ...filters, maxDistance: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Age Range Filter */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">
              <i className="fa-solid fa-birthday-cake text-pink-500 mr-2"></i>
              Age Range
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="18"
                max="99"
                value={filters.minAge}
                onChange={(e) => setFilters({ ...filters, minAge: parseInt(e.target.value) })}
                className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-sm"
              />
              <span>to</span>
              <input
                type="number"
                min="18"
                max="99"
                value={filters.maxAge}
                onChange={(e) => setFilters({ ...filters, maxAge: parseInt(e.target.value) })}
                className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Interests Filter */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">
              <i className="fa-solid fa-heart text-red-500 mr-2"></i>
              Interests
            </label>
            <div className="flex flex-wrap gap-2">
              {availableInterests.map((interest) => (
                <button
                  key={interest}
                  onClick={() => {
                    setFilters({
                      ...filters,
                      interests: filters.interests.includes(interest)
                        ? filters.interests.filter((i) => i !== interest)
                        : [...filters.interests, interest],
                    });
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                    filters.interests.includes(interest)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Verification Filter */}
          <div className="flex items-center gap-3 py-2 border-t pt-4">
            <input
              type="checkbox"
              id="verified-only"
              checked={filters.verifiedOnly}
              onChange={(e) => setFilters({ ...filters, verifiedOnly: e.target.checked })}
              className="w-4 h-4 cursor-pointer"
            />
            <label htmlFor="verified-only" className="text-sm font-bold text-gray-700 cursor-pointer flex items-center gap-2">
              <i className="fa-solid fa-shield-check text-emerald-500"></i>
              Verified Members Only
            </label>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="text-center text-sm text-gray-500 font-bold">
        {filteredProfiles.length} profile{filteredProfiles.length !== 1 ? 's' : ''} found
      </div>

      {/* Filtered Profiles Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredProfiles.slice(0, 12).map((profile) => (
          <div
            key={profile.id}
            onClick={() => onProfileSelect(profile)}
            className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition cursor-pointer"
          >
            <div className="relative h-32 bg-gray-200 overflow-hidden">
              <img
                src={profile.images[0] || 'https://via.placeholder.com/200x300?text=No+Photo'}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
              {profile.verification.status === 'VERIFIED' && (
                <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1">
                  <i className="fa-solid fa-check text-xs"></i>
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-bold text-sm text-gray-900 truncate">
                {profile.name}, {profile.age}
              </h3>
              <p className="text-xs text-gray-500 truncate mb-2">
                <i className="fa-solid fa-location-dot mr-1"></i>
                {profile.location}
              </p>
              <div className="flex flex-wrap gap-1">
                {profile.interests.slice(0, 2).map((interest) => (
                  <span
                    key={interest}
                    className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProfiles.length === 0 && (
        <div className="text-center py-12">
          <i className="fa-solid fa-magnifying-glass text-4xl text-gray-200 mb-3"></i>
          <p className="text-gray-400 font-bold">No profiles match your filters</p>
          <button
            onClick={() =>
              setFilters({
                maxDistance: 50,
                minAge: 18,
                maxAge: 65,
                interests: [],
                verifiedOnly: false,
              })
            }
            className="mt-3 text-blue-500 font-bold text-sm hover:underline"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileDiscovery;
