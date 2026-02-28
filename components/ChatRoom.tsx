import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { UserProfile, Message, UserRole, MediaFile, VerificationStatus } from '../types';
import apiClient from '../services/apiClient';
import { useAlert } from '../services/AlertContext';
import { useWebSocketContext } from '../services/WebSocketProvider';
import { formatLastSeen } from '../services/lastSeenUtils';
import MediaRenderer from './MediaRenderer';
import VideoCallRoom from './VideoCallRoom';
import IncomingCall from './IncomingCall';
import VerificationBadge from './VerificationBadge';
import UserProfileModal from './UserProfileModal';
import { createAudioRecorder, formatAudioDuration, AudioRecording } from '../services/AudioRecorder';
import '../styles/whatsapp-background.css';

interface ChatRoomProps {
  currentUser: UserProfile;
  onDeductCoin: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, onDeductCoin }) => {
  const { showAlert, showConfirm } = useAlert();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [chatUser, setChatUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [confirmCall, setConfirmCall] = useState<{ isVideo: boolean } | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ caller: UserProfile; isVideo: boolean } | null>(null);
  const [inCall, setInCall] = useState(false);
  const [callIsVideo, setCallIsVideo] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<AudioRecording | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [isScrolledNearBottom, setIsScrolledNearBottom] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);
  const [photoIndices, setPhotoIndices] = useState<{ [userId: string]: number }>({});
  const [discoverySearch, setDiscoverySearch] = useState('');
  const [discoverySearchResults, setDiscoverySearchResults] = useState<UserProfile[]>([]);
  const [loadingSearchResults, setLoadingSearchResults] = useState(false);
  const [displayedProfiles, setDisplayedProfiles] = useState<UserProfile[]>([]);
  const [profilesPage, setProfilesPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreProfiles, setHasMoreProfiles] = useState(true);
  const [discoveryScrollRef, setDiscoveryScrollRef] = useState<HTMLDivElement | null>(null);
  const profilesPerPage = 10;
  const allUsersRef = useRef<UserProfile[]>([]); // Store sorted users in ref (not state) for memory efficiency
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputFieldRef = useRef<HTMLInputElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRecorderRef = useRef(createAudioRecorder());
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isModerator = currentUser.role === UserRole.MODERATOR || currentUser.role === UserRole.ADMIN;

  // Set up WebSocket for typing indicators
  const handleTypingIndicator = (data: any) => {
    if (data.chatId === chatId && data.userId !== currentUser.id) {
      console.log('[DEBUG ChatRoom] Received typing indicator:', data.isTyping);
      setIsOtherUserTyping(data.isTyping);
    }
  };

  const { sendTypingStatus, sendMessage } = useWebSocketContext();

  // Audio element for ringing tone
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Function to play ringing tone from external file
  const playRingingTone = async () => {
    try {
      if (!audioRef.current) {
        console.log('[ChatRoom] Creating audio element for ringing tone');
        audioRef.current = new Audio('/audio/ringing-tone.mp3');
        audioRef.current.loop = true;
        audioRef.current.volume = 0.7;
        audioRef.current.muted = false;
      }
      
      // Reset to beginning
      audioRef.current.currentTime = 0;
      
      // Play the audio file
      try {
        console.log('[ChatRoom] Playing ringing tone');
        await audioRef.current.play();
        console.log('[ChatRoom] Ringing tone playing successfully');
      } catch (err: any) {
        console.warn('[ChatRoom] Ringing tone playback failed:', err?.message);
      }
    } catch (err) {
      console.error('[ERROR] Failed to play ringing tone:', err);
    }
  };

  // Function to stop ringing tone
  const stopRingingTone = () => {
    console.log('[ChatRoom] Stopping ringing tone');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    console.log('[ChatRoom] Ringing tone stopped');
  };

  // Handle ringing when incoming call arrives
  useEffect(() => {
    if (incomingCall) {
      console.log('[ChatRoom] Incoming call detected - playing ringing tone');
      const timer = setTimeout(() => {
        playRingingTone();
      }, 100);
      
      return () => {
        clearTimeout(timer);
        stopRingingTone();
      };
    } else {
      console.log('[ChatRoom] No incoming call - stopping ringing tone');
      stopRingingTone();
    }
  }, [incomingCall]);

  // Cleanup ringing tone on component unmount
  useEffect(() => {
    return () => {
      console.log('[ChatRoom] Component unmounting - stopping all ringing');
      stopRingingTone();
    };
  }, []);

  // Helper function to log call events as messages
  const logCallEvent = async (eventDescription: string) => {
    if (!chatId) {
      console.log('[DEBUG] Cannot log call event - no chatId');
      return;
    }
    try {
      const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
      });
      const callLogMessage = `[CALL] ${eventDescription} • ${timestamp}`;
      console.log('[DEBUG ChatRoom] Logging call event:', callLogMessage);
      await apiClient.sendMessage(chatId, callLogMessage);
      // Refresh messages to show the log
      const chatData = await apiClient.getChat(chatId);
      setMessages(chatData.messages || []);
    } catch (err) {
      console.error('[ERROR] Failed to log call event:', err);
    }
  };

  // Register WebSocket handlers for incoming calls
  useEffect(() => {
    console.log('[ChatRoom useEffect] Setting up ws:call_incoming listener');
    
    const handleIncomingCall = (event: Event) => {
      console.log('[ChatRoom handleIncomingCall] Event received:', event);
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;
      console.log('[ChatRoom handleIncomingCall] Event detail data:', data);
      console.log('[ChatRoom handleIncomingCall] Current inCall state:', inCall);
      
      if (!data) {
        console.log('[ChatRoom handleIncomingCall] No data in event, returning');
        return;
      }
      
      if (!data.from) {
        console.log('[ChatRoom handleIncomingCall] No from field in data, returning');
        return;
      }
      
      if (inCall) {
        console.log('[ChatRoom handleIncomingCall] Already in call, ignoring incoming call');
        return;
      }
      
      console.log('[ChatRoom handleIncomingCall] Processing incoming call from:', data.from);
      
      // Find caller user from available data
      const callerUser: UserProfile = {
        id: data.from,
        name: data.fromName || 'Unknown User',
        username: data.from,
        age: 0,
        location: '',
        bio: '',
        interests: [],
        images: [],
        isPremium: false,
        coins: 0,
        role: UserRole.USER,
        coordinates: { latitude: 0, longitude: 0 },
        verification: { status: VerificationStatus.UNVERIFIED },
        blockedUsers: [],
        reportedUsers: []
      };
      
      console.log('[ChatRoom handleIncomingCall] Setting incoming call with caller:', callerUser.name);
      setIncomingCall({
        caller: callerUser,
        isVideo: data.isVideo || false
      });
      console.log('[ChatRoom handleIncomingCall] Incoming call state updated');
      
      // Log the incoming call event
      logCallEvent(`📱 Incoming ${data.isVideo ? 'video' : 'voice'} call from ${data.fromName || 'Unknown'}`);
    };
    
    console.log('[ChatRoom useEffect] Adding event listener for ws:call_incoming');
    window.addEventListener('ws:call_incoming', handleIncomingCall);
    console.log('[ChatRoom useEffect] Event listener added');
    
    return () => {
      console.log('[ChatRoom useEffect cleanup] Removing event listener for ws:call_incoming');
      window.removeEventListener('ws:call_incoming', handleIncomingCall);
    };
  }, [inCall]);

  // Handle call notifications (busy, unavailable)
  useEffect(() => {
    const handleCallNotification = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;
      console.log('[ChatRoom handleCallNotification] Received notification:', data.type);

      if (data.type === 'call_busy') {
        console.log('[ChatRoom] User is busy on another call:', data.recipientName);
        showAlert('User Busy', `${data.recipientName} is currently on another call. Try again later.`);
        setInCall(false);
        setConfirmCall(null);
        logCallEvent(`⏸️  Call to ${data.recipientName} failed - User is busy`);
      } else if (data.type === 'call_unavailable') {
        console.log('[ChatRoom] User is unavailable:', data.recipientName);
        showAlert('User Unavailable', `${data.recipientName} is not available right now. Try again later.`);
        setInCall(false);
        setConfirmCall(null);
        logCallEvent(`❌ Call to ${data.recipientName} failed - User unavailable`);
      }
    };

    window.addEventListener('ws:call_notification', handleCallNotification);
    return () => {
      window.removeEventListener('ws:call_notification', handleCallNotification);
    };
  }, []);

  // Handle incoming call acceptance
  const handleAcceptIncomingCall = async () => {
    if (!incomingCall) return;
    
    try {
      console.log('[DEBUG ChatRoom] Accepting incoming call from:', incomingCall.caller.id);
      
      // Log call acceptance
      await logCallEvent(`✅ Accepted ${incomingCall.isVideo ? 'video' : 'voice'} call from ${incomingCall.caller.name}`);
      
      // Create or get chat with caller
      const chatData = await apiClient.createOrGetChat(incomingCall.caller.id);
      setChatId(chatData.id);
      setChatUser(incomingCall.caller);
      
      // Set up the call
      setCallIsVideo(incomingCall.isVideo);
      setInCall(true);
      setIncomingCall(null);
      
      // Send call accepted signal
      sendMessage({
        type: 'call_accepted',
        to: incomingCall.caller.id
      });
    } catch (err) {
      console.error('[ERROR ChatRoom] Failed to accept incoming call:', err);
      showAlert('Error', 'Failed to accept call');
    }
  };
  
  // Handle incoming call rejection
  const handleRejectIncomingCall = () => {
    console.log('[DEBUG ChatRoom] Rejecting incoming call from:', incomingCall?.caller.id);
    
    if (incomingCall) {
      // Log call rejection
      logCallEvent(`❌ Rejected ${incomingCall.isVideo ? 'video' : 'voice'} call from ${incomingCall.caller.name}`);
      
      sendMessage({
        type: 'call_rejected',
        to: incomingCall.caller.id
      });
    }
    
    setIncomingCall(null);
  };

  // Handle keyboard visibility on mobile - scroll to bottom when keyboard shows/hides
  useEffect(() => {
    const inputElement = inputFieldRef.current;
    if (!inputElement) return;

    const handleFocus = () => {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    };

    const handleBlur = () => {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    };

    inputElement.addEventListener('focus', handleFocus);
    inputElement.addEventListener('blur', handleBlur);

    return () => {
      inputElement.removeEventListener('focus', handleFocus);
      inputElement.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Track scroll position to detect if user is scrolled to bottom
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (scrollCheckTimeoutRef.current) {
        clearTimeout(scrollCheckTimeoutRef.current);
      }

      scrollCheckTimeoutRef.current = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setIsScrolledNearBottom(isNearBottom);
      }, 50);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (scrollCheckTimeoutRef.current) {
        clearTimeout(scrollCheckTimeoutRef.current);
      }
    };
  }, []);

  const emitTypingStatus = async (isTyping: boolean) => {
    if (!chatId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setIsUserTyping(isTyping);

    if (isTyping) {
      if (sendTypingStatus) {
        sendTypingStatus(chatId, true);
        console.log('[DEBUG ChatRoom] Sent typing status: true');
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsUserTyping(false);
        if (sendTypingStatus) {
          sendTypingStatus(chatId, false);
          console.log('[DEBUG ChatRoom] Sent typing status: false');
        }
      }, 3000);
    }
  };

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !chatId) return;

    if (file.size > 100 * 1024 * 1024) {
      showAlert('File Too Large', 'File size exceeds 100MB limit');
      return;
    }

    setUploadingMedia(true);
    setUploadProgress(0);

    try {
      console.log('[DEBUG ChatRoom] Uploading media:', file.name);
      const result = await apiClient.uploadChatMedia(chatId, file);

      if (result.success && result.media) {
        setSelectedMedia(result.media);
        console.log('[DEBUG ChatRoom] Media uploaded successfully:', result.media);
      }
    } catch (err: any) {
      console.error('[ERROR ChatRoom] Failed to upload media:', err);
      showAlert('Upload Error', 'Failed to upload media. Please try again.');
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartAudioRecording = async () => {
    try {
      setIsRecordingAudio(true);
      setRecordingDuration(0);
      await audioRecorderRef.current.startRecording();

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      console.log('[DEBUG ChatRoom] Audio recording started');
    } catch (err: any) {
      console.error('[ERROR ChatRoom] Failed to start recording:', err);
      showAlert('Recording Failed', err.message || 'Failed to start audio recording');
      setIsRecordingAudio(false);
    }
  };

  const handleStopAudioRecording = async () => {
    try {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }

      setIsRecordingAudio(false);
      const audio = await audioRecorderRef.current.stopRecording();

      if (audio && audio.blob.size > 0) {
        setRecordedAudio(audio);
        console.log('[DEBUG ChatRoom] Audio recorded successfully:', audio.duration, 'ms');
      }
    } catch (err: any) {
      console.error('[ERROR ChatRoom] Failed to stop recording:', err);
      showAlert('Recording Error', err.message || 'Failed to stop audio recording');
      setIsRecordingAudio(false);
    }
  };

  const handleSendAudioMessage = async () => {
    if (!recordedAudio || !chatId) return;

    try {
      setUploadingMedia(true);

      const audioFile = new File(
        [recordedAudio.blob],
        `audio-${Date.now()}.webm`,
        { type: recordedAudio.mimeType }
      );

      console.log('[DEBUG ChatRoom] Uploading audio message:', audioFile.name);
      const result = await apiClient.uploadChatMedia(chatId, audioFile);

      if (result.success && result.media) {
        await handleSend(result.media);
        setRecordedAudio(null);
      }
    } catch (err: any) {
      console.error('[ERROR ChatRoom] Failed to send audio message:', err);
      showAlert('Send Failed', 'Failed to send audio message');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleDiscardAudio = () => {
    setRecordedAudio(null);
    setRecordingDuration(0);
  };

  useEffect(() => {
    const loadChat = async () => {
      try {
        if (!id) {
          console.log('[DEBUG ChatRoom] No chat ID - showing discovery panel');
          setLoading(false);
          return;
        }

        setLoading(true);
        console.log('[DEBUG ChatRoom] Loading chat/partner for ID:', id);

        let chatData = null;
        try {
          chatData = await apiClient.getChat(id);
          console.log('[DEBUG ChatRoom] Loaded chat by chatId:', chatData.id);
        } catch (err: any) {
          console.log('[DEBUG ChatRoom] Not a chatId, attempting createOrGet with userId:', id);
          chatData = await apiClient.createOrGetChat(id);
          console.log('[DEBUG ChatRoom] Chat created/retrieved successfully via createOrGet:', chatData.id);
        }

        if (!chatData || !chatData.id) {
          throw new Error('Chat creation/lookup returned no ID');
        }

        setChatId(chatData.id);
        setMessages(chatData.messages || []);

        try {
          await apiClient.markAllMessagesAsRead(chatData.id);
          console.log('[DEBUG ChatRoom] Marked all messages as read for chat:', chatData.id);
        } catch (err) {
          console.warn('[WARN ChatRoom] Failed to mark messages as read:', err);
        }

        if ((location.state as any)?.matchedProfile) {
          console.log('[DEBUG ChatRoom] Using matched profile from state:', (location.state as any).matchedProfile.name);
          setChatUser((location.state as any).matchedProfile);
        } else {
          try {
            console.log('[DEBUG ChatRoom] Fetching user profile for ID:', id);
            const allUsers = await apiClient.getAllUsers();
            const user = (allUsers || []).find((u: UserProfile | null) => u && (u as any).id === id);
            if (user) {
              console.log('[DEBUG ChatRoom] Found user:', user.name);
              setChatUser(user);
            } else {
              console.warn('[WARN ChatRoom] User not found in list:', id);
            }
          } catch (err) {
            console.error('[ERROR ChatRoom] Failed to fetch user profile:', err);
          }
        }
      } catch (err: any) {
        console.error('[ERROR ChatRoom] Failed to load chat:', err.message || err);
        console.error('[ERROR ChatRoom] Full error details:', err);
        console.error('[ERROR ChatRoom] Error response:', err.response || 'No response object');
        showAlert('Loading Error', `Chat loading failed: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    loadChat();
  }, [id, location.state, currentUser?.id]);

  // Poll for new messages every 2 seconds
  useEffect(() => {
    if (!chatId) return;

    const pollMessages = async () => {
      try {
        const chatData = await apiClient.getChat(chatId);
        setMessages(chatData.messages || []);
      } catch (err) {
        console.error('[ERROR ChatRoom] Failed to poll messages:', err);
      }
    };

    pollMessages();
    pollIntervalRef.current = setInterval(pollMessages, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [chatId]);

  useEffect(() => {
    // Only auto-scroll if user is already scrolled near bottom
    if (isScrolledNearBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOtherUserTyping, isScrolledNearBottom]);

  // Initial scroll to bottom when chat loads
  useEffect(() => {
    if (!loading && scrollRef.current) {
      // Give the DOM a moment to render
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          setIsScrolledNearBottom(true);
        }
      }, 100);
    }
  }, [loading]);

  // Calculate approximate distance between two coordinates (simplified)
  const calculateDistance = (lat1?: number, lon1?: number, lat2?: number, lon2?: number): number => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    // Simple Haversine formula approximation
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Handle discovery search
  const handleDiscoverySearch = async (query: string) => {
    setDiscoverySearch(query);
    
    if (!query.trim()) {
      setDiscoverySearchResults([]);
      return;
    }

    try {
      setLoadingSearchResults(true);
      const allUsers = await apiClient.getAllUsers();
      const lowerQuery = query.toLowerCase();
      
      let filtered = (allUsers || [])
        .filter((u: UserProfile | null) => {
          if (!u || u.id === currentUser.id) return false;
          const name = u.name?.toLowerCase() || '';
          const location = u.location?.toLowerCase() || '';
          const bio = u.bio?.toLowerCase() || '';
          const interests = (u.interests || []).map(i => i.toLowerCase()).join(' ');
          
          return name.includes(lowerQuery) || 
                 location.includes(lowerQuery) || 
                 bio.includes(lowerQuery) || 
                 interests.includes(lowerQuery);
        })
        .sort((a: any, b: any) => {
          // Sort by distance from current user
          const currentUserLat = (currentUser as any).latitude;
          const currentUserLon = (currentUser as any).longitude;
          const distA = calculateDistance(currentUserLat, currentUserLon, (a as any).latitude, (a as any).longitude);
          const distB = calculateDistance(currentUserLat, currentUserLon, (b as any).latitude, (b as any).longitude);
          return distA - distB;
        })
        .slice(0, 20);

      setDiscoverySearchResults(filtered);
    } catch (err) {
      console.error('[ERROR ChatRoom] Discovery search failed:', err);
      setDiscoverySearchResults([]);
    } finally {
      setLoadingSearchResults(false);
    }
  };
  useEffect(() => {
    if (!id) {
      const loadSuggestions = async () => {
        try {
          setLoadingSuggestions(true);
          const allUsers = await apiClient.getAllUsers();
          console.log('[DEBUG ChatRoom] Loaded all users:', allUsers?.length || 0);
          
          // Sort by distance from current user
          const currentUserLat = (currentUser as any).latitude;
          const currentUserLon = (currentUser as any).longitude;
          
          const sorted = (allUsers || [])
            .filter((u: UserProfile | null) => u && u.id !== currentUser.id)
            .sort((a: any, b: any) => {
              const distA = calculateDistance(currentUserLat, currentUserLon, (a as any).latitude, (a as any).longitude);
              const distB = calculateDistance(currentUserLat, currentUserLon, (b as any).latitude, (b as any).longitude);
              return distA - distB;
            });
          
          // Store sorted users in ref (lazy load from this)
          allUsersRef.current = sorted;
          
          // Load first batch only
          const firstBatch = sorted.slice(0, profilesPerPage);
          setDisplayedProfiles(firstBatch);
          setProfilesPage(0);
          setHasMoreProfiles(sorted.length > profilesPerPage);
          
          console.log('[DEBUG ChatRoom] Initialized FYP with:', firstBatch.length, 'profiles. Total available:', sorted.length);
        } catch (err) {
          console.error('[ERROR ChatRoom] Failed to load suggestions:', err);
          setDisplayedProfiles([]);
          allUsersRef.current = [];
        } finally {
          setLoadingSuggestions(false);
        }
      };
      loadSuggestions();
    } else {
      setDisplayedProfiles([]);
      allUsersRef.current = [];
      setProfilesPage(0);
      setHasMoreProfiles(true);
    }
  }, [id, currentUser.id]);

  useEffect(() => {
    const markAsRead = async () => {
      if (!chatId) return;
      try {
        for (const msg of messages) {
          if (msg.senderId !== currentUser.id && !msg.isRead) {
            await apiClient.markMessageAsRead(chatId, msg.id);
          }
        }
      } catch (err) {
        console.error('[ERROR ChatRoom] Failed to mark messages as read:', err);
      }
    };

    markAsRead();
  }, [messages, chatId, currentUser.id]);

  const handleSend = async (mediaOverride?: MediaFile) => {
    if (!chatId) {
      console.warn('[WARN ChatRoom] Cannot send message: chatId not set');
      showAlert('Not Ready', 'Please wait for the chat to load before sending a message.');
      return;
    }

    const media = mediaOverride || selectedMedia;
    if (!inputText.trim() && !media) {
      console.warn('[WARN ChatRoom] Cannot send empty message without media');
      return;
    }

    if (!currentUser.isPremium && currentUser.coins < 1) {
      showAlert('Out of Coins', 'Top up your balance in your profile to keep chatting.');
      return;
    }

    const messageText = inputText.trim();

    try {
      setInputText('');
      if (!mediaOverride) {
        setSelectedMedia(null);
      }

      console.log('[DEBUG ChatRoom] Sending message to chat:', chatId, 'text:', messageText, 'with media:', !!media);

      let response;
      if (media && messageText) {
        response = await apiClient.sendMessageWithMedia(chatId, messageText, media);
      } else if (media) {
        response = await apiClient.sendMessageWithMedia(chatId, '', media);
      } else {
        response = await apiClient.sendMessage(chatId, messageText);
      }

      console.log('[DEBUG ChatRoom] Message sent successfully:', response);

      if (!currentUser.isPremium) {
        onDeductCoin();
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const chatData = await apiClient.getChat(chatId);
      console.log('[DEBUG ChatRoom] Refreshed chat data after send, messages count:', chatData.messages?.length || 0);
      setMessages(chatData.messages || []);
    } catch (err: any) {
      console.error('[ERROR ChatRoom] Failed to send message:', err);
      console.error('[ERROR ChatRoom] Response status:', err.response?.status);
      console.error('[ERROR ChatRoom] Response data:', err.response?.data);
      showAlert('Error', 'Failed to send message: ' + (err.message || 'Unknown error'));
      setInputText(inputText);
    }
  };

  const handleEditMessage = async (messageId: string, oldText: string) => {
    if (editingMessageId === messageId) {
      if (!editText.trim()) return;
      try {
        await apiClient.editMessage(chatId!, messageId, editText);
        const chatData = await apiClient.getChat(chatId!);
        setMessages(chatData.messages || []);
        setEditingMessageId(null);
        setEditText('');
      } catch (err) {
        console.error('[ERROR] Failed to edit message:', err);
        showAlert('Error', 'Failed to edit message');
      }
    } else {
      setEditingMessageId(messageId);
      setEditText(oldText);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    showConfirm('Delete Message', 'Are you sure you want to delete this message?', async () => {
      try {
        await apiClient.deleteMessage(chatId!, messageId);
        const chatData = await apiClient.getChat(chatId!);
        setMessages(chatData.messages || []);
      } catch (err) {
        console.error('[ERROR] Failed to delete message:', err);
        showAlert('Error', 'Failed to delete message');
      }
    }, true);
  };

  const startEditing = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditText(msg.text);
  };

  const saveEdit = () => {
    if (!editingMessageId) return;
    setMessages(prev => prev.map(m =>
      m.id === editingMessageId
        ? { ...m, text: editText, isEditedByModerator: true, isFlagged: false }
        : m
    ));
    setEditingMessageId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  // Load more profiles for FYP infinite scroll - lazy load from sorted array
  const loadMoreProfiles = async () => {
    if (isLoadingMore || !hasMoreProfiles || discoverySearch) return;
    
    try {
      setIsLoadingMore(true);
      
      // Load next batch from the sorted users ref (no API call needed)
      const nextPage = profilesPage + 1;
      const startIdx = nextPage * profilesPerPage;
      const endIdx = startIdx + profilesPerPage;
      const moreProfiles = allUsersRef.current.slice(startIdx, endIdx);
      
      if (moreProfiles.length > 0) {
        setDisplayedProfiles(prev => [...prev, ...moreProfiles]);
        setProfilesPage(nextPage);
        
        // Check if there are more profiles after this batch
        if (endIdx >= allUsersRef.current.length) {
          setHasMoreProfiles(false);
        }
      } else {
        setHasMoreProfiles(false);
      }
    } catch (err) {
      console.error('[ERROR ChatRoom] Failed to load more profiles:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Detect scroll near bottom for infinite scroll
  useEffect(() => {
    if (!discoveryScrollRef || discoverySearch) return;
    
    const handleScroll = () => {
      const element = discoveryScrollRef;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      
      // Load more when user is 80% through the page
      if (scrollHeight - (scrollTop + clientHeight) < scrollHeight * 0.2 && !isLoadingMore && hasMoreProfiles) {
        loadMoreProfiles();
      }
    };
    
    discoveryScrollRef.addEventListener('scroll', handleScroll);
    return () => discoveryScrollRef.removeEventListener('scroll', handleScroll);
  }, [discoveryScrollRef, displayedProfiles, discoverySearch, profilesPage, hasMoreProfiles, isLoadingMore]);

  return (
    <>
      <div className="flex flex-col w-full h-full bg-white md:bg-[#f0f2f5] relative">
        {/* Header */}
        <div className="bg-white px-2 md:px-6 py-1.5 md:py-4 flex items-center gap-2 md:gap-4 flex-shrink-0 z-20 safe-area-top max-h-16 md:max-h-20">
          <button onClick={() => navigate('/chats')} className="md:hidden text-gray-500 hover:text-red-500 transition-colors text-lg">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          {chatUser ? (
            <>
              <button
                onClick={() => setShowUserProfile(true)}
                className="flex items-center gap-1 md:gap-4 flex-1 min-w-0 hover:bg-gray-50 rounded-lg p-1 -m-1 transition-colors"
              >
                <img src={chatUser.images?.[0] || 'https://via.placeholder.com/100'} className="w-8 md:w-11 h-8 md:h-11 rounded-full border border-gray-100 shadow-sm object-cover flex-shrink-0" alt="User" />
                <div className="flex-1 min-w-0 text-left">
                  <h3 className="font-bold text-gray-900 text-xs md:text-lg leading-tight truncate">
                    {chatUser.name}
                    <VerificationBadge verified={chatUser.isPhotoVerified || (chatUser as any).photoVerificationStatus === 'approved'} size="sm" />
                  </h3>
                  <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${chatUser.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                    <span className={`text-[9px] md:text-[11px] font-bold uppercase tracking-widest truncate ${chatUser.isOnline ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {formatLastSeen(chatUser.lastSeen, !!chatUser.isOnline)}
                    </span>
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-0.5 md:gap-3 flex-shrink-0">
                <div className="flex items-center gap-0.5 md:gap-2">
                  <button
                    onClick={() => { if (chatUser) { setConfirmCall({ isVideo: false }); } }}
                    title="Voice call"
                    className="w-7 md:w-9 h-7 md:h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-200 shadow-sm text-xs md:text-base"
                  >
                    <i className="fa-solid fa-phone"></i>
                  </button>
                  <button
                    onClick={() => { if (chatUser) { setConfirmCall({ isVideo: true }); } }}
                    title="Video call"
                    className="w-7 md:w-9 h-7 md:h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-200 shadow-sm text-xs md:text-base"
                  >
                    <i className="fa-solid fa-video"></i>
                  </button>
                  <div className="hidden md:flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full border border-amber-100 shadow-sm">
                    <i className="fa-solid fa-coins text-amber-500 text-xs"></i>
                    <span className="text-[10px] font-black text-amber-800">{currentUser.isPremium ? '∞' : currentUser.coins}</span>
                  </div>
                </div>
                {isModerator && (
                  <div className="hidden sm:flex bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase items-center gap-2 border border-blue-100 shadow-sm">
                    <i className="fa-solid fa-shield-halved"></i>
                    Moderator Access
                  </div>
                )}
                <button className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                  <i className="fa-solid fa-ellipsis-vertical text-lg"></i>
                </button>
              </div>
            </>
          ) : (
            <></>
          )}
        </div>

        {/* Confirm toast for starting calls */}
        {confirmCall && chatUser && (
          <div className="fixed top-20 right-4 z-40">
            <div className="bg-white shadow-lg rounded-lg p-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="font-semibold">{confirmCall.isVideo ? 'Start Video Call' : 'Start Voice Call'}</div>
                <div className="text-sm text-gray-500">Call {chatUser.username || chatUser.name}?</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmCall(null)}
                  className="px-3 py-1 rounded-md border border-gray-200 text-sm text-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setCallIsVideo(confirmCall.isVideo);
                    setInCall(true);
                    setConfirmCall(null);
                    if (chatUser) {
                      console.log('[DEBUG ChatRoom] Initiating call to:', chatUser.id, 'isVideo:', confirmCall.isVideo);
                      // Log outgoing call
                      logCallEvent(`📞 Outgoing ${confirmCall.isVideo ? 'video' : 'voice'} call to ${chatUser.name}`);
                      sendMessage({
                        type: 'call_incoming',
                        to: chatUser.id,
                        toName: chatUser.name || chatUser.username,
                        fromName: currentUser.name || currentUser.username,
                        isVideo: confirmCall.isVideo,
                        chatId: chatId
                      });
                      console.log('[DEBUG ChatRoom] Call notification sent via WebSocket');
                    }
                  }}
                  className="px-3 py-1 rounded-md bg-red-500 text-white text-sm font-semibold"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Incoming Call Modal */}
        {incomingCall && (
          <IncomingCall
            isOpen={true}
            caller={incomingCall.caller}
            onAccept={handleAcceptIncomingCall}
            onReject={handleRejectIncomingCall}
            isVideo={incomingCall.isVideo}
          />
        )}

        {/* Video call room */}
        {inCall && chatUser && (
          <VideoCallRoom
            currentUser={currentUser}
            otherUser={chatUser}
            otherUserId={chatUser.id}
            isInitiator={true}
            isVideo={callIsVideo}
            onCallEnd={() => {
              console.log('[ChatRoom] Call ended, logging event');
              setInCall(false);
              sendMessage({
                type: 'call_end',
                to: chatUser.id
              });
              // Log call end after a brief delay to ensure it's captured
              setTimeout(() => {
                logCallEvent(`📞 ${callIsVideo ? 'Video' : 'Voice'} call ended with ${chatUser.name}`);
              }, 100);
            }}
          />
        )}

        {/* Messages or Empty State */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-500 text-sm">Loading...</p>
            </div>
          </div>
        ) : !id ? (
          // Empty State with Suggested Profiles
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
            {loadingSuggestions ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-500 text-sm">Loading suggestions...</p>
                </div>
              </div>
            ) : displayedProfiles.length === 0 && !discoverySearch ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="text-6xl text-gray-300 mb-2">—</div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">No profiles available</h3>
                    <p className="text-gray-500 text-sm">Check back soon for more matches</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Header - Positioned at Top */}
                <div className="w-full mb-4 pb-3 border-b-2 border-gradient-to-r from-red-500 to-pink-500 px-6 pt-6">
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 via-pink-500 to-red-600 bg-clip-text text-transparent">
                        Discover New Connections
                      </h2>
                      <p className="text-base text-gray-600 font-medium">Find your match among our community</p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search profiles by name, location, interests..."
                        value={discoverySearch}
                        onChange={(e) => handleDiscoverySearch(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 text-sm"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <i className="fa-solid fa-magnifying-glass"></i>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid of Profiles - 4 Columns with Pagination */}
                <div className="w-full flex-1 overflow-y-auto min-h-0" ref={el => el && setDiscoveryScrollRef(el)}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 pb-24 p-3 sm:p-4 md:p-6">
                    {(discoverySearch ? discoverySearchResults : displayedProfiles).map(user => {
                      const currentPhotoIndex = photoIndices[user.id] || 0;
                      const photos = user.images || [];
                      const hasMultiplePhotos = photos.length > 1;

                      // Find matching interests
                      const matchingInterests = (currentUser.interests || []).filter(
                        interest => user.interests?.includes(interest)
                      );

                      const nextPhoto = () => {
                        setPhotoIndices(prev => ({
                          ...prev,
                          [user.id]: (prev[user.id] || 0) + 1 < photos.length ? (prev[user.id] || 0) + 1 : 0
                        }));
                      };

                      const prevPhoto = () => {
                        setPhotoIndices(prev => ({
                          ...prev,
                          [user.id]: (prev[user.id] || 0) - 1 < 0 ? photos.length - 1 : (prev[user.id] || 0) - 1
                        }));
                      };

                      return (
                        <div
                          key={user.id}
                          className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden space-y-3 flex flex-col h-full"
                        >
                          {/* Photo Carousel */}
                          <div className="relative aspect-square bg-gray-100 overflow-hidden group">
                            {photos.length > 0 ? (
                              <>
                                <img
                                  src={photos[currentPhotoIndex]}
                                  alt={`${user.name} photo ${currentPhotoIndex + 1}`}
                                  className="w-full h-full object-cover transition-transform duration-300"
                                  loading="lazy"
                                />
                                {/* Photo counter */}
                                <div className="absolute top-3 right-3 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                  {currentPhotoIndex + 1} / {photos.length}
                                </div>
                                
                                {/* Navigation buttons */}
                                {hasMultiplePhotos && (
                                  <>
                                    <button
                                      onClick={prevPhoto}
                                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white bg-opacity-70 hover:bg-opacity-100 rounded-full flex items-center justify-center text-gray-800 font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md z-10"
                                      title="Previous photo"
                                    >
                                      ‹
                                    </button>
                                    <button
                                      onClick={nextPhoto}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white bg-opacity-70 hover:bg-opacity-100 rounded-full flex items-center justify-center text-gray-800 font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md z-10"
                                      title="Next photo"
                                    >
                                      ›
                                    </button>
                                  </>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-400 to-pink-500 text-white">
                                <i className="fa-solid fa-user text-4xl"></i>
                              </div>
                            )}
                          </div>

                          {/* Card Content */}
                          <div className="px-4 pb-4 space-y-3 flex flex-col flex-1">
                            {/* User Info */}
                            <div className="space-y-2 flex-shrink-0">
                              <div>
                                <h3 className="font-bold text-gray-900 text-base">
                                  {user.name}, {user.age}
                                  {user.isPhotoVerified && (
                                    <i className="fa-solid fa-circle-check text-blue-500 text-sm ml-2" title="Verified"></i>
                                  )}
                                </h3>
                                {user.location && (
                                  <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                                    <i className="fa-solid fa-location-dot text-red-500 text-xs"></i>
                                    <span>{user.location}</span>
                                  </p>
                                )}
                              </div>

                              {user.bio && (
                                <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">{user.bio}</p>
                              )}

                              {/* Interests */}
                              {user.interests && user.interests.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1 flex-shrink-0">
                                  {user.interests.slice(0, 3).map((interest, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-semibold rounded-full hover:bg-red-100 transition-colors">
                                      {interest}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2 border-t border-gray-100 flex-shrink-0 mt-auto">
                              <button
                                onClick={() => setSelectedUserProfile(user)}
                                className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md font-semibold hover:bg-gray-200 transition-all duration-200 text-xs"
                                title="View full profile"
                              >
                                Profile
                              </button>
                              <button
                                onClick={() => navigate(`/chat/${user.id}`, { state: { matchedProfile: user } })}
                                className="flex-1 px-3 py-1.5 bg-red-500 text-white rounded-md font-semibold hover:bg-red-600 transition-all duration-200 text-xs shadow-sm hover:shadow-md"
                                title="Send message"
                              >
                                Message
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Loading Indicator - Shows when scrolling loads more */}
                  {isLoadingMore && (
                    <div className="flex justify-center py-8 w-full">
                      <div className="text-center">
                        <div className="w-8 h-8 border-4 border-red-200 border-t-red-500 rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm text-gray-500 font-medium">Loading more profiles...</p>
                      </div>
                    </div>
                  )}

                  {/* End of results */}
                  {!discoverySearch && displayedProfiles.length > 0 && !hasMoreProfiles && (
                    <div className="text-center py-8 text-gray-500 w-full">
                      <p className="text-sm font-semibold">You've reached the end of suggestions</p>
                      <p className="text-xs mt-2">Try searching or check back later for more</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          // Chat Messages
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3 md:px-16 md:py-8 space-y-4 md:space-y-6 w-full chat-messages relative whatsapp-chat-background min-h-0"
            style={{
              paddingBottom: `calc(80px + env(safe-area-inset-bottom, 16px))`,
            }}
>
            {/* Content Layer */}
            <div className="relative z-10 w-full md:max-w-2xl md:mx-auto space-y-3 md:space-y-4 px-2 md:px-4">
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                const isEditing = editingMessageId === msg.id;

                return (
                  <div 
                    id={`msg-${msg.id}`}
                    key={msg.id} 
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`flex items-center gap-2 w-full group ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {isMe && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity order-first mr-2">
                          <button
                            onClick={() => handleEditMessage(msg.id, msg.text)}
                            className="p-2 text-gray-400 hover:text-blue-500 text-sm transition-colors"
                            title="Edit message"
                          >
                            <i className="fa-solid fa-pen-nib"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-2 text-gray-400 hover:text-red-500 text-sm transition-colors"
                            title="Delete message"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      )}

                     <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-md relative break-words max-w-[65%] md:max-w-[55%] ${
                        isMe ? 'bg-green-100 text-gray-900 rounded-br-none' : `bg-white text-gray-800 rounded-bl-none border ${!msg.isRead ? 'border-2 border-blue-300 bg-blue-50' : 'border border-gray-300'}`
                        } ${msg.isFlagged ? 'border-2 border-amber-400 bg-amber-50 text-amber-900' : ''} ${
                        isEditing ? 'ring-2 ring-blue-400 border-transparent w-full shadow-lg' : ''
                      }`}>
                        {isEditing ? (
                          <div className="flex flex-col gap-3 min-w-[280px]">
                            <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                              <i className="fa-solid fa-pen-to-square"></i> Edit message
                            </div>
                            <textarea
                              className="w-full bg-white text-gray-800 p-3 rounded-xl border border-blue-100 focus:outline-none text-sm resize-none"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              rows={3}
                              autoFocus
                            />
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() => {
                                  setEditingMessageId(null);
                                  setEditText('');
                                }}
                                className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleEditMessage(msg.id, msg.text)}
                                className="bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-transform"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                           {msg.text && <p className="leading-relaxed font-normal text-sm whitespace-pre-wrap break-words m-0">{msg.text}</p>}

                            {msg.media && (
                              <div className="mt-2">
                                <MediaRenderer media={msg.media} isMe={isMe} messageId={msg.id} />
                              </div>
                            )}

                            {msg.isEdited && !msg.isEditedByModerator && (
                              <div className={`mt-2 pt-2 border-t text-[9px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                                isMe ? 'border-green-200 text-green-600' : 'border-gray-200 text-gray-500'
                              }`}>
                                <i className="fa-solid fa-pen-nib text-[8px]"></i>
                                edited
                              </div>
                            )}

                            {msg.isEditedByModerator && (
                              <div className={`mt-2 pt-2 border-t flex items-center gap-1.5 ${isMe ? 'border-green-200' : 'border-gray-100'}`}>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                  isMe ? 'bg-green-200 text-green-800' : 'bg-blue-50 text-blue-600'
                                }`}>
                                  <i className="fa-solid fa-user-shield text-[8px]"></i>
                                  Modified by Moderator
                                </span>
                              </div>
                            )}

                            {msg.isFlagged && (
                              <div className={`mt-2 pt-2 border-t text-[10px] font-bold flex items-center gap-1.5 italic ${
                                isMe ? 'border-green-200 text-green-700' : 'border-amber-200 text-amber-700'
                              }`}>
                                <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
                                Community Standard Review Pending
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`text-[9px] mt-0.5 font-semibold flex items-center gap-1 ${isMe ? 'text-green-600 self-end mr-1' : 'text-gray-400 self-start ml-1'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isMe && (
                        <span title={msg.isRead ? `Read at ${new Date(msg.readAt || 0).toLocaleTimeString()}` : 'Not read'}>
                          {msg.isRead ? (
                            <i className="fa-solid fa-check-double text-green-600"></i>
                          ) : (
                            <i className="fa-solid fa-check text-green-400"></i>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Spacer so last message is visible above input/nav */}
              <div aria-hidden="true" style={{ height: 'calc(100px + env(safe-area-inset-bottom, 16px))' }} />

              {/* Typing Indicator */}
              {isOtherUserTyping && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-1 bg-white rounded-2xl rounded-bl-none px-4 md:px-5 py-2.5 md:py-3 border border-gray-300 shadow-sm">
                    <span className="text-xs text-gray-500 font-semibold">{chatUser?.name || 'User'} is typing</span>
                    <div className="flex gap-1.5 ml-1">
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input Area - Fixed at bottom on mobile, relative on desktop */}
        {id && (
        <div
          ref={inputContainerRef}
           className="absolute bottom-0 left-0 right-0 z-20 md:px-16"
           style={{
           padding: 'calc(8px + env(safe-area-inset-bottom, 0px)) 8px 8px 8px',
          }}
        >
          <div className="flex items-center gap-2 md:gap-3 w-full">
            {/* Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingMedia || isRecordingAudio}
              className="text-gray-600 hover:text-gray-700 text-lg md:text-xl transition-colors active:scale-75 disabled:opacity-50 flex-shrink-0"
              title="Attach file"
            >
              <i className="fa-solid fa-plus-circle"></i>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleMediaUpload}
              accept="image/*,video/*,.pdf,audio/*"
              className="hidden"
              disabled={uploadingMedia}
            />

            {/* Text Input */}
             <div className="flex-1 flex items-center bg-white rounded-full px-4 md:px-5 py-2.5 md:py-3 gap-2 border border-gray-200 shadow-md">
              <input
                ref={inputFieldRef}
                type="text"
                placeholder={isRecordingAudio ? "Recording..." : "Type a message..."}
                className="bg-transparent flex-1 focus:outline-none text-sm md:text-base text-gray-900 placeholder:text-gray-500"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (e.target.value.trim().length > 0) {
                    emitTypingStatus(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isRecordingAudio) {
                    handleSend();
                  }
                }}
                disabled={uploadingMedia || isRecordingAudio}
              />

              {/* Microphone/Send Button */}
              <button
                onClick={() => {
                  if (recordedAudio) {
                    handleSendAudioMessage();
                  } else if (inputText.trim() || selectedMedia) {
                    handleSend();
                  } else if (isRecordingAudio) {
                    handleStopAudioRecording();
                  } else {
                    handleStartAudioRecording();
                  }
                }}
                className={`text-lg md:text-xl transition-colors active:scale-75 flex-shrink-0 ${
                  (inputText.trim() || selectedMedia || recordedAudio)
                    ? 'text-green-500 hover:text-green-600'
                    : isRecordingAudio
                    ? 'text-red-500 animate-pulse hover:text-red-600'
                    : 'text-gray-600 hover:text-gray-700'
                }`}
                disabled={!chatId || uploadingMedia}
                title={recordedAudio ? 'Send audio' : inputText.trim() || selectedMedia ? 'Send message' : 'Record audio'}
              >
                <i className={`fa-solid ${
                  recordedAudio ? 'fa-check' : (inputText.trim() || selectedMedia) ? 'fa-paper-plane' : 'fa-microphone'
                }`}></i>
              </button>
            </div>
          </div>

          {/* Upload Progress */}
          {uploadingMedia && (
            <div className="mt-2 text-[10px] md:text-xs text-green-600 font-semibold flex items-center gap-2">
              <div className="w-2 h-2 md:w-3 md:h-3 border-2 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
              Uploading...
            </div>
          )}
        </div>
        )}

        {/* User Profile Modal */}
        {showUserProfile && chatUser && (
          <UserProfileModal
            user={chatUser}
            onClose={() => setShowUserProfile(false)}
          />
        )}
        
        {/* Selected User Profile Modal */}
        {selectedUserProfile && (
          <UserProfileModal
            user={selectedUserProfile}
            onClose={() => setSelectedUserProfile(null)}
          />
        )}
      </div>
    </>
  );
};

export default ChatRoom;