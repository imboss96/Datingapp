import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';

interface IncomingCallProps {
  isOpen: boolean;
  caller: UserProfile | null;
  onAccept: () => void;
  onReject: () => void;
  isVideo: boolean;
}

const IncomingCall: React.FC<IncomingCallProps> = ({
  isOpen,
  caller,
  onAccept,
  onReject,
  isVideo,
}) => {
  const [ringing, setRinging] = useState(true);

  useEffect(() => {
    if (isOpen) {
      // Simulate ringing sound with visual feedback
      const interval = setInterval(() => {
        setRinging((prev) => !prev);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen || !caller) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur flex items-center justify-center z-50">
      <div className="bg-gradient-to-b from-gray-900 to-black rounded-3xl p-8 text-center max-w-sm w-full mx-4 shadow-2xl">
        {/* Avatar with ringing animation */}
        <div className={`mb-6 flex justify-center ${ringing ? 'animate-pulse' : ''}`}>
          <div className="relative">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="absolute inset-0 rounded-full border-2 border-red-500/50 animate-ping"
                style={{
                  animationDelay: `${i * 200}ms`,
                  width: `${120 + i * 40}px`,
                  height: `${120 + i * 40}px`,
                  top: `-${(i * 40 + 20)}px`,
                  left: `-${(i * 40 + 20)}px`,
                }}
              />
            ))}
            <img
                src={caller.images[0] || 'https://via.placeholder.com/200x200?text=User'}
                alt={caller.username || caller.name}
              className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
            />
          </div>
        </div>

        {/* Caller Info */}
        <h2 className="text-3xl font-black text-white mb-2">{caller.name}</h2>
        <p className="text-gray-400 text-lg mb-6">{caller.location}</p>

        {/* Call Type */}
        <div className="inline-block bg-red-500/20 border border-red-500 rounded-full px-4 py-2 mb-8">
          <span className="text-red-400 font-bold text-sm flex items-center gap-2">
            <i className={`fa-solid ${isVideo ? 'fa-video' : 'fa-phone'} animate-pulse`}></i>
            {isVideo ? 'Video Call' : 'Voice Call'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {/* Reject Button */}
          <button
            onClick={onReject}
            className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-phone-slash"></i>
            Decline
          </button>

          {/* Accept Button */}
          <button
            onClick={onAccept}
            className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
          >
            <i className={`fa-solid ${isVideo ? 'fa-video' : 'fa-phone'}`}></i>
            {isVideo ? 'Answer' : 'Accept'}
          </button>
        </div>

        {/* Info Text */}
        <p className="text-gray-500 text-xs mt-6">
          Standard users pay 5 coins per minute for video calls
        </p>
      </div>
    </div>
  );
};

export default IncomingCall;
