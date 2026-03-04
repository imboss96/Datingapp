import React, { useState } from 'react';
import { UserProfile } from '../types';
import VerificationBadge from './VerificationBadge';
import { calculateDistance } from '../services/distanceUtils';

interface UserProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onLike?: () => void;
  onDislike?: () => void;
  onSuperLike?: () => void;
  onMessage?: () => void;
  currentUser?: UserProfile;
  coords?: [number, number] | null;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  onClose,
  onLike,
  onDislike,
  onSuperLike,
  onMessage,
  currentUser,
  coords,
}) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showFullBio, setShowFullBio] = useState(false);

  const photos = user.images && user.images.length > 0 ? user.images : ['https://via.placeholder.com/400x600'];
  const distance = coords && user.coordinates ? calculateDistance(coords, user.coordinates) : null;

  const distanceLabel = distance === null
    ? null
    : distance < 1
    ? '< 1 km'
    : `${Math.round(distance)} km`;

  const bioText = user.bio || '';
  const bioTruncated = bioText.length > 100 ? bioText.slice(0, 100) + '..' : bioText;

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex(prev => (prev - 1 + photos.length) % photos.length);
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex(prev => (prev + 1) % photos.length);
  };

  return (
    /* Full-screen overlay */
    <div
      className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      {/* Modal container — phone-card style */}
      <div
        className="relative w-full sm:w-[390px] h-full sm:h-[820px] sm:rounded-[40px] overflow-hidden flex flex-col shadow-2xl"
        style={{ background: '#fff' }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── PHOTO SECTION (top ~55%) ── */}
        <div className="relative flex-shrink-0" style={{ height: '58%' }}>

          {/* Photo */}
          <img
            src={photos[currentPhotoIndex]}
            alt={user.name}
            className="w-full h-full object-cover"
          />

          {/* Dark gradient at bottom of photo for overlap readability */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{ height: '35%', background: 'linear-gradient(to top, rgba(0,0,0,0.18), transparent)' }}
          />

          {/* Photo tap zones (left/right) */}
          {photos.length > 1 && (
            <>
              <button
                onClick={handlePrevPhoto}
                className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
                aria-label="Previous photo"
              />
              <button
                onClick={handleNextPhoto}
                className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
                aria-label="Next photo"
              />
            </>
          )}

          {/* Photo dots indicator */}
          {photos.length > 1 && (
            <div className="absolute top-4 left-0 right-0 flex justify-center gap-1.5 z-20">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all duration-300"
                  style={{
                    width: i === currentPhotoIndex ? 20 : 6,
                    background: i === currentPhotoIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                  }}
                />
              ))}
            </div>
          )}

          {/* Back button */}
          <button
            onClick={onClose}
            className="absolute top-5 left-5 z-20 w-10 h-10 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        </div>

        {/* ── ACTION BUTTONS (overlapping photo & card) ── */}
        <div
          className="absolute left-0 right-0 flex items-center justify-center gap-5 z-30"
          style={{ top: 'calc(58% - 36px)' }}
        >
          {/* Dislike */}
          <button
            onClick={onDislike}
            className="w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{
              background: '#fff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              border: '1.5px solid #f0f0f0',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Like (large, gradient) */}
          <button
            onClick={onLike}
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #ff6b9d, #f72585)',
              boxShadow: '0 8px 28px rgba(247,37,133,0.45)',
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>

          {/* Super like (star) */}
          <button
            onClick={onSuperLike}
            className="w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{
              background: '#fff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              border: '1.5px solid #f0f0f0',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#7c3aed">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
        </div>

        {/* ── WHITE CARD (bottom ~42%) ── */}
        <div
          className="flex-1 overflow-y-auto"
          style={{
            background: '#fff',
            borderRadius: '28px 28px 0 0',
            marginTop: -28,
            paddingTop: 44,
            paddingBottom: 32,
          }}
        >
          <div className="px-6 space-y-5">

            {/* Name + age + send button */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[26px] font-extrabold text-gray-900 leading-tight tracking-tight">
                    {user.username || user.name}, {user.age}
                  </h2>
                  <VerificationBadge
                    verified={user.isPhotoVerified || (user as any).photoVerificationStatus === 'approved'}
                    size="sm"
                  />
                </div>
                {user.bio && (
                  <p className="text-[14px] text-gray-400 font-medium mt-0.5">
                    {/* Show occupation if available, else first line of bio */}
                    {(user as any).occupation || user.bio.split('\n')[0].slice(0, 40)}
                  </p>
                )}
              </div>

              {/* Message / send button */}
              <button
                onClick={onMessage}
                className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0 mt-1"
                style={{
                  border: '1.5px solid #f0c0d0',
                  background: '#fff9fb',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f72585" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>

            {/* Location */}
            <div>
              <h3 className="text-[13px] font-extrabold text-gray-900 mb-1.5 tracking-tight">Location</h3>
              <div className="flex items-center justify-between">
                <p className="text-[14px] text-gray-500 font-medium">
                  {user.location || 'Location not set'}
                </p>
                {distanceLabel && (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl"
                    style={{ background: '#fff3f7', border: '1px solid #fdd0e0' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#f72585">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <span className="text-[12px] font-bold text-rose-500">{distanceLabel}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100" />

            {/* About */}
            {bioText && (
              <div>
                <h3 className="text-[13px] font-extrabold text-gray-900 mb-1.5 tracking-tight">About</h3>
                <p className="text-[14px] text-gray-600 leading-relaxed">
                  {showFullBio ? bioText : bioTruncated}
                </p>
                {bioText.length > 100 && (
                  <button
                    onClick={() => setShowFullBio(v => !v)}
                    className="text-[13px] font-bold mt-1"
                    style={{ color: '#f72585' }}
                  >
                    {showFullBio ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}

            {/* Divider */}
            {bioText && <div className="h-px bg-gray-100" />}

            {/* Interests */}
            {user.interests && user.interests.length > 0 && (
              <div>
                <h3 className="text-[13px] font-extrabold text-gray-900 mb-3 tracking-tight">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {user.interests.map((interest) => (
                    <span
                      key={interest}
                      className="px-3 py-1.5 text-[12px] font-semibold rounded-full"
                      style={{
                        background: '#fff0f5',
                        color: '#f72585',
                        border: '1px solid #fdd0e0',
                      }}
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* More Photos */}
            {photos.length > 1 && (
              <>
                <div className="h-px bg-gray-100" />
                <div>
                  <h3 className="text-[13px] font-extrabold text-gray-900 mb-3 tracking-tight">
                    Photos ({photos.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((img, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-2xl overflow-hidden cursor-pointer"
                        style={{
                          border: i === currentPhotoIndex ? '2.5px solid #f72585' : '2px solid transparent',
                        }}
                        onClick={() => setCurrentPhotoIndex(i)}
                      >
                        <img
                          src={img}
                          alt={`Photo ${i + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Premium badge */}
            {user.isPremium && (
              <>
                <div className="h-px bg-gray-100" />
                <div
                  className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{ background: 'linear-gradient(135deg, #ffd166, #f9a825)' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                  </svg>
                  <div>
                    <p className="text-white font-extrabold text-[13px]">Gold Member</p>
                    <p className="text-white/80 text-[11px]">Unlimited coins & premium features</p>
                  </div>
                </div>
              </>
            )}

            {/* Verification row */}
            <div className="h-px bg-gray-100" />
            <div className="flex items-center gap-3 py-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  background: user.isPhotoVerified || (user as any).photoVerificationStatus === 'approved'
                    ? '#10b981'
                    : '#d1d5db',
                }}
              />
              <span className="text-[13px] font-semibold text-gray-600">
                {user.isPhotoVerified || (user as any).photoVerificationStatus === 'approved'
                  ? 'Photo Verified'
                  : 'Not Verified'}
              </span>
              {(user.isPhotoVerified || (user as any).photoVerificationStatus === 'approved') && (
                <VerificationBadge verified={true} size="sm" />
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;