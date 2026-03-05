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
  onCallEnd,
}) => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const [callDuration,      setCallDuration]      = useState(0);
  const [isAudioOn,         setIsAudioOn]          = useState(true);
  const [isVideoOn,         setIsVideoOn]          = useState(isVideo);
  const [connectionStatus,  setConnectionStatus]   = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [streamError,       setStreamError]        = useState<string | null>(null);
  const [otherUserJoined,   setOtherUserJoined]    = useState(false);
  const [userJoinedAlertShown, setUserJoinedAlertShown] = useState(false);
  const [isFavorited,       setIsFavorited]        = useState(false);

  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const webRtcRef      = useRef<any>(null);

  const { sendMessage, addMessageHandler } = useWebSocketContext();

  // ── End call ──────────────────────────────────────────────────────────────────

  const endCall = useCallback(() => {
    if (callDuration > 0) {
      sendMessage({
        type: 'call_end',
        to: otherUserId,
        duration: callDuration,
        durationFormatted: `${Math.floor(callDuration / 60)}:${String(callDuration % 60).padStart(2, '0')}`,
      });
    }
    webRtcRef.current?.hangUp();
    onCallEnd?.();
    navigate('/chats');
  }, [onCallEnd, navigate, callDuration, otherUserId, sendMessage]);

  // ── WebRTC callbacks ──────────────────────────────────────────────────────────

  const handleConnectionStateChange = useCallback((state: RTCPeerConnectionState) => {
    setConnectionStatus(
      state === 'connected'    ? 'connected'    :
      state === 'connecting'   ? 'connecting'   : 'disconnected'
    );
  }, []);

  const handleRemoteStream = useCallback((stream: MediaStream) => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length > 0 && remoteAudioRef.current) {
      audioTracks.forEach(t => { t.enabled = true; });
      remoteAudioRef.current.srcObject = new MediaStream(audioTracks);
    }
  }, []);

  const handleRTCError = useCallback((error: Error) => {
    setStreamError(error.message);
  }, []);

  const handleWSSignaling = useCallback((data: any) => {
    sendMessage({ ...data, type: data.type.replace('send_', '') });
  }, [sendMessage]);

  const webRtcHook = useWebRTC({
    userId: currentUser.id,
    otherUserId,
    isInitiator,
    isVideoEnabled: isVideoOn,
    isAudioEnabled: isAudioOn,
    onRemoteStream: handleRemoteStream,
    onConnectionStateChange: handleConnectionStateChange,
    onError: handleRTCError,
    wsMessageHandler: handleWSSignaling,
  });

  useEffect(() => { if (webRtcHook) webRtcRef.current = webRtcHook; }, [webRtcHook]);

  useEffect(() => {
    if (webRtcHook?.localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = webRtcHook.localStream;
    }
  }, [webRtcHook]);

  // WebSocket handler
  useEffect(() => {
    const handler = (data: any) => {
      if      (data.type === 'call_offer'     && webRtcRef.current) webRtcRef.current.handleOffer(data.offer);
      else if (data.type === 'call_answer'    && webRtcRef.current) webRtcRef.current.handleAnswer(data.answer);
      else if (data.type === 'ice_candidate'  && webRtcRef.current) webRtcRef.current.handleICECandidate(data.candidate);
      else if (data.type === 'call_end')       endCall();
      else if (data.type === 'call_rejected') { showAlert('Call Rejected', 'The user declined your call.'); endCall(); }
      else if (data.type === 'user_joined_call' && data.from === otherUserId && !userJoinedAlertShown) {
        setOtherUserJoined(true);
        setUserJoinedAlertShown(true);
      }
    };
    return addMessageHandler(handler);
  }, [addMessageHandler, endCall, showAlert, otherUserId, userJoinedAlertShown]);

  // Send joined notification
  useEffect(() => {
    sendMessage({
      type: 'user_joined_call',
      to: otherUserId,
      fromName: currentUser.name || currentUser.username,
      timestamp: new Date().toISOString(),
    });
  }, []);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setCallDuration(p => p + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${m}:${String(ss).padStart(2, '0')}`;
  };

  const callerName = otherUser ? (otherUser.username || otherUser.name) : 'Calling...';
  const callerPhoto = otherUser?.images?.[0];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden flex flex-col">

      {/* ── Full-screen background: remote video or blurred photo ── */}
      <div className="absolute inset-0">
        {isVideo ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted={false}
            className="w-full h-full object-cover"
          />
        ) : (
          callerPhoto && (
            <img
              src={callerPhoto}
              alt={callerName}
              className="w-full h-full object-cover"
              style={{ filter: 'blur(0px)' }}
            />
          )
        )}

        {/* Subtle dark vignette at bottom */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, transparent 40%, rgba(0,0,0,0.55) 100%)',
          }}
        />
      </div>

      {/* Hidden audio */}
      <audio ref={remoteAudioRef} autoPlay muted={false} />

      {/* ── Camera icon pill — top center ── */}
      <div className="relative z-10 flex justify-center pt-16 shrink-0">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, #ff6b9d, #f72585)' }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
            <path d="M23 7l-7 5 7 5V7z"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="white"/>
          </svg>
        </div>
      </div>

      {/* ── Local video pip (top-right, only when video call) ── */}
      {isVideo && (
        <div
          className="absolute top-16 right-4 z-20 rounded-2xl overflow-hidden shadow-xl"
          style={{ width: 90, height: 120, border: '2px solid rgba(255,255,255,0.3)' }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {!isVideoOn && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <line x1="2" y1="2" x2="22" y2="22"/>
                <path d="M10.66 6H14a2 2 0 012 2v3.34l1 1L23 7v10"/>
                <path d="M17.94 17.94A2 2 0 0116 19H4a2 2 0 01-2-2V7a2 2 0 012-2h3"/>
              </svg>
            </div>
          )}
        </div>
      )}

      {/* ── Caller name + status — bottom-left ── */}
      <div className="absolute z-10 left-6 shrink-0" style={{ bottom: '200px' }}>
        <h2 className="text-white font-extrabold text-[32px] leading-tight tracking-tight drop-shadow-lg">
          {callerName}
        </h2>
        <p className="text-white/70 text-[16px] font-medium mt-1 drop-shadow">
          {connectionStatus === 'connected'
            ? formatTime(callDuration)
            : connectionStatus === 'connecting'
            ? 'Connecting......'
            : 'Disconnected'}
        </p>
      </div>

      {/* ── Error overlay ── */}
      {streamError && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 p-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3 className="text-gray-900 font-extrabold text-lg mb-2">Device Error</h3>
            <p className="text-gray-500 text-sm mb-5">{streamError}</p>
            <button
              onClick={endCall}
              className="w-full py-3 rounded-xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #f72585, #c9184a)' }}
            >
              End Call
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom controls ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center pb-12"
        style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Top row: 3 secondary buttons */}
        <div className="flex items-center justify-center gap-8 mb-6">

          {/* Rotate / flip camera */}
          <button
            onClick={() => {
              setIsAudioOn(p => {
                webRtcRef.current?.toggleAudio(!p);
                return !p;
              });
            }}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{
              background: isAudioOn ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {/* Refresh / rotate icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
          </button>

          {/* Favorite / heart */}
          <button
            onClick={() => setIsFavorited(p => !p)}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{
              background: isFavorited ? 'rgba(247,37,133,0.3)' : 'rgba(255,255,255,0.18)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={isFavorited ? '#f72585' : 'none'} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>

          {/* Star / super like */}
          <button
            onClick={() => {
              if (isVideo) {
                setIsVideoOn(p => {
                  webRtcRef.current?.toggleVideo(!p);
                  return !p;
                });
              }
            }}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
        </div>

        {/* End call button — centered below */}
        <button
          onClick={endCall}
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #f72585, #c9184a)',
            boxShadow: '0 8px 30px rgba(247,37,133,0.5)',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
            <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.42 19.42 0 01-3.33-2.67m-2.67-3.34a19.79 19.79 0 01-3.07-8.63A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <line x1="23" y1="1" x2="1" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default VideoCallRoom;