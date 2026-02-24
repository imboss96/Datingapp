import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import ProfileDiscovery from './ProfileDiscovery';
import ReportBlockModal from './ReportBlockModal';

interface DiscoveryPageProps {
  currentUser: UserProfile;
  allProfiles: UserProfile[];
  blockedUsers: string[];
  onBlockUser: (userId: string) => void;
  onReportUser: (userId: string, reason: string, description: string) => void;
}

const DiscoveryPage: React.FC<DiscoveryPageProps> = ({
  currentUser,
  allProfiles,
  blockedUsers,
  onBlockUser,
  onReportUser,
}) => {
  const navigate = useNavigate();
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleProfileSelect = (profile: UserProfile) => {
    setSelectedProfile(profile);
  };

  const handleReportClick = () => {
    if (selectedProfile) {
      setShowReportModal(true);
    }
  };

  const handleBlockClick = () => {
    if (selectedProfile) {
      onBlockUser(selectedProfile.id);
      setSelectedProfile(null);
    }
  };

  return (
    <div className="h-full bg-white md:bg-[#f0f2f5] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 sticky top-0 z-10 shadow-sm flex items-center gap-4">
        <button onClick={() => navigate('/')} className="md:hidden text-gray-500 hover:text-red-500 transition-colors">
          <i className="fa-solid fa-chevron-left text-lg"></i>
        </button>
        <div className="flex-1">
          <h3 className="font-black text-gray-900 text-xl">Discover Profiles</h3>
          <p className="text-xs text-gray-500 mt-1">Advanced filtering with distance & interests</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="hidden md:flex w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 items-center justify-center transition-colors"
          title="Close"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {selectedProfile ? (
            // Profile Detail View
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
              {/* Profile Images */}
              <div className="relative h-96 bg-gray-900">
                <img
                  src={selectedProfile.images[0] || 'https://via.placeholder.com/800x600?text=No+Photo'}
                  alt={selectedProfile.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>

                {/* Back Button & Verification */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
                  <button
                    onClick={() => setSelectedProfile(null)}
                    className="bg-black/60 backdrop-blur text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/80 transition"
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                  {selectedProfile.verification.status === 'VERIFIED' && (
                    <div className="bg-emerald-500 text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold">
                      <i className="fa-solid fa-shield-check"></i>
                      Verified
                    </div>
                  )}
                </div>

                {/* Profile Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                  <h2 className="text-4xl font-black text-white">{selectedProfile.name}, {selectedProfile.age}</h2>
                  <div className="flex items-center gap-2 mt-2 text-gray-100">
                    <i className="fa-solid fa-location-dot text-red-400"></i>
                    <span className="font-semibold">{selectedProfile.location}</span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="p-6 space-y-6">
                {/* Bio */}
                <div>
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">About</h3>
                  <p className="text-gray-700 leading-relaxed">{selectedProfile.bio}</p>
                </div>

                {/* Interests */}
                {selectedProfile.interests.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.interests.map((interest) => (
                        <span
                          key={interest}
                          className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-sm font-bold"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                  <button
                    onClick={handleReportClick}
                    className="py-3 bg-amber-50 text-amber-600 rounded-2xl font-bold hover:bg-amber-100 transition flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-flag"></i>
                    Report
                  </button>
                  <button
                    onClick={handleBlockClick}
                    className="py-3 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-ban"></i>
                    Block
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Grid View
            <ProfileDiscovery
              currentUser={currentUser}
              allProfiles={allProfiles}
              blockedUsers={blockedUsers}
              onProfileSelect={handleProfileSelect}
            />
          )}
        </div>
      </div>

      {/* Report/Block Modal */}
      <ReportBlockModal
        isOpen={showReportModal && selectedProfile !== null}
        targetUser={selectedProfile}
        onClose={() => setShowReportModal(false)}
        onReport={(reason, description) => {
          if (selectedProfile) {
            onReportUser(selectedProfile.id, reason, description);
          }
        }}
        onBlock={handleBlockClick}
        isBlocked={selectedProfile ? blockedUsers.includes(selectedProfile.id) : false}
      />
    </div>
  );
};

export default DiscoveryPage;
