import React from 'react';
import { UserProfile } from '../types';
import displayName from '../src/utils/formatName';

interface MatchModalProps {
  isOpen: boolean;
  matchedUser: UserProfile | null;
  interestMatch: number;
  onClose: () => void;
  onMessage: () => void;
}

const MatchModal: React.FC<MatchModalProps> = ({ isOpen, matchedUser, interestMatch, onClose, onMessage }) => {
  if (!isOpen || !matchedUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {/* Confetti-style background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `twinkle 1s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm mx-4 overflow-hidden transform transition-all">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-red-500 via-pink-500 to-red-500 p-8 text-center">
          <div className="text-6xl mb-4">❤️</div>
          <h2 className="text-white text-2xl font-bold mb-2">IT'S A MATCH!</h2>
          <p className="text-white/80 text-sm">You and {displayName(matchedUser)} like each other!</p>
        </div>

        {/* Match Details */}
        <div className="p-8">
          {/* Profile Picture */}
          {matchedUser.profilePicture && (
            <div className="mb-6 text-center">
              <img
                src={matchedUser.profilePicture}
                alt={matchedUser.username || matchedUser.name}
                className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-pink-500 shadow-lg"
              />
            </div>
          )}

          {/* Name */}
              <h3 className="text-center text-2xl font-bold text-gray-900 mb-2">
            {displayName(matchedUser)}
          </h3>

          {/* Location */}
          {matchedUser.location && (
            <p className="text-center text-gray-600 mb-4 flex items-center justify-center gap-1">
              <i className="fa-solid fa-map-pin text-red-500"></i>
              {matchedUser.location}
            </p>
          )}

          {/* Interest Match Score */}
          <div className="bg-gradient-to-r from-pink-50 to-red-50 rounded-2xl p-4 mb-6 border border-pink-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700 font-semibold">Interest Compatibility</span>
              <span className="text-2xl font-bold text-red-500">{interestMatch}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-red-400 to-pink-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${interestMatch}%` }}
              />
            </div>
          </div>

          {/* Common Interests */}
          {matchedUser.interests && matchedUser.interests.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">Interests</p>
              <div className="flex flex-wrap gap-2">
                {matchedUser.interests.slice(0, 5).map((interest, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium"
                  >
                    {interest}
                  </span>
                ))}
                {matchedUser.interests.length > 5 && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    +{matchedUser.interests.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-2xl transition-colors"
            >
              Keep Swiping
            </button>
            <button
              onClick={onMessage}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold rounded-2xl transition-all shadow-lg hover:shadow-xl"
            >
              <i className="fa-solid fa-message mr-2"></i>Message
            </button>
          </div>

          {/* Bottom text */}
          <p className="text-center text-xs text-gray-500 mt-4">
            Start your conversation now!
          </p>
        </div>
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default MatchModal;
