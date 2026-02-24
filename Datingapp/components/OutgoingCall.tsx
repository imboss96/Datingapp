import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import displayName from '../src/utils/formatName';

interface OutgoingCallProps {
  isOpen: boolean;
  recipient: UserProfile | null;
  onCancel: () => void;
  isVideo: boolean;
}

const OutgoingCall: React.FC<OutgoingCallProps> = ({
  isOpen,
  recipient,
  onCancel,
  isVideo,
}) => {
  const [callTime, setCallTime] = useState(0);
  const [status, setStatus] = useState<'calling' | 'ringing' | 'connecting'>('calling');

  useEffect(() => {
    if (isOpen) {
      // Simulate call progression
      setTimeout(() => setStatus('ringing'), 1000);
      setTimeout(() => setStatus('connecting'), 8000);

      const interval = setInterval(() => {
        setCallTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen || !recipient) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur flex items-center justify-center z-50">
      <div className="bg-gradient-to-b from-gray-900 to-black rounded-3xl p-8 text-center max-w-sm w-full mx-4 shadow-2xl">
        {/* Avatar */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-pulse"></div>
            <img
              src={recipient.images[0] || 'https://via.placeholder.com/200x200?text=User'}
              alt={recipient.username || recipient.name}
              className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
            />
          </div>
        </div>

        {/* Recipient Info */}
        <h2 className="text-3xl font-black text-white mb-2">{displayName(recipient)}</h2>
        <p className="text-gray-400 text-lg mb-6">{recipient.location}</p>

        {/* Call Type */}
        <div className="inline-block bg-blue-500/20 border border-blue-500 rounded-full px-4 py-2 mb-8">
          <span className="text-blue-400 font-bold text-sm flex items-center gap-2">
            <i className={`fa-solid ${isVideo ? 'fa-video' : 'fa-phone'}`}></i>
            {isVideo ? 'Video Call' : 'Voice Call'}
          </span>
        </div>

        {/* Status Messages */}
        <div className="mb-8">
          {status === 'calling' && (
            <p className="text-gray-300 font-bold text-lg">
              <span className="inline-block animate-bounce">.</span>
              <span className="inline-block animate-bounce" style={{ animationDelay: '0.1s' }}>
                .
              </span>
              <span className="inline-block animate-bounce" style={{ animationDelay: '0.2s' }}>
                .
              </span>
            </p>
          )}
          {status === 'ringing' && <p className="text-gray-300 font-bold">Ringing...</p>}
          {status === 'connecting' && (
            <div>
              <p className="text-emerald-400 font-bold mb-2">Connecting...</p>
              <p className="text-gray-400 text-sm">Please wait, preparing video stream</p>
            </div>
          )}
        </div>

        {/* Timer */}
        {callTime > 0 && (
          <div className="bg-gray-800/50 rounded-xl p-3 mb-8">
            <p className="text-gray-400 text-xs uppercase font-bold">Call Duration</p>
            <p className="text-white text-2xl font-black">{callTime}s</p>
          </div>
        )}

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-phone-slash"></i>
          Cancel Call
        </button>

        {/* Info */}
        <p className="text-gray-500 text-xs mt-6">
          Waiting for {displayName(recipient)} to answer...
        </p>
      </div>
    </div>
  );
};

export default OutgoingCall;
