
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { UserProfile, Message, UserRole, MediaFile } from '../types';
import apiClient from '../services/apiClient';
import { useAlert } from '../services/AlertContext';
import { useWebSocket } from '../services/useWebSocket';
import MediaRenderer from './MediaRenderer';
import VideoCallRoom from './VideoCallRoom';
import VerificationBadge from './VerificationBadge';
import UserProfileModal from './UserProfileModal';
import { createAudioRecorder, formatAudioDuration, AudioRecording } from '../services/AudioRecorder';

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
  const [inCall, setInCall] = useState(false);
  const [callIsVideo, setCallIsVideo] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<AudioRecording | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputFieldRef = useRef<HTMLInputElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRecorderRef = useRef(createAudioRecorder());
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isModerator = currentUser.role === UserRole.MODERATOR || currentUser.role === UserRole.ADMIN;

  // Set up WebSocket for typing indicators
  const handleTypingIndicator = (data: any) => {
    if (data.chatId === chatId && data.userId !== currentUser.id) {
      console.log('[DEBUG ChatRoom] Received typing indicator:', data.isTyping);
      setIsOtherUserTyping(data.isTyping);
    }
  };

  const { sendTypingStatus, ws } = useWebSocket(currentUser.id, null, handleTypingIndicator);

  // Handle keyboard visibility on mobile - scroll to bottom when keyboard shows/hides
  useEffect(() => {
    const inputElement = inputFieldRef.current;
    if (!inputElement) return;

    const handleFocus = () => {
      // When keyboard appears, scroll messages up slightly to show input
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    };

    const handleBlur = () => {
      // When keyboard closes, scroll messages back down
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

  // Debounced typing status - emits typing status every 1 second while typing
  const emitTypingStatus = async (isTyping: boolean) => {
    if (!chatId) return;
    
    // Clear any pending typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setIsUserTyping(isTyping);

    if (isTyping) {
      // Send typing status via WebSocket
      if (sendTypingStatus) {
        sendTypingStatus(chatId, true);
        console.log('[DEBUG ChatRoom] Sent typing status: true');
      }
      
      // Set timeout to mark typing as finished after 3 seconds of inactivity
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

    // File size check (100MB max)
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

      // Update duration every second
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
      
      // Create a File from the blob
      const audioFile = new File(
        [recordedAudio.blob],
        `audio-${Date.now()}.webm`,
        { type: recordedAudio.mimeType }
      );

      console.log('[DEBUG ChatRoom] Uploading audio message:', audioFile.name);
      const result = await apiClient.uploadChatMedia(chatId, audioFile);

      if (result.success && result.media) {
        // Send as media message
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
          console.error('[ERROR ChatRoom] No ID provided in route');
          return;
        }

        setLoading(true);
        console.log('[DEBUG ChatRoom] Loading chat/partner for ID:', id);

        // First try to treat `id` as an existing chatId
        let chatData = null;
        try {
          chatData = await apiClient.getChat(id);
          console.log('[DEBUG ChatRoom] Loaded chat by chatId:', chatData.id);
        } catch (err: any) {
          // If not found, treat `id` as otherUserId and create-or-get chat
          console.log('[DEBUG ChatRoom] Not a chatId, attempting createOrGet with userId:', id);
          chatData = await apiClient.createOrGetChat(id);
          console.log('[DEBUG ChatRoom] Chat created/retrieved successfully via createOrGet:', chatData.id);
        }

        if (!chatData || !chatData.id) {
          throw new Error('Chat creation/lookup returned no ID');
        }

        setChatId(chatData.id);
        setMessages(chatData.messages || []);

        // Mark all messages as read when opening the chat (clears unread counter)
        try {
          await apiClient.markAllMessagesAsRead(chatData.id);
          console.log('[DEBUG ChatRoom] Marked all messages as read for chat:', chatData.id);
        } catch (err) {
          console.warn('[WARN ChatRoom] Failed to mark messages as read:', err);
        }

        // Get the other user's profile from route state or fetch it
        if ((location.state as any)?.matchedProfile) {
          console.log('[DEBUG ChatRoom] Using matched profile from state:', (location.state as any).matchedProfile.name);
          setChatUser((location.state as any).matchedProfile);
        } else {
          // Fetch user profile by ID
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

    // Poll immediately and then every 2 seconds
    pollMessages();
    pollIntervalRef.current = setInterval(pollMessages, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [chatId]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, isOtherUserTyping]);

  // Mark unread messages as read
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

    // Global economy check: Standard users pay 1 coin per message
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

      // Send message to backend
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

      // Deduct coin if not premium
      if (!currentUser.isPremium) {
        onDeductCoin();
      }

      // Wait a moment for the database write to complete before fetching
      await new Promise(resolve => setTimeout(resolve, 500));

      // Refresh messages to include the new one
      const chatData = await apiClient.getChat(chatId);
      console.log('[DEBUG ChatRoom] Refreshed chat data after send, messages count:', chatData.messages?.length || 0);
      setMessages(chatData.messages || []);
    } catch (err: any) {
      console.error('[ERROR ChatRoom] Failed to send message:', err);
      console.error('[ERROR ChatRoom] Response status:', err.response?.status);
      console.error('[ERROR ChatRoom] Response data:', err.response?.data);
      showAlert('Error', 'Failed to send message: ' + (err.message || 'Unknown error'));
      setInputText(inputText); // Restore the original message text
    }
  };

  const handleEditMessage = async (messageId: string, oldText: string) => {
    if (editingMessageId === messageId) {
      // Save edit
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
      // Start editing
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

  return (
    <div className="flex flex-col w-full h-full bg-white md:bg-[#f0f2f5]">
      {/* Header */}
      <div className="bg-white border-b px-3 md:px-6 py-2 md:py-4 flex items-center gap-2 md:gap-4 flex-shrink-0 shadow-sm z-20 safe-area-top">
        <button onClick={() => navigate('/chats')} className="md:hidden text-gray-500 hover:text-red-500 transition-colors text-lg">
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        {chatUser && (
          <>
            <button
              onClick={() => setShowUserProfile(true)}
              className="flex items-center gap-2 md:gap-4 flex-1 min-w-0 hover:bg-gray-50 rounded-lg p-1 -m-1 transition-colors"
            >
              <img src={chatUser.images?.[0] || 'https://via.placeholder.com/100'} className="w-11 h-11 rounded-full border border-gray-100 shadow-sm object-cover" alt="User" />
              <div className="flex-1 min-w-0 text-left">
                <h3 className="font-bold text-gray-900 text-lg leading-tight truncate flex items-center gap-2">
                  {chatUser.name}
                  <VerificationBadge verified={chatUser.isPhotoVerified || (chatUser as any).photoVerificationStatus === 'approved'} size="sm" />
                </h3>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Active Now</span>
                </div>
              </div>
            </button>
          </>
        )}
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => { if (chatUser) { setConfirmCall({ isVideo: false }); } }}
                title="Voice call"
                className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-200 shadow-sm"
              >
                <i className="fa-solid fa-phone"></i>
              </button>
              <button
                onClick={() => { if (chatUser) { setConfirmCall({ isVideo: true }); } }}
                title="Video call"
                className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-200 shadow-sm"
              >
                <i className="fa-solid fa-video"></i>
              </button>
              <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 shadow-sm">
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
                  //send calls incooming notification
                  if (ws && chatUser) {
                    ws.send(JSON.stringify({
                      type: 'call_incoming',
                      to: chatUser.id,
                      fromName: currentUser.name || currentUser.username,
                       isVideo: confirmCall.isVideo,
                       chatId: chatId
                       }));
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

          

      {/* Video call room (renders full-screen when inCall=true) */}
      {inCall && chatUser && (
        <VideoCallRoom
          currentUser={currentUser}
          otherUser={chatUser}
          otherUserId={chatUser.id}
          isInitiator={true}
          isVideo={callIsVideo}
          onCallEnd={() => {
            setInCall(false);
            // Send call end notification
            ws?.send(JSON.stringify({
              type: 'call_end',
              to: chatUser.id
            }));
          }}
        />
      )}

      {/* Messages */}

      {/* Messages */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-500 text-sm">Loading conversation...</p>
          </div>
        </div>
      ) : (
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 md:p-8 space-y-6 bg-white md:bg-[#f0f2f5] w-full chat-messages"
        style={{ paddingBottom: `calc(88px + env(safe-area-inset-bottom, 16px))` }}
      >
        <div className="w-full md:max-w-4xl md:mx-auto space-y-6">
            {messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const isEditing = editingMessageId === msg.id;

            return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 max-w-[85%] md:max-w-[70%] group">
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
                    
                    <div className={`rounded-2xl px-5 py-3 text-sm shadow-sm relative ${
                    isMe ? 'bg-red-500 text-white rounded-tr-none' : `bg-white text-gray-800 rounded-tl-none border ${!msg.isRead ? 'border-2 border-blue-300 bg-blue-50' : 'border border-gray-100'}`
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
                        <>
                        {msg.text && <div className="leading-relaxed font-medium">{msg.text}</div>}
                        
                        {msg.media && (
                          <div className="mt-2">
                            <MediaRenderer media={msg.media} isMe={isMe} messageId={msg.id} />
                          </div>
                        )}
                        
                        {msg.isEdited && !msg.isEditedByModerator && (
                            <div className={`mt-2 pt-2 border-t text-[9px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                                isMe ? 'border-white/10 text-white/70' : 'border-gray-100 text-gray-500'
                            }`}>
                                <i className="fa-solid fa-pen-nib text-[8px]"></i>
                                edited
                            </div>
                        )}
                        
                        {msg.isEditedByModerator && (
                            <div className={`mt-2 pt-2 border-t flex items-center gap-1.5 ${isMe ? 'border-white/10' : 'border-gray-50'}`}>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                isMe ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                            }`}>
                                <i className="fa-solid fa-user-shield text-[8px]"></i>
                                Modified by Moderator
                            </span>
                            </div>
                        )}

                        {msg.isFlagged && (
                            <div className="mt-2 pt-2 border-t border-amber-200 text-[10px] font-bold flex items-center gap-1.5 text-amber-700 italic">
                            <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
                            Community Standard Review Pending
                            </div>
                        )}
                        </>
                    )}
                    </div>
                </div>
                <div className={`text-[9px] mt-1.5 font-bold tracking-tighter text-gray-400 uppercase flex items-center gap-2 ${isMe ? 'mr-1' : 'ml-1'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMe && (
                      <span title={msg.isRead ? `Read at ${new Date(msg.readAt || 0).toLocaleTimeString()}` : 'Not read'}>
                        {msg.isRead ? (
                          <i className="fa-solid fa-check-double text-blue-500"></i>
                        ) : (
                          <i className="fa-solid fa-check text-gray-300"></i>
                        )}
                      </span>
                    )}
                </div>
                </div>
            );
            })}

            {/* Spacer so last message is visible above input/nav */}
            <div aria-hidden="true" style={{ height: 'calc(88px + env(safe-area-inset-bottom, 16px))' }} />

            {/* Typing Indicator */}
            {isOtherUserTyping && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-1 bg-white rounded-2xl rounded-tl-none px-5 py-3 border border-gray-100 shadow-sm">
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

      {/* Input Area */}
      <div ref={inputContainerRef} className="bg-white border-t p-2 md:p-6 flex-shrink-0 w-full" style={{ paddingBottom: `max(0.5rem, env(safe-area-inset-bottom))` }}>
        {/* Media Preview */}
        {selectedMedia && (
          <div className="mb-2 w-full md:max-w-4xl md:mx-auto">
            <div className="relative inline-block w-full">
              <div className="rounded-lg overflow-hidden border-2 border-red-300 bg-red-50 p-2 md:p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    {selectedMedia.type === 'image' && (
                      <>
                        <img src={selectedMedia.url} alt="preview" className="max-h-36 rounded-lg" />
                        <p className="text-xs text-gray-600 font-semibold mt-2 truncate">{selectedMedia.name}</p>
                      </>
                    )}
                    {selectedMedia.type === 'video' && (
                      <>
                        <video className="max-h-36 rounded-lg bg-black" controls={false}>
                          <source src={selectedMedia.url} type={selectedMedia.mimetype} />
                        </video>
                        <p className="text-xs text-gray-600 font-semibold mt-2 truncate">{selectedMedia.name}</p>
                      </>
                    )}
                    {(selectedMedia.type === 'pdf' || selectedMedia.type === 'file') && (
                      <>
                        <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg">
                          <i className={`fa-solid ${selectedMedia.type === 'pdf' ? 'fa-file-pdf text-red-500' : 'fa-file text-gray-500'} text-xl`}></i>
                          <div>
                            <p className="text-xs text-gray-600 font-semibold truncate">{selectedMedia.name}</p>
                            <p className="text-[10px] text-gray-500">{(selectedMedia.size / 1024 / 1024).toFixed(1)} MB</p>
                          </div>
                        </div>
                      </>
                    )}
                    {selectedMedia.type === 'audio' && (
                      <>
                        <div className="flex items-center gap-2 bg-blue-100 p-3 rounded-lg">
                          <i className="fa-solid fa-music text-blue-600 text-xl"></i>
                          <div>
                            <p className="text-xs text-gray-700 font-semibold truncate">{selectedMedia.name}</p>
                            <p className="text-[10px] text-gray-600">Ready to send</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleRemoveMedia}
                    className="text-gray-400 hover:text-red-600 text-lg transition-colors flex-shrink-0"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recorded Audio Preview */}
        {recordedAudio && (
          <div className="mb-2 w-full md:max-w-4xl md:mx-auto">
            <div className="relative inline-block w-full">
              <div className="rounded-lg overflow-hidden border-2 border-blue-300 bg-blue-50 p-2 md:p-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-blue-200">
                      <i className="fa-solid fa-microphone text-blue-600 text-lg flex-shrink-0"></i>
                      <div className="flex-1">
                        <p className="text-xs text-gray-700 font-semibold">Audio Message</p>
                        <p className="text-[10px] text-gray-600">{formatAudioDuration(Math.round(recordedAudio.duration / 1000))}</p>
                      </div>
                      <audio 
                        src={URL.createObjectURL(recordedAudio.blob)} 
                        controls 
                        className="h-8 max-w-[120px]"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleDiscardAudio}
                    className="text-gray-400 hover:text-red-600 text-lg transition-colors flex-shrink-0"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recording Duration Display */}
        {isRecordingAudio && (
          <div className="mb-2 w-full md:max-w-4xl md:mx-auto">
            <div className="rounded-lg border-2 border-red-300 bg-red-50 p-3 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-circle text-red-500 animate-pulse text-sm"></i>
                <span className="text-sm font-bold text-red-600">Recording</span>
              </div>
              <div className="flex-1"></div>
              <span className="text-sm font-bold text-red-600 font-mono">{formatAudioDuration(recordingDuration)}</span>
            </div>
          </div>
        )}

        <div className="w-full flex items-center gap-3 md:gap-4 bg-white md:shadow-2xl md:rounded-3xl p-3 md:p-4 border md:border-gray-100 border-none md:max-w-4xl md:mx-auto">
            <div className="hidden sm:flex flex-col items-center">
              <i className="fa-solid fa-coins text-amber-500 text-xs"></i>
              <span className="text-[8px] font-black text-amber-700">-1</span>
            </div>
            
            {/* File Upload Button */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingMedia || isRecordingAudio}
              className="text-gray-400 hover:text-blue-500 text-lg md:text-2xl px-1 md:px-2 transition-transform active:scale-90 disabled:opacity-50"
              title="Attach file (photo, video, PDF, etc.)"
            >
              <i className="fa-solid fa-paperclip"></i>
            </button>

            {/* Audio Recording Button */}
            <button 
              onClick={isRecordingAudio ? handleStopAudioRecording : handleStartAudioRecording}
              disabled={uploadingMedia || recordedAudio !== null}
              className={`text-lg md:text-2xl px-1 md:px-2 transition-transform active:scale-90 disabled:opacity-50 ${
                isRecordingAudio 
                  ? 'text-red-500 animate-pulse' 
                  : 'text-gray-400 hover:text-red-500'
              }`}
              title={isRecordingAudio ? 'Stop recording' : 'Record audio message'}
            >
              <i className="fa-solid fa-microphone"></i>
            </button>

            <input 
              ref={fileInputRef}
              type="file" 
              onChange={handleMediaUpload}
              accept="image/*,video/*,.pdf,audio/*"
              className="hidden"
              disabled={uploadingMedia}
            />

            {uploadingMedia && (
              <div className="text-xs text-blue-600 font-semibold flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                Uploading...
              </div>
            )}
            
            <div className="flex-1 bg-gray-50 rounded-2xl px-4 md:px-5 py-2 md:py-3 flex items-center border border-gray-100">
                <input 
                    ref={inputFieldRef}
                    type="text" 
                    placeholder={isRecordingAudio ? "Recording audio..." : "Type a message..."} 
                    className="bg-transparent w-full focus:outline-none text-sm md:text-base text-gray-800 placeholder:text-gray-400"
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      // Emit typing status
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
            </div>
            <button 
                onClick={recordedAudio ? (() => handleSendAudioMessage()) : handleSend}
                className="w-12 h-12 rounded-2xl spark-gradient text-white flex items-center justify-center shadow-lg hover:shadow-red-500/20 active:scale-95 transition-all disabled:grayscale disabled:opacity-30"
                disabled={!chatId || (!inputText.trim() && !selectedMedia && !recordedAudio) || uploadingMedia || isRecordingAudio}
                title={!chatId ? 'Loading chat...' : recordedAudio ? 'Send audio message' : 'Send message'}
            >
                <i className={`fa-solid ${recordedAudio ? 'fa-check' : 'fa-paper-plane'} text-lg`}></i>
            </button>
        </div>
      </div>

      {/* User Profile Modal */}
      {showUserProfile && chatUser && (
        <UserProfileModal
          user={chatUser}
          onClose={() => setShowUserProfile(false)}
        />
      )}
    </div>
  );
};

export default ChatRoom;
