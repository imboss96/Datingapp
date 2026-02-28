import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../services/apiClient';
import { useWebSocketContext } from '../services/WebSocketProvider';
import '../styles/whatsapp-background.css';

interface User {
  id: string;
  username: string;
  name: string;
  avatar?: string;
  role?: string;
  verificationStatus?: string;
}

interface ModerationAction {
  id: string;
  userId: string;
  action: 'warn' | 'ban' | 'block' | 'report' | 'flag' | 'timeout' | 'mute';
  reason: string;
  timestamp: number;
  moderatorId: string;
  duration?: number;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isFlagged?: boolean;
  flagReason?: string;
  isEditedByModerator?: boolean;
  isDeleted?: boolean;
  deletedAt?: number;
}

interface ModeratorChat {
  id: string;
  participants: string[];
  participantDetails?: User[];
  messages: Message[];
  lastUpdated: number;
  flaggedCount: number;
}

interface Props {
  chat: ModeratorChat;
  currentUserId: string;
  onClose: () => void;
  onRefresh: () => void;
}

const ChatModerationView: React.FC<Props> = ({ chat, currentUserId, onClose, onRefresh }) => {
  const [messages, setMessages] = useState<Message[]>(chat.messages || []);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [actionPanel, setActionPanel] = useState<'NONE' | 'MESSAGE' | 'USER'>('NONE');
  const [actionReason, setActionReason] = useState('');
  const [actionType, setActionType] = useState<'warn' | 'ban' | 'block' | 'report' | 'flag' | 'timeout' | 'mute'>('warn');
  const [isSendingAction, setIsSendingAction] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [moderatorCoins, setModeratorCoins] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WebSocket for real-time updates (moderator registers as separate client)
  const { addMessageHandler } = useWebSocketContext();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Register WebSocket handler
  useEffect(() => {
    // Register WebSocket message handler for real-time new_message events
    const unregister = addMessageHandler((data: any) => {
      try {
        if (data && data.type === 'new_message' && data.chatId === chat.id) {
          // Append message if not present
          setMessages(prev => {
            const exists = prev.find(m => m.id === data.message.id);
            if (exists) return prev;
            return [...prev, data.message].sort((a, b) => a.timestamp - b.timestamp);
          });
        }
      } catch (err) {
        console.error('[WS Handler] Error handling message:', err);
      }
    });
    return () => {
      try { unregister(); } catch (e) { /* ignore */ }
    };
  }, [addMessageHandler, chat.id]);

  // Fetch messages in real-time
  useEffect(() => {
    const refreshMessages = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/chats/${chat.id}`);
        if (response.messages) {
          setMessages(response.messages);
        }
        // Fetch user details
        const userMap = new Map(users);
        for (const userId of chat.participants) {
          if (!userMap.has(userId)) {
            try {
              const userData = await apiClient.get(`/users/${userId}`);
              userMap.set(userId, userData);
            } catch (err) {
              // User not found, use placeholder
              userMap.set(userId, { id: userId, username: userId, name: 'Unknown User' });
            }
          }
        }
        setUsers(userMap);
      } catch (error) {
        console.error('[ERROR ChatModerationView] Failed to load messages:', error);
      } finally {
        setLoading(false);
      }
    };

    refreshMessages();
    const interval = setInterval(refreshMessages, 5000); // Refresh every 5 seconds
    return () => {
      clearInterval(interval);
    };
  }, [chat.id]);

  const handleFlagMessage = async (message: Message) => {
    if (!message.isFlagged) {
      try {
        setIsSendingAction(true);
        await apiClient.put(`/chats/${chat.id}/messages/${message.id}/flag`, {
          flagReason: actionReason || 'Flagged by moderator'
        });
        setMessages(messages.map(m => m.id === message.id ? { ...m, isFlagged: true, flagReason: actionReason } : m));
        setSuccessMessage('Message flagged successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (error) {
        console.error('Error flagging message:', error);
      } finally {
        setIsSendingAction(false);
      }
    } else {
      // Unflag
      try {
        setIsSendingAction(true);
        await apiClient.put(`/chats/${chat.id}/messages/${message.id}/flag`, {
          flagReason: undefined
        });
        setMessages(messages.map(m => m.id === message.id ? { ...m, isFlagged: false, flagReason: undefined } : m));
        setSuccessMessage('Message unflagged successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (error) {
        console.error('Error unflagging message:', error);
      } finally {
        setIsSendingAction(false);
      }
    }
  };

  const handleDeleteMessage = async (message: Message) => {
    if (confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      try {
        setIsSendingAction(true);
        await apiClient.delete(`/chats/${chat.id}/messages/${message.id}`);
        setMessages(messages.map(m => m.id === message.id ? { ...m, isDeleted: true, deletedAt: Date.now() } : m));
        setSuccessMessage('Message deleted successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (error) {
        console.error('Error deleting message:', error);
      } finally {
        setIsSendingAction(false);
      }
    }
  };

  const handleUserAction = async (userId: string, action: string, reason: string) => {
    try {
      setIsSendingAction(true);
      await apiClient.post(`/moderation/user-action`, {
        userId,
        action,
        reason,
        chatId: chat.id,
        moderatorId: currentUserId,
        duration: action === 'timeout' ? 3600000 : undefined // 1 hour timeout by default
      });
      setSuccessMessage(`User ${action} successful`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error(`Error ${action} user:`, error);
    } finally {
      setIsSendingAction(false);
    }
  };

  const getMessageUserInfo = (userId: string) => {
    return users.get(userId) || { id: userId, username: userId, name: 'Unknown User' };
  };

  const handleSendReply = async () => {
    if (!replyText.trim() && !selectedMedia) return;

    try {
      setIsSendingReply(true);
      
      // Send message as the operator (recipient) to the client (initiator)
      const payload: any = {
        recipientId: operatorId, // Send as the operator/recipient
        text: replyText.trim(),
      };

      // Include media if attached
      if (selectedMedia) {
        payload.media = selectedMedia;
      }

      const response = await apiClient.post(`/moderation/send-response/${chat.id}`, payload);

      if (response.success) {
        const newMessage: Message = {
          id: response.message.id,
          senderId: operatorId,
          text: replyText.trim(),
          timestamp: response.message.timestamp,
          isFlagged: false,
          media: selectedMedia || undefined,
        };

        // Add to local messages
        setMessages(prev => [...prev, newMessage].sort((a, b) => a.timestamp - b.timestamp));
        
        // Clear input and media
        setReplyText('');
        setSelectedMedia(null);
        
        // Increment moderator coins (0.1 per reply)
        setModeratorCoins(prev => prev + 0.1);
        
        // Show success
        setSuccessMessage('Reply sent on behalf of ' + operatorProfile?.name);
        setTimeout(() => setSuccessMessage(null), 3000);

        // Scroll to bottom
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error: any) {
      let errorMsg = 'Failed to send reply';
      
      // Error from fetch-based apiClient
      if (error instanceof Error) {
        if (error.message.includes('Moderator access required')) {
          errorMsg = 'Access denied: Moderator authorization required';
        } else if (error.message.includes('Chat not found')) {
          errorMsg = 'Chat not found';
        } else if (error.message.includes('Recipient is not a participant')) {
          errorMsg = 'Recipient is not a participant in this chat';
        } else {
          errorMsg = 'Error: ' + error.message;
        }
      } else if (error?.response?.data?.error) {
        // Error from axios (if apiClient changes)
        errorMsg += ': ' + error.response.data.error;
      }
      
      setSuccessMessage('✗ ' + errorMsg);
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Check file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      setSuccessMessage('File size exceeds 100MB limit');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    try {
      setUploadingMedia(true);

      // Upload media using apiClient same as ChatRoom
      const result = await apiClient.uploadChatMedia(chat.id, file);

      if (result.success && result.media) {
        setSelectedMedia(result.media);
        setSuccessMessage(`Media attached: ${file.name}`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setSuccessMessage('Failed to upload media');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error uploading media:', error);
      setSuccessMessage('Failed to upload media - ' + (error instanceof Error ? error.message : 'Unknown error'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setUploadingMedia(false);
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

  // Get client and operator profiles
  const clientId = chat.participants[0]; // Person who initiated chat (John)
  const operatorId = chat.participants[1]; // Person intended to receive (Profile X)
  const clientProfile = users.get(clientId) || { id: clientId, username: clientId, name: 'User' };
  const operatorProfile = users.get(operatorId) || { id: operatorId, username: operatorId, name: 'User' };

  const renderProfilePhotos = (userImages: any) => {
    if (Array.isArray(userImages) && userImages.length > 0) {
      return userImages.slice(0, 4).map((img, i) => (
        <img key={i} src={img} alt={`Profile ${i + 1}`} className="w-full h-28 rounded-lg object-cover" />
      ));
    }
    return Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="w-full h-28 bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg flex items-center justify-center text-gray-600 text-xs font-semibold">
        No photo
      </div>
    ));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center p-2 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-screen h-screen max-w-full max-h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <i className="fa-solid fa-shield-halved"></i>
              Moderator Portal - Unreplied Chat
            </h2>
            <p className="text-indigo-100 text-xs mt-1">Chat ID: {chat.id} • {messages.length} messages • Moderating: <strong>{clientProfile.name}</strong> → <strong>{operatorProfile.name}</strong></p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Coins Section */}
            <div className="bg-indigo-500/60 backdrop-blur-sm rounded-lg px-4 py-2 flex flex-col items-center border border-indigo-400/50">
              <p className="text-xs font-bold text-indigo-100 uppercase tracking-wide">Coins Earned</p>
              <div className="flex items-center gap-2 mt-1">
                <i className="fa-solid fa-coins text-yellow-300 text-lg"></i>
                <span className="text-2xl font-black text-yellow-300">${moderatorCoins.toFixed(2)}</span>
              </div>
              <p className="text-xs text-indigo-200 mt-1">+$0.1 per reply</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={onRefresh}
                disabled={loading}
                className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
              >
                <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>
              <button
                onClick={onClose}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-sm transition-colors"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden gap-3 p-3 bg-gray-50">
          {/* Left Panel - Operator (Intended Recipient) */}
          <div className="w-72 flex flex-col border border-gray-300 rounded-lg bg-white overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 border-b border-indigo-300 p-3 text-center text-white">
              <p className="text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2"><i className="fa-solid fa-user"></i> Recipient (Operator)</p>
              <p className="text-xs text-indigo-100 mt-1">Who moderator is replying as</p>
            </div>
            
            {/* Photos */}
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                <i className="fa-solid fa-images text-indigo-500"></i>
                Profile Photos
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                {renderProfilePhotos(operatorProfile?.images)}
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Full Name</p>
                <p className="text-gray-900 font-bold text-base">{operatorProfile?.name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Username</p>
                <p className="text-gray-700 font-mono text-xs break-all bg-gray-100 p-2 rounded">{operatorProfile?.username}</p>
              </div>
              {operatorProfile?.age && (
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Age</p>
                  <p className="text-gray-900">{operatorProfile.age}</p>
                </div>
              )}
              {operatorProfile?.location && (
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1"><i className="fa-solid fa-location-dot text-indigo-600"></i>Location</p>
                  <p className="text-gray-900">{operatorProfile.location}</p>
                </div>
              )}
              {operatorProfile?.bio && (
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Bio</p>
                  <p className="text-gray-700 text-xs italic">{operatorProfile.bio}</p>
                </div>
              )}
              <div className="pt-2 border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {operatorProfile?.isPhotoVerified && (
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                      <i className="fa-solid fa-check-circle"></i> Verified
                    </span>
                  )}
                  {operatorProfile?.isPremium && (
                    <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold">
                      <i className="fa-solid fa-crown"></i> Premium
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Center Panel - Messages */}
          <div className="flex-1 flex flex-col border border-gray-300 rounded-lg bg-white overflow-hidden shadow-sm relative">
            {/* Conversation Header */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-2 flex items-center justify-center gap-2"><i className="fa-solid fa-comments"></i> Message Thread</p>
                </div>
                <div className="text-right text-xs text-gray-600">
                  <p className="font-bold text-lg text-purple-700">
                    {searchQuery ? `${messages.filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase())).length}/${messages.length}` : messages.length}
                  </p>
                  <p>{searchQuery ? 'found' : 'total'} messages</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 whatsapp-chat-background pb-32 relative" ref={messagesEndRef}>
              {/* Search Field Inside Messages */}
              <div className="sticky top-0 z-10 mb-4 flex items-center gap-2 bg-white rounded-full px-4 py-2.5 border border-gray-200 shadow-md">
                <i className="fa-solid fa-search text-purple-600 text-lg flex-shrink-0"></i>
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent flex-1 focus:outline-none text-sm text-gray-900 placeholder:text-gray-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-gray-400 hover:text-gray-600 transition-colors active:scale-75"
                    title="Clear search"
                  >
                    <i className="fa-solid fa-times text-lg flex-shrink-0"></i>
                  </button>
                )}
              </div>

              {(() => {
                const filteredMessages = searchQuery.trim() === '' 
                  ? messages 
                  : messages.filter(msg => 
                      msg.text.toLowerCase().includes(searchQuery.toLowerCase())
                    );

                return filteredMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      {searchQuery.trim() === '' ? (
                        <>
                          <i className="fa-solid fa-message text-4xl mb-2 text-gray-300"></i>
                          <p className="text-sm">No messages yet</p>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-search text-4xl mb-2 text-gray-300"></i>
                          <p className="text-sm">No messages match "{searchQuery}"</p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  filteredMessages.map((msg) => {
                    const sender = getMessageUserInfo(msg.senderId);
                    const isInitiator = msg.senderId === chat.participants[0];
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isInitiator ? 'justify-start' : 'justify-end'} mb-4`}
                      >
                        <div className={`flex flex-col ${isInitiator ? 'items-start' : 'items-end'} max-w-md`}>
                          {/* Sender name label */}
                          <p className={`text-xs font-bold mb-1 px-2 ${isInitiator ? 'text-green-700' : 'text-indigo-700'}`}>
                            {isInitiator ? `${clientProfile?.name} (Client)` : `${operatorProfile?.name} (Recipient)`}
                          </p>
                          {/* Message bubble */}
                          <div className={`flex items-end gap-2 ${isInitiator ? 'flex-row' : 'flex-row-reverse'}`}>
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${
                              isInitiator 
                                ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
                                : 'bg-gradient-to-br from-indigo-400 to-purple-500'
                            }`}>
                              {sender.username?.charAt(0).toUpperCase()}
                            </div>
                            <div className={`rounded-2xl px-4 py-2 break-words shadow-sm ${
                              isInitiator 
                                ? 'bg-green-100 text-gray-900 rounded-bl-none' 
                                : 'bg-indigo-100 text-gray-900 rounded-br-none'
                            }`}>
                              <p className="text-sm font-medium">{msg.text}</p>
                              <p className={`text-xs mt-1.5 font-semibold ${isInitiator ? 'text-green-700' : 'text-indigo-700'}`}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                );
              })()}
            </div>

            {/* Floating Reply Input */}
            <div className="absolute bottom-0 left-0 right-0 z-20 p-3" style={{ padding: 'calc(8px + env(safe-area-inset-bottom, 0px)) 12px 12px 12px' }}>
              <div className="space-y-2">
                {successMessage && (
                  <div className={`text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-2 ${
                    successMessage.includes('sent') || successMessage.includes('successful')
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    <i className={`fa-solid ${successMessage.includes('sent') || successMessage.includes('successful') ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                    {successMessage.replace('✓ ', '').replace('✗ ', '')}
                  </div>
                )}
                {selectedMedia && (
                  <div className="text-xs font-semibold px-3 py-1.5 rounded flex items-center justify-between bg-blue-100 text-blue-700">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-file text-blue-600"></i>
                      <span>{selectedMedia.filename || 'Media attached'}</span>
                    </div>
                    <button
                      onClick={handleRemoveMedia}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Remove media"
                    >
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                )}
                <div className="flex gap-2 items-center bg-white rounded-full px-4 py-2.5 border border-gray-200 shadow-md">
                  {/* Attachment Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingMedia || isSendingReply}
                    className="text-gray-600 hover:text-gray-700 text-lg transition-colors active:scale-75 disabled:opacity-50 flex-shrink-0"
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
                  
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isSendingReply && handleSendReply()}
                    placeholder="Type a message..."
                    disabled={isSendingReply || uploadingMedia}
                    className="bg-transparent flex-1 focus:outline-none text-sm text-gray-900 placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button 
                    onClick={handleSendReply}
                    disabled={isSendingReply || (!replyText.trim() && !selectedMedia)}
                    className={`text-lg transition-colors active:scale-75 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                      (replyText.trim() || selectedMedia)
                        ? 'text-indigo-600 hover:text-indigo-700'
                        : 'text-gray-400'
                    }`}
                  >
                    <i className={`fa-solid fa-paper-plane ${isSendingReply ? 'animate-pulse' : ''}`}></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Client (Initiator) */}
          <div className="w-72 flex flex-col border border-gray-300 rounded-lg bg-white overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 border-b border-green-300 p-3 text-center text-white">
              <p className="text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2"><i className="fa-solid fa-user"></i> Initiator (Client)</p>
              <p className="text-xs text-green-100 mt-1">Who started the conversation</p>
            </div>
            
            {/* Photos */}
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                <i className="fa-solid fa-images text-green-500"></i>
                Profile Photos
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                {renderProfilePhotos(clientProfile?.images)}
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Full Name</p>
                <p className="text-gray-900 font-bold text-base">{clientProfile?.name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Username</p>
                <p className="text-gray-700 font-mono text-xs break-all bg-gray-100 p-2 rounded">{clientProfile?.username}</p>
              </div>
              {clientProfile?.age && (
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Age</p>
                  <p className="text-gray-900">{clientProfile.age}</p>
                </div>
              )}
              {clientProfile?.location && (
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1"><i className="fa-solid fa-location-dot text-green-600"></i>Location</p>
                  <p className="text-gray-900">{clientProfile.location}</p>
                </div>
              )}
              {clientProfile?.bio && (
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Bio</p>
                  <p className="text-gray-700 text-xs italic">{clientProfile.bio}</p>
                </div>
              )}
              <div className="pt-2 border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {clientProfile?.isPhotoVerified && (
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                      <i className="fa-solid fa-check-circle"></i> Verified
                    </span>
                  )}
                  {clientProfile?.isPremium && (
                    <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold">
                      <i className="fa-solid fa-crown"></i> Premium
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModerationView;
