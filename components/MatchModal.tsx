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

  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 1,
  }));

  const confettiColors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6B9D'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">

      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confettiPieces.map((piece) => (
            <div
              key={piece.id}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${piece.left}%`,
                top: '-10px',
                backgroundColor: confettiColors[piece.id % confettiColors.length],
                animation: `confettiFall ${piece.duration}s linear ${piece.delay}s forwards`,
              }}
            />
          ))}
        </div>
      )}

      {/* Instagram-Style Neon Card */}
      <div className="relative bg-gradient-to-b from-gray-900 to-black rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
           style={{
             border: '2px solid #E91E63',
             boxShadow: '0 0 30px rgba(233, 30, 99, 0.5), 0 0 60px rgba(233, 30, 99, 0.3)',
           }}>

        {/* It's a Match Header */}
        <div className="relative px-6 pt-6 pb-4 text-center border-b border-pink-500/30">
          <div className="text-4xl mb-2 animate-pulse">
            <i className="fa-solid fa-heart text-pink-500" />
          </div>
          <h2 className="text-white text-2xl font-black tracking-wider" style={{ color: '#E91E63' }}>
            IT'S A MATCH!
          </h2>
          <p className="text-gray-400 text-xs mt-1 font-medium">
            You both like each other
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6">

          {/* Profile Photo in Circle with Initials */}
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              {/* Circular Profile Photo */}
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-pink-500 shadow-lg"
                   style={{ boxShadow: '0 0 20px rgba(233, 30, 99, 0.6)' }}>
                {matchedUser.profilePicture || matchedUser.images?.[0] ? (
                  <img
                    src={matchedUser.profilePicture || matchedUser.images[0]}
                    alt={displayName(matchedUser)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                    <span className="text-5xl font-black text-white">
                      {displayName(matchedUser)?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              {/* Heart Badge */}
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center shadow-lg border-2 border-black">
                <i className="fa-solid fa-heart text-white text-lg" />
              </div>
            </div>

            {/* Name and Subtitle */}
            <h3 className="text-2xl font-black text-white text-center">
              {displayName(matchedUser)}, {matchedUser.age}
            </h3>
            <p className="text-gray-400 text-sm font-medium mt-1">
              {matchedUser.location || 'Location not specified'}
            </p>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-3 gap-3 py-4 border-y border-pink-500/30">
            <div className="text-center">
              <div className="text-2xl font-black text-pink-500">
                {matchedUser.interests?.length || 0}
              </div>
              <div className="text-xs text-gray-400 font-medium mt-1">
                <i className="fa-solid fa-star mr-1" />
                Interests
              </div>
            </div>
            <div className="text-center border-l border-r border-pink-500/30">
              <div className="text-2xl font-black text-pink-500">
                {interestMatch}%
              </div>
              <div className="text-xs text-gray-400 font-medium mt-1">
                <i className="fa-solid fa-fire mr-1" />
                Match
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-pink-500">
                ✨
              </div>
              <div className="text-xs text-gray-400 font-medium mt-1">
                Premium
              </div>
            </div>
          </div>

          {/* Instagram Handle */}
          <div className="text-center space-y-1">
            <p className="text-gray-400 text-xs">Instagram Handle</p>
            <p className="text-white text-sm font-bold">
              @{matchedUser.username || matchedUser.name?.toLowerCase().replace(/\s+/g, '')}
            </p>
          </div>

          {/* Interests as Pills */}
          {matchedUser.interests?.length > 0 && (
            <div className="space-y-2">
              <p className="text-gray-400 text-xs font-medium">Interests</p>
              <div className="flex flex-wrap gap-2">
                {matchedUser.interests.slice(0, 5).map((interest, i) => (
                  <span key={i} className="px-3 py-1.5 bg-pink-500/20 text-pink-300 rounded-full text-xs font-bold border border-pink-500/40 hover:border-pink-500/80 transition-all">
                    #{interest}
                  </span>
                ))}
                {matchedUser.interests.length > 5 && (
                  <span className="px-3 py-1.5 bg-gray-800 text-gray-400 rounded-full text-xs font-bold border border-gray-700">
                    +{matchedUser.interests.length - 5}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Bio */}
          {matchedUser.bio && (
            <div className="bg-black/50 border border-pink-500/20 rounded-lg p-3">
              <p className="text-gray-300 text-xs leading-relaxed italic">
                "{matchedUser.bio}"
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-600"
            >
              <i className="fa-solid fa-arrow-left text-lg" />
              <span className="hidden sm:inline">Keep<br />Swiping</span>
            </button>
            <button
              onClick={onMessage}
              className="px-4 py-3 font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-white border-2 border-pink-500 hover:border-pink-400"
              style={{
                background: 'linear-gradient(135deg, #E91E63 0%, #EC407A 100%)',
                boxShadow: '0 0 15px rgba(233, 30, 99, 0.4)',
              }}
            >
              <i className="fa-solid fa-message text-lg" />
              <span className="hidden sm:inline">Message<br />Now</span>
            </button>
          </div>

          {/* Footer Message */}
          <p className="text-center text-xs text-gray-500 font-medium">
            <i className="fa-solid fa-star text-pink-500 mr-1" />
            Start your conversation now!
          </p>
        </div>
      </div>

      <style>{`
        @keyframes confettiFall {
          to { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default MatchModal;