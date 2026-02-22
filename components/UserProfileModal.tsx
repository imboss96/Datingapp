import React from 'react';
import { UserProfile } from '../types';
import VerificationBadge from './VerificationBadge';

interface UserProfileModalProps {
  user: UserProfile;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose }) => {
  const interestsList = [
    'Travel', 'Fitness', 'Music', 'Art', 'Food', 'Gaming', 'Reading',
    'Sports', 'Cooking', 'Photography', 'Dance', 'Hiking', 'Movies',
    'Yoga', 'Fashion', 'Technology', 'Pets', 'Volunteering'
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.4)',
        zIndex: 999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          width: '400px',
          height: '100%',
          position: 'fixed',
          left: 0,
          top: 0,
          overflowY: 'auto',
          boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666',
          }}
        >
          ×
        </button>

        <div className="h-full bg-white flex flex-col relative">
          {/* Profile Header */}
          <div className="relative h-64">
            <img
              src={user.images?.[0] || 'https://via.placeholder.com/400x256'}
              className="w-full h-full object-cover"
              alt="Profile"
            />
            <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center">
              <div className="relative">
                <img
                  src={user.images?.[0] || 'https://via.placeholder.com/100'}
                  className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-xl"
                  alt="Profile"
                />
              </div>
              <h2 className="text-white text-xl font-bold mt-3 tracking-tight flex items-center gap-2">
                {user.username || user.name}, {user.age}
                <VerificationBadge verified={user.isPhotoVerified || (user as any).photoVerificationStatus === 'approved'} size="sm" />
              </h2>
              <div className="mt-2 bg-white/20 backdrop-blur-md px-4 py-1 rounded-full border border-white/30 flex items-center gap-2">
                <i className="fa-solid fa-map-marker-alt text-white text-xs"></i>
                <span className="text-white text-xs font-medium">{user.location || 'Location not set'}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 space-y-8 overflow-y-auto">
            {/* Bio Section */}
            {user.bio && (
              <div className="space-y-2">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">About</h4>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl">
                  {user.bio}
                </p>
              </div>
            )}

            {/* Interests Section */}
            {user.interests && user.interests.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Interests</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {user.interests.map((interest) => (
                    <div
                      key={interest}
                      className="px-3 py-2 bg-rose-50 text-rose-700 rounded-lg text-xs font-medium text-center border border-rose-100"
                    >
                      {interest}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Profile Photos */}
            {user.images && user.images.length > 1 && (
              <div className="space-y-4">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Photos ({user.images.length})</h4>
                <div className="grid grid-cols-2 gap-3">
                  {user.images.slice(1).map((image, index) => (
                    <div key={index} className="aspect-square rounded-2xl overflow-hidden border border-gray-100">
                      <img
                        src={image}
                        alt={`Photo ${index + 2}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Premium Status */}
            {user.isPremium && (
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-6 rounded-3xl text-white shadow-xl">
                <div className="flex items-center gap-3 mb-2">
                  <i className="fa-solid fa-crown text-white text-lg"></i>
                  <h3 className="text-lg font-bold">Spark Gold Member</h3>
                </div>
                <p className="text-sm opacity-90">Unlimited coins, premium features, and priority matching</p>
              </div>
            )}

            {/* Verification Status */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Verification</h4>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                <div className={`w-3 h-3 rounded-full ${user.isPhotoVerified || (user as any).photoVerificationStatus === 'approved' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className="text-sm font-medium text-gray-700">
                  {user.isPhotoVerified || (user as any).photoVerificationStatus === 'approved' ? 'Photo Verified' : 'Not Verified'}
                </span>
                {user.isPhotoVerified || (user as any).photoVerificationStatus === 'approved' && (
                  <VerificationBadge verified={true} size="sm" />
                )}
              </div>
            </div>

            {/* Join Date (if available) */}
            {user.createdAt && (
              <div className="space-y-2">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Member Since</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-2xl">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;