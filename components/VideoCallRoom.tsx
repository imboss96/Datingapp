import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { useAlert } from '../services/AlertContext';
import displayName from '../src/utils/formatName';
import { useWebRTC } from '../services/useWebRTC';
import { useWebSocketContext } from '../services/WebSocketProvider';

interface VideoCallRoomProps {
  currentUser: UserProfile;
  otherUser?: UserProfile;
  otherUserId: string;
  isInitiator: boolean;
  isVideo: boolean;
  onCallEnd?: () => void;
}

const VideoCallRoom: React.FC<VideoCallRoomProps> = ({
  currentUser,
  otherUser,
  otherUserId,
  isInitiator,
  isVideo,
  onCallEnd
}) => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const [callDuration, setCallDuration] = useState(0);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(isVideo);
  const [showCallInfo, setShowCallInfo] = useState(true);
  const [callQuality, setCallQuality] = useState<'good' | 'moderate' | 'poor'>('good');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [streamError, setStreamError] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webRtcRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // ── Replaced useWebSocket with useWebSocketContext ──
  const { sendMessage, addMessageHandler } = useWebSocketContext();

  // Define endCall before callbacks that use it
  const endCall = useCallback(() => {
    console.log('[VideoCallRoom] Ending call');
    webRtcRef.current?.hangUp();
    onCallEnd?.();
    navigate('/chats');
  }, [onCallEnd, navigate]);

  const handleConnectionStateChange = useCallback((state: RTCPeerConnectionState) => {
    console.log('[VideoCallRoom] Connection state:', state);
    setConnectionStatus(
      state === 'connected' ? 'connected' :
      state === 'connecting' ? 'connecting' : 'disconnected'
    );
  }, []);

  const handleRemoteStream = useCallback((stream: MediaStream) => {
    console.log('[VideoCallRoom] Remote stream received:', {
      streamId: stream.id,
      tracks: stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled }))
    });
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    } else {
      console.warn('[VideoCallRoom] remoteVideoRef not available');
    }
  }, []);

  const handleWebSocketMessage = useCallback((data: any) => {
    console.log('[VideoCallRoom] WebSocket message:', data.type);
    if (data.type === 'call_offer' && webRtcRef.current) {
      webRtcRef.current.handleOffer(data.offer);
    } else if (data.type === 'call_answer' && webRtcRef.current) {
      webRtcRef.current.handleAnswer(data.answer);
    } else if (data.type === 'ice_candidate' && webRtcRef.current) {
      webRtcRef.current.handleICECandidate(data.candidate);
    } else if (data.type === 'call_end') {
      console.log('[VideoCallRoom] Remote user ended the call');
      endCall();
    }
  }, [endCall]);

  const handleRTCError = useCallback((error: Error) => {
    console.error('[VideoCallRoom] WebRTC error:', error);
    setStreamError(error.message);
    showAlert('Connection Error', 'Call connection error: ' + error.message);
  }, [showAlert]);

  const handleWSSignaling = useCallback((data: any) => {
    const transformedData = {
      ...data,
      type: data.type.replace('send_', '')
    };
    console.log('[VideoCallRoom] Sending WebRTC signal:', transformedData.type);
    sendMessage(transformedData);
  }, [sendMessage]);

  const webRtcHook = useWebRTC({
    userId: currentUser.id,
    otherUserId: otherUserId,
    isInitiator: isInitiator,
    isVideoEnabled: isVideoOn,
    isAudioEnabled: isAudioOn,
    onRemoteStream: handleRemoteStream,
    onConnectionStateChange: handleConnectionStateChange,
    onError: handleRTCError,
    wsMessageHandler: handleWSSignaling
  });

  useEffect(() => {
    if (webRtcHook) {
      webRtcRef.current = webRtcHook;
      setIsInitialized(true);
    }
  }, [webRtcHook]);

  // Subscribe to WebSocket messages
  useEffect(() => {
    const unsubscribe = addMessageHandler(handleWebSocketMessage);
    return unsubscribe;
  }, [addMessageHandler, handleWebSocketMessage]);

  // Update local video stream
  useEffect(() => {
    if (webRtcHook?.localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = webRtcHook.localStream;
    }
  }, [webRtcHook]);

  // Call timer
  useEffect(() => {
    const interval = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulate network quality
  useEffect(() => {
    const interval = setInterval(() => {
      const qualities: ('good' | 'moderate' | 'poor')[] = ['good', 'good', 'moderate'];
      setCallQuality(qualities[Math.floor(Math.random() * qualities.length)]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const hours   = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs    = seconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getQualityIcon = () => {
    switch (callQuality) {
      case 'good':     return { icon: 'fa-signal', color: 'text-emerald-500' };
      case 'moderate': return { icon: 'fa-signal', color: 'text-amber-500' };
      case 'poor':     return { icon: 'fa-triangle-exclamation', color: 'text-red-500' };
    }
  };

  const quality = getQualityIcon();
  const hasLocalStream  = webRtcHook?.localStream;
  const localTracks     = webRtcHook?.localStream?.getTracks() || [];
  const hasVideoTrack   = localTracks.some((t: MediaStreamTrack) => t.kind === 'video');
  const hasAudioTrack   = localTracks.some((t: MediaStreamTrack) => t.kind === 'audio');

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex items-center justify-center group">
      {/* Debug Overlay - Remove in production */}
      <div className="absolute top-2 left-2 z-50 bg-black/80 text-white text-xs p-2 rounded max-w-md font-mono">
        <div>Local Stream: {hasLocalStream ? '✅' : '❌'}</div>
        <div>Video Track: {hasVideoTrack ? '✅' : '❌'}</div>
        <div>Audio Track: {hasAudioTrack ? '✅' : '❌'}</div>
        <div>Status: {connectionStatus}</div>
        <div>IsVideo: {isVideo ? 'Yes' : 'No'}</div>
        <div>Browser: {navigator.userAgent.split(' ').slice(-2).join(' ')}</div>
        {streamError && <div className="text-red-400 mt-2">Error: {streamError}</div>}
      </div>

      {/* Error message if streams failed */}
      {streamError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
          <div className="bg-white rounded-xl max-w-md p-6 shadow-2xl">
            <div className="text-center">
              <i className="fa-solid fa-exclamation-triangle text-4xl text-red-500 mb-4 block"></i>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Device Error</h2>
              <p className="text-gray-600 mb-6">{streamError}</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-bold text-blue-900 mb-2">To fix this:</p>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Check browser permissions for camera/microphone</li>
                  <li>Ensure device is plugged in and enabled</li>
                  <li>Try a different browser (Chrome/Firefox recommended)</li>
                  <li>Restart your browser</li>
                  <li>If in RDP/VM, enable device redirection</li>
                </ul>
              </div>
              <button
                onClick={() => endCall()}
                className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition"
              >
                End Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Video Grid */}
      <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Remote Video */}
        <div className="relative bg-gray-900 flex items-center justify-center">
          {isVideo ? (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50"></div>
              <div className="absolute bottom-8 left-8 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full border-4 border-emerald-500 overflow-hidden">
                    <img src={otherUser?.images[0]} alt={otherUser?.username || otherUser?.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-white">
                    <h3 className="text-xl font-bold">{displayName(otherUser)}</h3>
                    <p className="text-sm text-gray-300">{otherUser?.location}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <img
                src={otherUser?.images[0] || 'https://via.placeholder.com/1920x1080?text=Voice+Call'}
                alt="Remote user"
                className="w-full h-full object-cover blur-sm"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-32 h-32 rounded-full border-4 border-emerald-500 overflow-hidden mx-auto mb-4">
                    <img src={otherUser?.images[0]} alt={otherUser?.username || otherUser?.name} className="w-full h-full object-cover" />
                  </div>
                  <h2 className="text-3xl font-bold">{displayName(otherUser)}</h2>
                  <p className="text-lg text-gray-300 mt-2">Voice Call</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Local Video */}
        {isVideo && (
          <div className="hidden md:flex relative bg-gray-900 items-center justify-center border-l border-gray-700">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent"></div>
            <div className="absolute top-8 right-8 z-10">
              <div className="text-right text-white">
                <div className="w-20 h-20 rounded-2xl border-4 border-blue-500 overflow-hidden mx-auto mb-2">
                  <img src={currentUser.images[0]} alt={currentUser.username || currentUser.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-xs font-bold">You</p>
                {!isVideoOn && <p className="text-xs text-red-400 mt-1">Video off</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Local Video */}
      {isVideo && (
        <div className="md:hidden absolute bottom-32 right-8 w-24 h-32 rounded-2xl border-4 border-blue-500 overflow-hidden shadow-lg z-20">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!isVideoOn ? 'blur-md bg-gray-800' : ''}`}
          />
          {!isVideoOn && (
            <div className="absolute inset-0 bg-gray-800/80 flex items-center justify-center">
              <i className="fa-solid fa-video-slash text-white text-2xl"></i>
            </div>
          )}
        </div>
      )}

      {/* Call Info Overlay */}
      {showCallInfo && (
        <div className="absolute top-8 left-8 right-8 flex items-center justify-between z-20 text-white">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur px-4 py-2 rounded-full">
              <i className="fa-solid fa-signal text-emerald-500 animate-pulse"></i>
              <span className="text-sm font-bold">
                {connectionStatus === 'connected' ? 'Connected' :
                 connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
            <div className="bg-black/60 backdrop-blur px-4 py-2 rounded-full font-bold text-lg">
              {formatTime(callDuration)}
            </div>
          </div>
          <button onClick={() => setShowCallInfo(false)} className="text-gray-300 hover:text-white transition p-2">
            <i className="fa-solid fa-chevron-up"></i>
          </button>
        </div>
      )}

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
            onClick={() => {
              setIsAudioOn(!isAudioOn);
              webRtcRef.current?.toggleAudio(!isAudioOn);
            }}
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
          {isVideo && (
            <button
              onClick={() => {
                setIsVideoOn(!isVideoOn);
                webRtcRef.current?.toggleVideo(!isVideoOn);
              }}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all shadow-lg ${
                isVideoOn
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-red-500 text-white hover:bg-red-600 ring-4 ring-red-500/50'
              }`}
              title={isVideoOn ? 'Stop Video' : 'Start Video'}
            >
              <i className={`fa-solid ${isVideoOn ? 'fa-video' : 'fa-video-slash'}`}></i>
            </button>
          )}

          {/* Call Duration */}
          <div className="bg-black/60 backdrop-blur px-6 py-3 rounded-full text-white font-bold text-lg">
            {formatTime(callDuration)}
          </div>

          {/* End Call */}
          <button
            onClick={endCall}
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg"
            title="End Call"
          >
            <i className="fa-solid fa-phone-slash"></i>
          </button>
        </div>
      </div>

      {/* Call Stats Mobile */}
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