import React from 'react';
import { UserProfile } from '../types';

interface NeonProfileCardProps {
  user: UserProfile;
  onViewProfile?: () => void;
  onMessage?: () => void;
  showStats?: boolean;
  variant?: 'compact' | 'full';
  glowColor?: 'pink' | 'purple' | 'blue' | 'green' | 'orange';
}

const NeonProfileCard: React.FC<NeonProfileCardProps> = ({
  user,
  onViewProfile,
  onMessage,
  showStats = true,
  variant = 'full',
  glowColor = 'pink'
}) => {
  const glowColorMap = {
    pink: '#ec4899',
    purple: '#a855f7',
    blue: '#3b82f6',
    green: '#10b981',
    orange: '#f97316',
  };

  const glowColor_ = glowColorMap[glowColor];

  return (
    <div className="flex items-center justify-center p-4">
      <style>{`
        @keyframes neonGlow {
          0%, 100% { 
            box-shadow: 0 0 10px ${glowColor_}, 0 0 20px ${glowColor_}, inset 0 0 10px ${glowColor_}40;
            border-color: ${glowColor_};
          }
          50% { 
            box-shadow: 0 0 20px ${glowColor_}, 0 0 40px ${glowColor_}, inset 0 0 20px ${glowColor_}60;
            border-color: ${glowColor_}ee;
          }
        }

        @keyframes profileGlow {
          0%, 100% {
            box-shadow: 0 0 20px ${glowColor_}, 0 0 40px ${glowColor_};
          }
          50% {
            box-shadow: 0 0 30px ${glowColor_}, 0 0 60px ${glowColor_};
          }
        }

        .neon-card-${glowColor} {
          animation: neonGlow 3s ease-in-out infinite;
        }

        .neon-profile-pic-${glowColor} {
          animation: profileGlow 3s ease-in-out infinite;
        }
      `}</style>

      <div
        className={`w-full max-w-sm rounded-3xl border-2 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-8 backdrop-blur-xl neon-card-${glowColor}`}
        style={{
          borderColor: glowColor_,
        }}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-2xl" style={{ color: glowColor_ }}>
            <i className="fab fa-instagram" />
          </div>
          {user.isPremium && (
            <span
              className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-white"
              style={{
                background: `linear-gradient(135deg, ${glowColor_}, ${glowColor_}dd)`,
                boxShadow: `0 0 10px ${glowColor_}`,
              }}
            >
              Premium
            </span>
          )}
        </div>

        {/* Profile Picture */}
        <div className="mb-6 flex justify-center">
          <div
            className={`relative h-40 w-40 rounded-full border-4 overflow-hidden neon-profile-pic-${glowColor}`}
            style={{
              borderColor: glowColor_,
            }}
          >
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
                <i className="fa-solid fa-user text-4xl text-gray-500" />
              </div>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-white">
            {user.name || user.username}
          </h2>
          <p className="mt-1 text-sm" style={{ color: glowColor_ }}>
            {user.username && `@${user.username}`}
          </p>
          {user.bio && (
            <p className="mt-2 text-sm text-gray-300">{user.bio}</p>
          )}
        </div>

        {/* Stats */}
        {showStats && variant === 'full' && (
          <div className="mb-6 grid grid-cols-3 gap-4 border-t border-b border-gray-700 py-4">
            <div className="text-center">
              <p className="text-xl font-bold text-white">
                {user.age || '—'}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">
                Age
              </p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">
                {Math.floor(Math.random() * 10000) + 1000}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">
                Likes
              </p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">
                {Math.floor(Math.random() * 500) + 50}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">
                Following
              </p>
            </div>
          </div>
        )}

        {/* Location & Interests */}
        <div className="mb-4 flex items-center justify-center gap-2 text-sm text-gray-300">
          <i className="fa-solid fa-location-dot" style={{ color: glowColor_ }} />
          <span>{user.location || 'Location not set'}</span>
        </div>

        {/* Interests Tags */}
        {user.interests && user.interests.length > 0 && (
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {user.interests.slice(0, 4).map((interest) => (
              <span
                key={interest}
                className="rounded-full px-3 py-1 text-xs font-semibold text-white uppercase tracking-wider"
                style={{
                  backgroundColor: `${glowColor_}22`,
                  border: `1px solid ${glowColor_}66`,
                }}
              >
                {interest}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {variant === 'full' && (
          <div className="flex gap-3">
            {onViewProfile && (
              <button
                onClick={onViewProfile}
                className="flex-1 rounded-full py-2.5 font-semibold transition-all duration-300 text-white uppercase tracking-widest text-sm"
                style={{
                  backgroundColor: `${glowColor_}22`,
                  border: `2px solid ${glowColor_}`,
                  color: glowColor_,
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = glowColor_;
                  (e.target as HTMLElement).style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = `${glowColor_}22`;
                  (e.target as HTMLElement).style.color = glowColor_;
                }}
              >
                <i className="fa-solid fa-eye mr-2" />
                View
              </button>
            )}
            {onMessage && (
              <button
                onClick={onMessage}
                className="flex-1 rounded-full py-2.5 font-semibold transition-all duration-300 text-white uppercase tracking-widest text-sm"
                style={{
                  backgroundColor: glowColor_,
                  boxShadow: `0 0 20px ${glowColor_}`,
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.boxShadow = `0 0 40px ${glowColor_}`;
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.boxShadow = `0 0 20px ${glowColor_}`;
                }}
              >
                <i className="fa-solid fa-message mr-2" />
                Message
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NeonProfileCard;
