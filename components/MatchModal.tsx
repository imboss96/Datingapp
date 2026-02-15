import React, { useEffect, useState } from 'react';
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
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen || !matchedUser) return null;

  // Generate confetti pieces
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 1,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confettiPieces.map((piece) => (
            <div
              key={piece.id}
              className="absolute w-2 h-2 rounded-full animate-pulse"
              style={{
                left: `${piece.left}%`,
                top: `-10px`,
                backgroundColor: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6B9D'][
                  Math.floor(Math.random() * 5)
                ],
                animation: `confettiFall ${piece.duration}s linear forwards`,
                animationDelay: `${piece.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all animate-bounce">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-red-500 via-pink-500 to-red-500 p-8 text-center relative overflow-hidden">
          {/* Animated hearts background */}
          <div className="absolute inset-0 opacity-20">
            {['♥', '♥', '♥', '♥', '♥'].map((heart, i) => (
              <span
                key={i}
                className="absolute text-4xl animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `heartBeat 1.5s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              >
                {heart}
              </span>
            ))}
          </div>

          <div className="relative z-10">
            <div className="text-6xl mb-4 animate-bounce" style={{ animationDelay: '0.1s' }}>
              ❤️
            </div>
            <h2 className="text-white text-3xl font-black mb-2 tracking-wider">IT'S A MATCH!</h2>
            <p className="text-white/90 text-sm font-medium">
              You and <span className="font-bold">{displayName(matchedUser)}</span> like each other!
            </p>
          </div>
        </div>

        {/* Match Details */}
        <div className="p-8">
          {/* Profile Picture */}
          {(matchedUser.profilePicture || matchedUser.images?.[0]) && (
            <div className="mb-6 text-center">
              <div className="relative inline-block">
                <img
                  src={matchedUser.profilePicture || matchedUser.images[0]}
                  alt={matchedUser.username || matchedUser.name}
                  className="w-40 h-40 rounded-full mx-auto object-cover border-4 border-pink-500 shadow-lg animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
                <div className="absolute -bottom-2 -right-2 bg-red-500 text-white p-3 rounded-full shadow-lg">
                  <i className="fa-solid fa-heart text-xl"></i>
                </div>
              </div>
            </div>
          )}

          {/* Name and Details */}
          <h3 className="text-center text-2xl font-black text-gray-900 mb-1">
            {displayName(matchedUser)}
          </h3>

          {/* Age and Location */}
          <div className="text-center mb-6">
            <p className="text-gray-600 text-sm font-semibold">
              {matchedUser.age} years old
            </p>
            {matchedUser.location && (
              <p className="text-gray-500 text-xs flex items-center justify-center gap-1 mt-2">
                <i className="fa-solid fa-map-pin text-red-500"></i>
                {matchedUser.location}
              </p>
            )}
          </div>

          {/* Interest Match Score */}
          <div className="bg-gradient-to-r from-pink-50 to-red-50 rounded-2xl p-5 mb-6 border border-pink-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-800 font-bold flex items-center gap-2">
                <i className="fa-solid fa-fire text-red-500"></i>
                Interest Compatibility
              </span>
              <span className="text-3xl font-black text-red-500">{interestMatch}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-red-400 to-pink-500 h-3 rounded-full transition-all duration-1000 shadow-lg"
                style={{ width: `${interestMatch}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-2 text-center font-medium">
              {interestMatch >= 80
                ? '🔥 Perfect match!'
                : interestMatch >= 60
                ? '👍 Great connection!'
                : '💬 Good potential!'}
            </p>
          </div>

          {/* Bio */}
          {matchedUser.bio && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-sm text-gray-700 leading-relaxed">"{matchedUser.bio}"</p>
            </div>
          )}

          {/* Common Interests */}
          {matchedUser.interests && matchedUser.interests.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <i className="fa-solid fa-star text-yellow-500"></i>
                Interests
              </p>
              <div className="flex flex-wrap gap-2">
                {matchedUser.interests.slice(0, 6).map((interest, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-bold hover:bg-red-200 transition-colors"
                  >
                    {interest}
                  </span>
                ))}
                {matchedUser.interests.length > 6 && (
                  <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">
                    +{matchedUser.interests.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-arrow-left"></i>
              Keep Swiping
            </button>
            <button
              onClick={onMessage}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-message"></i>
              Message Now
            </button>
          </div>

          {/* Bottom text */}
          <p className="text-center text-xs text-gray-500 mt-4 font-medium">
            💬 Send your first message and start a conversation!
          </p>
        </div>
      </div>

      <style>{`
        @keyframes confettiFall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes heartBeat {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.3);
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-bounce {
          animation: bounce 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default MatchModal;
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
