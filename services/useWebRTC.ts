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
        console.log('[WebRTC] Requesting media:', { audio: isAudioEnabled, video: isVideoEnabled });
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: isAudioEnabled ? { echoCancellation: true, noiseSuppression: true } : false,
          video: isVideoEnabled 
            ? { 
                width: { ideal: 1280 }, 
                height: { ideal: 720 },
                facingMode: 'user'
              } 
            : false,
        });
        console.log('[WebRTC] Local media obtained:', stream.getTracks().map(t => t.kind));
        localStreamRef.current = stream;
        setLocalStream(stream);
      } catch (err) {
        console.error('[WebRTC] Failed to get local media:', err);
        const error = err instanceof Error ? err : new Error('Failed to get media');
        onError?.(error);
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