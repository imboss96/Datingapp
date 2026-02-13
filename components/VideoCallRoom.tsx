import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserProfile } from '../types';

interface VideoCallRoomProps {
  currentUser: UserProfile;
  otherUser?: UserProfile;
}

const VideoCallRoom: React.FC<VideoCallRoomProps> = ({ currentUser, otherUser }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [callDuration, setCallDuration] = useState(0);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [showCallInfo, setShowCallInfo] = useState(true);
  const [callQuality, setCallQuality] = useState<'good' | 'moderate' | 'poor'>('good');

  // Simulate call timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulate network quality fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      const qualities: ('good' | 'moderate' | 'poor')[] = ['good', 'good', 'moderate', 'good', 'good'];
      setCallQuality(qualities[Math.floor(Math.random() * qualities.length)]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getQualityIcon = () => {
    switch (callQuality) {
      case 'good':
        return { icon: 'fa-signal', color: 'text-emerald-500' };
      case 'moderate':
        return { icon: 'fa-signal', color: 'text-amber-500' };
      case 'poor':
        return { icon: 'fa-triangle-exclamation', color: 'text-red-500' };
    }
  };

  const quality = getQualityIcon();

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex items-center justify-center group">
      {/* Main Video Grid */}
      <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Remote Video (Full when only 1, left when 2) */}
        <div className="relative bg-gray-900 flex items-center justify-center">
          {otherUser && (
            <>
              <img
                src={otherUser.images[0] || 'https://via.placeholder.com/1920x1080?text=Remote'}
                alt="Remote user"
                className="w-full h-full object-cover blur-sm"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50"></div>
              <div className="absolute bottom-8 left-8 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full border-4 border-emerald-500 overflow-hidden">
                    <img src={otherUser.images[0]} alt={otherUser.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-white">
                    <h3 className="text-xl font-bold">{otherUser.name}</h3>
                    <p className="text-sm text-gray-300">{otherUser.location}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Local Video (Right when in grid mode) */}
        <div className="hidden md:flex relative bg-gray-900 items-center justify-center border-l border-gray-700">
          <img
            src={currentUser.images[0] || 'https://via.placeholder.com/1920x1080?text=You'}
            alt="Your video"
            className="w-full h-full object-cover blur-sm"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent"></div>
          <div className="absolute top-8 right-8 z-10">
            <div className="text-right text-white">
              <div className="w-20 h-20 rounded-2xl border-4 border-blue-500 overflow-hidden mx-auto mb-2">
                <img src={currentUser.images[0]} alt={currentUser.name} className="w-full h-full object-cover" />
              </div>
              <p className="text-xs font-bold">You</p>
              {!isVideoOn && <p className="text-xs text-red-400 mt-1">Video off</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Local Video - Bottom Right Corner */}
      <div className="md:hidden absolute bottom-32 right-8 w-24 h-32 rounded-2xl border-4 border-blue-500 overflow-hidden shadow-lg z-20">
        <img
          src={currentUser.images[0]}
          alt="Your video"
          className={`w-full h-full object-cover ${!isVideoOn ? 'blur-md bg-gray-800' : ''}`}
        />
        {!isVideoOn && (
          <div className="absolute inset-0 bg-gray-800/80 flex items-center justify-center">
            <i className="fa-solid fa-video-slash text-white text-2xl"></i>
          </div>
        )}
      </div>

      {/* Call Info Overlay */}
      {showCallInfo && (
        <div className="absolute top-8 left-8 right-8 flex items-center justify-between z-20 text-white">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur px-4 py-2 rounded-full">
              <i className={`fa-solid ${quality.icon} ${quality.color} animate-pulse`}></i>
              <span className="text-sm font-bold">{callQuality === 'good' ? 'Good Connection' : callQuality === 'moderate' ? 'Moderate Connection' : 'Poor Connection'}</span>
            </div>
            <div className="bg-black/60 backdrop-blur px-4 py-2 rounded-full font-bold text-lg">
              {formatTime(callDuration)}
            </div>
          </div>
          <button
            onClick={() => setShowCallInfo(false)}
            className="text-gray-300 hover:text-white transition p-2"
          >
            <i className="fa-solid fa-chevron-up"></i>
          </button>
        </div>
      )}

      {/* Collapse Button */}
      {!showCallInfo && (
        <button
          onClick={() => setShowCallInfo(true)}
          className="absolute top-8 left-8 z-20 text-white bg-black/60 backdrop-blur px-4 py-2 rounded-full hover:bg-black/80 transition"
        >
          <i className="fa-solid fa-chevron-down"></i>
        </button>
      )}

      {/* Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-8 z-20 group-hover:opacity-100 opacity-75 transition-opacity">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-6">
          {/* Audio Toggle */}
          <button
            onClick={() => setIsAudioOn(!isAudioOn)}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all shadow-lg ${
              isAudioOn
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-red-500 text-white hover:bg-red-600 ring-4 ring-red-500/50'
            }`}
            title={isAudioOn ? 'Mute' : 'Unmute'}
          >
            <i className={`fa-solid ${isAudioOn ? 'fa-microphone' : 'fa-microphone-slash'}`}></i>
          </button>

          {/* Video Toggle */}
          <button
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all shadow-lg ${
              isVideoOn
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-red-500 text-white hover:bg-red-600 ring-4 ring-red-500/50'
            }`}
            title={isVideoOn ? 'Stop Video' : 'Start Video'}
          >
            <i className={`fa-solid ${isVideoOn ? 'fa-video' : 'fa-video-slash'}`}></i>
          </button>

          {/* Call Duration Display */}
          <div className="bg-black/60 backdrop-blur px-6 py-3 rounded-full text-white font-bold text-lg">
            {formatTime(callDuration)}
          </div>

          {/* Screen Share */}
          <button
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold bg-gray-700 text-white hover:bg-gray-600 transition-all shadow-lg"
            title="Share Screen"
          >
            <i className="fa-solid fa-display"></i>
          </button>

          {/* Switch Camera */}
          <button
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold bg-gray-700 text-white hover:bg-gray-600 transition-all shadow-lg hidden md:flex"
            title="Switch Camera"
          >
            <i className="fa-solid fa-repeat"></i>
          </button>

          {/* End Call */}
          <button
            onClick={() => navigate('/chats')}
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg"
            title="End Call"
          >
            <i className="fa-solid fa-phone-slash"></i>
          </button>
        </div>
      </div>

      {/* Call Stats (Mobile) */}
      <div className="md:hidden absolute bottom-40 left-8 right-8 bg-black/60 backdrop-blur rounded-2xl p-4 z-20">
        <div className="grid grid-cols-2 gap-4 text-white text-center">
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold">Audio</p>
            <p className="text-lg font-bold">{isAudioOn ? '✓ On' : '✗ Muted'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold">Video</p>
            <p className="text-lg font-bold">{isVideoOn ? '✓ On' : '✗ Off'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCallRoom;
