import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebRTCProps {
  userId: string;
  otherUserId: string;
  isInitiator: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onError?: (error: Error) => void;
  wsMessageHandler?: (data: any) => void;
}

export const useWebRTC = ({
  userId,
  otherUserId,
  isInitiator,
  isVideoEnabled,
  isAudioEnabled,
  onRemoteStream,
  onConnectionStateChange,
  onError,
  wsMessageHandler,
}: UseWebRTCProps) => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');

  // Initialize local media stream
  useEffect(() => {
    const getLocalMedia = async () => {
      try {
        const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
        console.log('[WebRTC] Requesting media:', { audio: isAudioEnabled, video: isVideoEnabled, demoMode: isDemoMode });
        
        // Demo mode: generate mock canvas stream
        if (isDemoMode && isVideoEnabled) {
          const canvas = document.createElement('canvas');
          canvas.width = 1280;
          canvas.height = 720;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Draw a demo pattern
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#00d4ff';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📽️ Demo Video Stream', canvas.width / 2, canvas.height / 2);
            
            ctx.fillStyle = '#888';
            ctx.font = '24px Arial';
            ctx.fillText('(Camera not available)', canvas.width / 2, canvas.height / 2 + 60);
            
            // Animate by updating canvas
            setInterval(() => {
              ctx.fillStyle = '#1a1a2e';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = '#00d4ff';
              ctx.font = 'bold 48px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('📽️ Demo Video Stream', canvas.width / 2, canvas.height / 2);
              ctx.fillStyle = '#888';
              ctx.font = '24px Arial';
              ctx.fillText(`${new Date().toLocaleTimeString()}`, canvas.width / 2, canvas.height / 2 + 60);
            }, 1000);
          }
          
          const canvasStream = canvas.captureStream(30);
          if (isAudioEnabled) {
            try {
              const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
              audioStream.getAudioTracks().forEach(track => canvasStream.addTrack(track));
            } catch {
              console.warn('[WebRTC] Audio not available in demo mode');
            }
          }
          
          console.log('[WebRTC] Demo stream created:', canvasStream.getTracks().map(t => t.kind));
          localStreamRef.current = canvasStream;
          setLocalStream(canvasStream);
          return;
        }
        
        // Try to get video + audio first (if video is enabled)
        if (isVideoEnabled && isAudioEnabled) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true },
              video: { 
                width: { ideal: 1280 }, 
                height: { ideal: 720 },
                facingMode: 'user'
              }
            });
            console.log('[WebRTC] Local media obtained (video+audio):', stream.getTracks().map(t => t.kind));
            localStreamRef.current = stream;
            setLocalStream(stream);
            return;
          } catch (videoError) {
            console.warn('[WebRTC] Video not available, trying audio only:', videoError);
          }
        }
        
        // Fallback to audio only
        if (isAudioEnabled) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true },
              video: false
            });
            console.log('[WebRTC] Local media obtained (audio only):', stream.getTracks().map(t => t.kind));
            localStreamRef.current = stream;
            setLocalStream(stream);
            return;
          } catch (audioError) {
            console.error('[WebRTC] Audio not available:', audioError);
            const error = audioError instanceof Error ? audioError : new Error('Microphone not found');
            onError?.(new Error(`❌ Microphone Error: ${error.message}\n\nSet VITE_DEMO_MODE=true in .env to test without devices.`));
            return;
          }
        }
        
        // Only video requested but failed
        if (isVideoEnabled && !isAudioEnabled) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { 
                width: { ideal: 1280 }, 
                height: { ideal: 720 },
                facingMode: 'user'
              },
              audio: false
            });
            console.log('[WebRTC] Local media obtained (video only):', stream.getTracks().map(t => t.kind));
            localStreamRef.current = stream;
            setLocalStream(stream);
          } catch (videoError) {
            const error = videoError instanceof Error ? videoError : new Error('Camera not found');
            onError?.(new Error(`❌ Camera Error: ${error.message}\n\nSet VITE_DEMO_MODE=true in .env to test without devices.`));
          }
        }
      } catch (err) {
        console.error('[WebRTC] Failed to get local media:', err);
        const error = err instanceof Error ? err : new Error('Failed to access media devices');
        onError?.(new Error(`⚠️ Media Error: ${error.message}\n\nSet VITE_DEMO_MODE=true in .env to test without devices.`));
      }
    };

    if (isAudioEnabled || isVideoEnabled) {
      getLocalMedia();
    }

    return () => {
      localStreamRef.current?.getTracks().forEach(track => {
        console.log('[WebRTC] Stopping track:', track.kind);
        track.stop();
      });
    };
  }, [isAudioEnabled, isVideoEnabled, onError]);

  // Initialize WebRTC peer connection
  useEffect(() => {
    if (!localStream || !wsMessageHandler) return;

    const initPeerConnection = async () => {
      try {
        console.log('[WebRTC] Initializing peer connection, isInitiator:', isInitiator);
        
        const config = {
          iceServers: [
            { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
          ]
        };

        const pc = new RTCPeerConnection(config);
        pcRef.current = pc;

        console.log('[WebRTC] Adding local tracks:', localStream.getTracks().map(t => t.kind));
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });

        pc.ontrack = (event) => {
          console.log('[WebRTC] Remote track received:', event.track.kind);
          if (event.streams[0]) {
            setRemoteStream(event.streams[0]);
            onRemoteStream?.(event.streams[0]);
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('[WebRTC] Generated ICE candidate');
            wsMessageHandler({
              type: 'send_ice_candidate',
              to: otherUserId,
              candidate: event.candidate
            });
          }
        };

        pc.onconnectionstatechange = () => {
          console.log('[WebRTC] Connection state changed:', pc.connectionState);
          setConnectionState(pc.connectionState);
          onConnectionStateChange?.(pc.connectionState);
        };

        pc.oniceconnectionstatechange = () => {
          console.log('[WebRTC] ICE connection state changed:', pc.iceConnectionState);
        };

        pc.onsignalingstatechange = () => {
          console.log('[WebRTC] Signaling state changed:', pc.signalingState);
        };

        if (isInitiator) {
          console.log('[WebRTC] Creating offer');
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          });
          await pc.setLocalDescription(offer);
          console.log('[WebRTC] Offer created and set as local description');
          wsMessageHandler({
            type: 'send_call_offer',
            to: otherUserId,
            offer: offer
          });
        }
      } catch (err) {
        console.error('[WebRTC] Failed to initialize peer connection:', err);
        onError?.(err instanceof Error ? err : new Error('Failed to initialize peer connection'));
      }
    };

    initPeerConnection();

    return () => {
      console.log('[WebRTC] Cleaning up peer connection');
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, [localStream, isInitiator, userId, otherUserId, onRemoteStream, onConnectionStateChange, onError, wsMessageHandler]);

  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    try {
      console.log('[WebRTC] Handling offer');
      if (!pcRef.current) throw new Error('Peer connection not initialized');
      
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('[WebRTC] Remote description set (offer)');
      
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      console.log('[WebRTC] Answer created and set as local description');
      
      wsMessageHandler?.({
        type: 'send_call_answer',
        to: otherUserId,
        answer: answer
      });
    } catch (err) {
      console.error('[WebRTC] Failed to handle offer:', err);
      onError?.(err instanceof Error ? err : new Error('Failed to handle offer'));
    }
  }, [otherUserId, onError, wsMessageHandler]);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    try {
      console.log('[WebRTC] Handling answer');
      if (!pcRef.current) throw new Error('Peer connection not initialized');
      
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('[WebRTC] Remote description set (answer)');
    } catch (err) {
      console.error('[WebRTC] Failed to handle answer:', err);
      onError?.(err instanceof Error ? err : new Error('Failed to handle answer'));
    }
  }, [onError]);

  const handleICECandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    try {
      if (!pcRef.current) throw new Error('Peer connection not initialized');
      
      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('[WebRTC] ICE candidate added');
    } catch (err) {
      console.error('[WebRTC] Failed to add ICE candidate:', err);
    }
  }, []);

  const toggleAudio = useCallback((enabled: boolean) => {
    console.log('[WebRTC] Toggle audio:', enabled);
    localStream?.getAudioTracks().forEach(track => {
      track.enabled = enabled;
    });
  }, [localStream]);

  const toggleVideo = useCallback((enabled: boolean) => {
    console.log('[WebRTC] Toggle video:', enabled);
    localStream?.getVideoTracks().forEach(track => {
      track.enabled = enabled;
    });
  }, [localStream]);

  const hangUp = useCallback(() => {
    console.log('[WebRTC] Hanging up');
    localStream?.getTracks().forEach(track => track.stop());
    remoteStream?.getTracks().forEach(track => track.stop());
    pcRef.current?.close();
    
    wsMessageHandler?.({
      type: 'send_call_end',
      to: otherUserId
    });
  }, [localStream, remoteStream, otherUserId, wsMessageHandler]);

  return {
    localStream,
    remoteStream,
    connectionState,
    handleOffer,
    handleAnswer,
    handleICECandidate,
    toggleAudio,
    toggleVideo,
    hangUp
  };
};