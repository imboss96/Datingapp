import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../services/apiClient';
import { useWebSocketContext } from '../services/WebSocketProvider';
import PaymentMethodModal from './PaymentMethodModal';
import MediaRenderer from './MediaRenderer';
import LandingPageSettingsPanel from './LandingPageSettingsPanel';
import '../styles/whatsapp-background.css';

// AlertContext fallback
const AlertContext = React.createContext<any>(null);
const useAlert = () => React.useContext(AlertContext) || { showAlert: (title: string, message: string) => alert(`${title}: ${message}`) };

interface User {
  id: string;
  username: string;
  name: string;
  avatar?: string;
  role?: string;
  email?: string;
  verificationStatus?: string;
  images?: string[];
  age?: number;
  location?: string;
  bio?: string;
  interests?: string[];
  isPhotoVerified?: boolean;
  isPremium?: boolean;
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

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isFlagged?: boolean;
  flagReason?: string;
  isEditedByModerator?: boolean;
  isDeleted?: boolean;
  deletedAt?: number;
  media?: any;
}

export interface ModeratorChat {
  id: string;
  participants: string[];
  participantDetails?: User[];
  messages: Message[];
  lastUpdated: number;
  flaggedCount: number;
  requestInitiator?: string;
  assignedModerator?: string;
  isAssigned?: boolean;
  isQueued?: boolean;
}

interface Props {
  chat: ModeratorChat;
  currentUserId: string;
  onClose?: () => void;
  onRefresh?: () => void;
  onRepliedChatAdded?: () => void;
}

const ChatModerationView: React.FC<Props> = ({ chat, currentUserId, onClose, onRefresh, onRepliedChatAdded }) => {
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
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [moderatorCoins, setModeratorCoins] = useState<number>(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [moderatorData, setModeratorData] = useState<User | null>(null);
  const [unrepliedChatsCount, setUnrepliedChatsCount] = useState<number>(0);
  const [moderatedChats, setModeratedChats] = useState<ModeratorChat[]>([]);
  const [showModeratedChats, setShowModeratedChats] = useState(false);
  const [isCurrentChatReplied, setIsCurrentChatReplied] = useState(false);
  const [showUnrepliedChatsDropdown, setShowUnrepliedChatsDropdown] = useState(false);
  const [unrepliedChatsList, setUnrepliedChatsList] = useState<ModeratorChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>(chat.id);
  const [currentChat, setCurrentChat] = useState<ModeratorChat>(chat);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingProfileData, setEditingProfileData] = useState<any>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileEditError, setProfileEditError] = useState<string | null>(null);
  const [sessionEarnings, setSessionEarnings] = useState<number>(0);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [moderatedChatsList, setModeratedChatsList] = useState<any[]>([]);
  const [lastEarningsReset, setLastEarningsReset] = useState<Date | null>(null);
  const [showProfileInfoModal, setShowProfileInfoModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showLandingPageSettings, setShowLandingPageSettings] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const { showAlert } = useAlert();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const unrepliedChatsButtonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const gifPickerRef = useRef<HTMLDivElement>(null);

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
        if (data && data.type === 'new_message' && data.chatId === selectedChatId) {
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
  }, [addMessageHandler, selectedChatId]);

  // Fetch moderator profile from session on mount
  useEffect(() => {
    const fetchModeratorData = async () => {
      try {
        const userData = await apiClient.get(`/users/${currentUserId}`);
        setModeratorData(userData);
      } catch (error) {
        console.error('Failed to fetch moderator data:', error);
        // Try to get from localStorage as fallback
        const sessionUser = localStorage.getItem('user');
        if (sessionUser) {
          setModeratorData(JSON.parse(sessionUser));
        }
      }
    };
    if (currentUserId) {
      fetchModeratorData();
    }
  }, [currentUserId]);

  // Fetch session earnings and moderated chats
  useEffect(() => {
    const fetchEarningsAndChats = async () => {
      try {
        // Fetch session earnings
        const earningsData = await apiClient.getSessionEarnings();
        setSessionEarnings(earningsData.sessionEarnings || 0);
        setTotalEarnings(earningsData.totalEarnings || 0);
        setLastEarningsReset(new Date(earningsData.lastResetAt));
        
        // Fetch moderated chats
        const chatsData = await apiClient.getModeratedChats();
        setModeratedChatsList(chatsData.moderatedChats || []);
      } catch (error) {
        console.error('Failed to fetch earnings and chats:', error);
      }
    };

    if (currentUserId) {
      fetchEarningsAndChats();
      
      // Refresh earnings every 30 seconds
      const interval = setInterval(fetchEarningsAndChats, 30000);
      
      // Check for daily reset at 12:00 hrs
      const checkDailyReset = () => {
        const now = new Date();
        const today = new Date(now);
        today.setUTCHours(12, 0, 0, 0);
        
        if (lastEarningsReset && lastEarningsReset < today) {
          // It's past 12:00 hrs, clear session earnings
          apiClient.clearSessionEarnings().catch(err => 
            console.error('Failed to clear session earnings:', err)
          );
        }
      };
      
      checkDailyReset();
      const dailyCheckInterval = setInterval(checkDailyReset, 60000); // Check every minute
      
      return () => {
        clearInterval(interval);
        clearInterval(dailyCheckInterval);
      };
    }
  }, [currentUserId, lastEarningsReset]);

  const handleNavigateBack = () => {
    if (onClose) {
      onClose();
    } else {
      window.history.back();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const menuBtn = document.getElementById('hamburger-menu');
      const menuDropdown = document.getElementById('menu-dropdown');
      if (menuBtn && menuDropdown && !menuBtn.contains(e.target as Node) && !menuDropdown.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMenuOpen]);

  // Fetch messages in real-time
  useEffect(() => {
    const refreshMessages = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/chats/${selectedChatId}`);
        if (response.messages) {
          setMessages(response.messages);
        }
        // Fetch user details
        const userMap = new Map(users);
        for (const userId of currentChat.participants) {
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
  }, [selectedChatId]);

  // Fetch unreplied chats count and moderated chats
  useEffect(() => {
    const fetchUnrepliedChats = async () => {
      try {
        // Fetch unreplied chats from backend using new endpoint
        const response = await apiClient.getUnrepliedChats();
        
        if (response.unrepliedChats) {
          setUnrepliedChatsCount(response.unrepliedChats.length);
          setUnrepliedChatsList(response.unrepliedChats);
          
          // Check if current chat is in the unreplied list
          const currentIsUnreplied = response.unrepliedChats.some((c: any) => c.id === selectedChatId);
          setIsCurrentChatReplied(!currentIsUnreplied);
        }
      } catch (error) {
        console.error('Failed to fetch unreplied chats:', error);
        // Default to counting messages with at least one reply from operator
        const { operatorId } = determineParticipantRoles();
        const operatorReplies = messages.filter(m => m.senderId === operatorId).length;
        setIsCurrentChatReplied(operatorReplies > 0);
      }
    };

    fetchUnrepliedChats();
    const interval = setInterval(fetchUnrepliedChats, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, [selectedChatId, messages]);

  // Handle selecting a chat from unreplied chats list
  const handleSelectChat = async (selectedChat: ModeratorChat) => {
    try {
      setSelectedChatId(selectedChat.id);
      setCurrentChat(selectedChat);
      setMessages(selectedChat.messages || []);
      
      // Fetch fresh user data for the selected chat
      const userMap = new Map<string, User>();
      for (const userId of selectedChat.participants || []) {
        try {
          const userData = await apiClient.get(`/users/${userId}`);
          userMap.set(userId, userData);
        } catch (err) {
          userMap.set(userId, { id: userId, username: userId, name: 'Unknown User' });
        }
      }
      setUsers(userMap);
      
      // Close the dropdown
      setShowUnrepliedChatsDropdown(false);
      
      // Re-check if this chat is in unreplied list
      const currentIsUnreplied = unrepliedChatsList.some((c: any) => c.id === selectedChat.id);
      setIsCurrentChatReplied(!currentIsUnreplied);
    } catch (error) {
      console.error('Error loading chat:', error);
      setSuccessMessage('Failed to load chat');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleFlagMessage = async (message: Message) => {
    if (!message.isFlagged) {
      try {
        setIsSendingAction(true);
        await apiClient.put(`/chats/${selectedChatId}/messages/${message.id}/flag`, {
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
        await apiClient.put(`/chats/${selectedChatId}/messages/${message.id}/flag`, {
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
        await apiClient.delete(`/chats/${selectedChatId}/messages/${message.id}`);
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
        chatId: selectedChatId,
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

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyText(e.target.value);
    
    // Auto-expand textarea like WhatsApp
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 160); // max 5 lines at ~32px per line
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  // Handle click outside emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Handle click outside GIF picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (gifPickerRef.current && !gifPickerRef.current.contains(event.target as Node)) {
        setShowGifPicker(false);
      }
    };

    if (showGifPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGifPicker]);

  const handleEmojiSelect = (emoji: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = replyText.slice(0, start) + emoji + replyText.slice(end);
      setReplyText(newText);
      
      // Auto-expand textarea
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          const newHeight = Math.min(textareaRef.current.scrollHeight, 160);
          textareaRef.current.style.height = `${newHeight}px`;
          // Set cursor position after emoji
          textareaRef.current.focus();
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + emoji.length;
        }
      }, 0);
    }
    setShowEmojiPicker(false);
  };

  // Handle GIF selection
  const handleGifSelect = (gifUrl: string, gifName: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = replyText.slice(0, start) + gifUrl + replyText.slice(end);
      setReplyText(newText);
      
      // Auto-expand textarea
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          const newHeight = Math.min(textareaRef.current.scrollHeight, 160);
          textareaRef.current.style.height = `${newHeight}px`;
          textareaRef.current.focus();
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + gifUrl.length;
        }
      }, 0);
    }
    setShowGifPicker(false);
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

      const response = await apiClient.post(`/moderation/send-response/${selectedChatId}`, payload);

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
        
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
        
        // Mark current chat as replied on backend
        try {
          console.log('[DEBUG ChatModerationView] Marking chat as replied:', selectedChatId);
          const response = await apiClient.markChatAsReplied(selectedChatId);
          console.log('[DEBUG ChatModerationView] Chat marked as replied successfully:', response);
          // Trigger refresh of replied chats in parent component
          onRepliedChatAdded?.();
          console.log('[DEBUG ChatModerationView] Called onRepliedChatAdded callback');
        } catch (error) {
          console.warn('Could not mark chat as replied on backend:', error);
        }
        
        // Mark current chat as replied locally
        setIsCurrentChatReplied(true);
        
        // Decrease unreplied chats count
        setUnrepliedChatsCount(prev => Math.max(0, prev - 1));
        
        // Remove from unreplied chats list
        setUnrepliedChatsList(prev => prev.filter(c => c.id !== selectedChatId));
        
        // Increment moderator coins (0.1 per reply)
        setModeratorCoins(prev => prev + 0.1);
        
        // Update session earnings via API
        try {
          const earningsRes = await apiClient.addSessionEarnings(0.10);
          setSessionEarnings(earningsRes.newSessionEarnings || 0);
          setTotalEarnings(earningsRes.totalEarnings || 0);
        } catch (error) {
          console.warn('Failed to update session earnings:', error);
        }
        
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
      const result = await apiClient.uploadChatMedia(selectedChatId, file);

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

  // Profile editing functions
  const openProfileEditModal = (profileId: string) => {
    const profile = users.get(profileId);
    if (profile) {
      setEditingProfileId(profileId);
      setEditingProfileData({
        name: profile.name || '',
        age: profile.age || '',
        location: profile.location || '',
        bio: profile.bio || '',
        interests: profile.interests || []
      });
      setProfilePhotoPreview(null);
      setProfilePhotoFile(null);
      setProfileEditError(null);
      setShowProfileEditModal(true);
    }
  };

  const handleProfilePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setProfilePhotoPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfileChanges = async () => {
    if (!editingProfileId || !editingProfileData) return;

    try {
      setSavingProfile(true);
      setProfileEditError(null);

      const updatePayload: any = {
        name: editingProfileData.name,
        age: editingProfileData.age,
        location: editingProfileData.location,
        bio: editingProfileData.bio,
        interests: editingProfileData.interests || []
      };

      // Handle photo upload - convert to base64 data URL
      if (profilePhotoFile) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(profilePhotoFile);
          });
          
          // Get existing images or start with empty array
          const existingImages = users.get(editingProfileId)?.images || [];
          // Replace first image with new one, or add as first
          updatePayload.images = [base64, ...existingImages.slice(1)];
        } catch (photoError) {
          console.warn('[WARN] Failed to convert photo to base64:', photoError);
          setProfileEditError('Failed to process photo. Please try again.');
          return;
        }
      }

      // Send update to backend
      const response = await apiClient.put(`/users/${editingProfileId}`, updatePayload);

      // Refresh user data from response
      if (response && response.id) {
        const newUserMap = new Map(users);
        newUserMap.set(editingProfileId, response);
        setUsers(newUserMap);
      }

      setSuccessMessage(`Profile updated successfully for ${editingProfileData.name}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowProfileEditModal(false);
    } catch (error) {
      console.error('[ERROR] Failed to save profile:', error);
      setProfileEditError(error instanceof Error ? error.message : 'Failed to save profile changes');
    } finally {
      setSavingProfile(false);
    }
  };

  const closeProfileEditModal = () => {
    setShowProfileEditModal(false);
    setEditingProfileId(null);
    setEditingProfileData(null);
    setProfilePhotoFile(null);
    setProfilePhotoPreview(null);
    setProfileEditError(null);
  };

  // Determine client (initiator) and operator (recipient) roles for this chat
  const determineParticipantRoles = () => {
    // Prefer explicit requestInitiator when available from backend
    const explicitInitiator = (currentChat as any).requestInitiator as string | undefined;
    let clientId = explicitInitiator;

    // Fallback: use sender of earliest non‑moderation message
    if (!clientId && messages.length > 0) {
      const sortedByTime = [...messages].sort((a, b) => a.timestamp - b.timestamp);
      const firstNonModeration = sortedByTime.find(m => !(m as any).isModerationResponse);
      clientId = (firstNonModeration || sortedByTime[0]).senderId;
    }

    // Final fallback: first participant
    if (!clientId) {
      clientId = currentChat.participants[0];
    }

    const operatorId = currentChat.participants.find(p => p !== clientId) || currentChat.participants[0];
    return { clientId, operatorId };
  };

  const { clientId, operatorId } = determineParticipantRoles();

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
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black flex items-center gap-1 text-gray-800">
              <i className="fa-solid fa-shield-halved text-xs"></i>
              Moderator Portal
            </h2>
            <p className="text-gray-600 text-xs mt-0.5">Chat ID: {selectedChatId} • {messages.length} messages</p>
          </div>
          <div className="flex gap-4 items-center">
            {/* Unreplied Chats Section - Dropdown Button */}
            <div className="relative">
              <button
                ref={unrepliedChatsButtonRef}
                onClick={() => setShowUnrepliedChatsDropdown(!showUnrepliedChatsDropdown)}
                className="bg-gray-200 backdrop-blur-sm rounded px-3 py-2 flex flex-col items-center hover:bg-gray-300 transition-colors cursor-pointer active:scale-95"
              >
                <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Unreplied</p>
                <div className="flex items-center gap-1 mt-1">
                  <i className="fa-solid fa-exclamation-circle text-gray-700 text-sm"></i>
                  <span className="text-xl font-black text-gray-800">{unrepliedChatsCount}</span>
                </div>
              </button>

              {/* Unreplied Chats Dropdown */}
              {showUnrepliedChatsDropdown && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div 
                    className="fixed inset-0 z-[80]"
                    onClick={() => setShowUnrepliedChatsDropdown(false)}
                  />
                  
                  {/* Dropdown Menu */}
                  <div className="fixed top-20 right-4 z-[90] bg-white rounded-lg w-72 max-h-[400px] shadow-2xl border border-gray-200 flex flex-col">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-300 p-2 flex items-center justify-between sticky top-0">
                      <h3 className="text-sm font-bold flex items-center gap-1 text-gray-800">
                        <i className="fa-solid fa-exclamation-circle text-gray-700"></i>
                        Unreplied Chats
                      </h3>
                      <button
                        onClick={() => setShowUnrepliedChatsDropdown(false)}
                        className="text-gray-600 hover:text-gray-800 transition-colors text-lg"
                      >
                        <i className="fa-solid fa-times"></i>
                      </button>
                    </div>

                    {/* Chats List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {unrepliedChatsList.length === 0 ? (
                        <div className="flex items-center justify-center h-40 text-gray-400">
                          <div className="text-center">
                            <i className="fa-solid fa-check text-3xl mb-2 text-gray-300"></i>
                            <p className="text-sm font-semibold">All chats replied!</p>
                            <p className="text-xs text-gray-500 mt-1">Great work today</p>
                          </div>
                        </div>
                      ) : (
                        unrepliedChatsList.map((c) => {
                          const chatClientId = c.participants?.[0];
                          const chatOperatorId = c.participants?.[1];
                          const chatClient = users.get(chatClientId) || { id: chatClientId, name: 'Unknown User', username: 'unknown' };
                          const chatOperator = users.get(chatOperatorId) || { id: chatOperatorId, name: 'Unknown User', username: 'unknown' };
                          
                          return (
                            <button
                              key={c.id}
                              onClick={() => {
                                handleSelectChat(c);
                                setShowUnrepliedChatsDropdown(false);
                              }}
                              className="w-full p-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg border border-gray-300 hover:border-gray-400 hover:shadow-lg hover:bg-gradient-to-r hover:from-gray-200 hover:to-gray-300 transition-all cursor-pointer active:scale-98 text-left group"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-gray-900 truncate group-hover:text-rose-700">
                                    {chatClient?.name} → {chatOperator?.name}
                                  </p>
                                  <p className="text-xs text-gray-700 mt-0.5">
                                    <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold">
                                      {c.id}
                                    </span>
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                                    {c.messages?.[c.messages.length - 1]?.text || 'No messages'}
                                  </p>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                    <span>
                                      <i className="fa-solid fa-comments text-rose-600 mr-1"></i>
                                      {c.messages?.length || 0}
                                    </span>
                                    <span>
                                      <i className="fa-solid fa-clock text-amber-600 mr-1"></i>
                                      {new Date(c.lastUpdated).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-shrink-0 ml-2 text-rose-600 group-hover:translate-x-1 transition-transform">
                                  <i className="fa-solid fa-chevron-right"></i>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Replied Status Section */}
            {isCurrentChatReplied && (
              <div className="bg-gray-200 backdrop-blur-sm rounded px-3 py-2 flex flex-col items-center">
                <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Status</p>
                <div className="flex items-center gap-1 mt-1">
                  <i className="fa-solid fa-check-circle text-gray-800 text-xs"></i>
                  <span className="text-xs font-bold text-gray-800">Replied</span>
                </div>
              </div>
            )}
            
            {/* Coins Section */}
            <div className="bg-gray-200 backdrop-blur-sm rounded px-3 py-2 flex flex-col items-center">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Earnings</p>
              <div className="flex items-center gap-1 mt-1">
                <i className="fa-solid fa-coins text-gray-800 text-xs"></i>
                <span className="text-xl font-black text-gray-800">${moderatorCoins.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="flex gap-1 items-center relative">
              <button
                onClick={handleNavigateBack}
                className="bg-gray-800 hover:bg-gray-900 text-white px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors"
                title="Go back to previous page"
              >
                <i className="fa-solid fa-arrow-left text-xs"></i>
              </button>

              {/* Hamburger Menu */}
              <div className="relative">
                <button
                  id="hamburger-menu"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="bg-gray-800 hover:bg-gray-900 text-white px-2 py-1 rounded text-xs transition-colors"
                  title="Menu"
                >
                  <i className="fa-solid fa-bars text-xs"></i>
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div id="menu-dropdown" className="absolute right-0 top-full mt-2 w-40 bg-white rounded shadow-xl border border-gray-200 z-50 overflow-hidden">
                    {/* Moderator Info Header */}
                    {moderatorData && (
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-2 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <img 
                            src={moderatorData.avatar || 'https://i.pravatar.cc/150?img=1'} 
                            alt={moderatorData.name} 
                            className="w-8 h-8 rounded-full border border-indigo-300"
                          />
                          <div>
                            <h3 className="font-bold text-gray-900 text-xs">{moderatorData.name}</h3>
                            <p className="text-xs text-gray-600">{moderatorData.role || 'Mod'}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Menu Items */}
                    <div className="py-2">
                      {/* Profile Information */}
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setShowProfileInfoModal(true);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 text-gray-700 border-b border-gray-100"
                      >
                        <i className="fa-solid fa-user text-blue-500 w-4"></i>
                        <span className="text-sm font-medium">Profile</span>
                      </button>

                      {/* Payment Method */}
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setShowPaymentMethodModal(true);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-green-50 transition-colors flex items-center gap-3 text-gray-700 border-b border-gray-100"
                      >
                        <i className="fa-solid fa-credit-card text-green-500 w-4"></i>
                        <span className="text-sm font-medium">Payment</span>
                      </button>

                      {/* My Earnings */}
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setShowEarningsModal(true);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center justify-between gap-3 text-gray-700 border-b border-gray-100"
                      >
                        <div className="flex items-center gap-3">
                          <i className="fa-solid fa-wallet text-purple-500 w-4"></i>
                          <span className="text-sm font-medium">Earnings</span>
                        </div>
                        <span className="text-sm font-semibold text-purple-600">${sessionEarnings.toFixed(2)}</span>
                      </button>

                      {/* Stats */}
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setShowStatsModal(true);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors flex items-center gap-3 text-gray-700 border-b border-gray-100"
                      >
                        <i className="fa-solid fa-chart-line text-amber-500 w-4"></i>
                        <span className="text-sm font-medium">Stats</span>
                      </button>

                      {/* Moderated Chats */}
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setShowModeratedChats(true);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-cyan-50 transition-colors flex items-center justify-between gap-3 text-gray-700 border-b border-gray-100"
                      >
                        <div className="flex items-center gap-3">
                          <i className="fa-solid fa-check-circle text-cyan-500 w-4"></i>
                          <span className="text-sm font-medium">Chats</span>
                        </div>
                        <span className="inline-flex items-center justify-center h-4 w-4 bg-cyan-100 text-cyan-600 rounded-full text-xs font-bold">
                          {moderatedChatsList.length}
                        </span>
                      </button>

                      {/* Landing Page Settings (Admin only) */}
                      {moderatorData?.role === 'ADMIN' && (
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            setShowLandingPageSettings(true);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center gap-3 text-gray-700 border-b border-gray-100"
                        >
                          <i className="fa-solid fa-sliders text-purple-500 w-4"></i>
                          <span className="text-sm font-medium">Landing Page Settings</span>
                        </button>
                      )}

                      {/* Logout */}
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-rose-50 transition-colors flex items-center gap-3 text-rose-600"
                      >
                        <i className="fa-solid fa-sign-out-alt text-rose-500 w-4"></i>
                        <span className="text-sm font-medium">Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                <div className="flex flex-wrap gap-2 mb-3">
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
                <button
                  onClick={() => openProfileEditModal(operatorId)}
                  className="w-full px-3 py-2 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-edit"></i>
                  Edit Profile
                </button>
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
                    const isInitiator = msg.senderId === clientId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isInitiator ? 'justify-start' : 'justify-end'} mb-2`}
                      >
                        <div className={`flex flex-col ${isInitiator ? 'items-start' : 'items-end'} max-w-2xl`}>
                          {/* Sender name label */}
                          <p className={`text-2xs font-bold mb-0.5 px-2 ${isInitiator ? 'text-green-700' : 'text-indigo-700'}`} style={{fontSize: '0.625rem'}}>
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
                            <div className={`rounded-2xl px-3 py-1.5 break-words shadow-sm max-w-xl ${
                              isInitiator 
                                ? 'bg-green-100 text-gray-900 rounded-bl-none' 
                                : 'bg-indigo-100 text-gray-900 rounded-br-none'
                            }`} style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                              {msg.text && <p className="font-medium" style={{fontSize: '0.625rem', wordBreak: 'break-word'}}>{msg.text}</p>}
                              
                              {/* Media Display */}
                              {msg.media && (
                                <div className="mt-2">
                                  <MediaRenderer media={msg.media} isMe={!isInitiator} messageId={msg.id} />
                                </div>
                              )}
                              
                              <p className={`font-semibold ${isInitiator ? 'text-green-700' : 'text-indigo-700'}`} style={{fontSize: '0.5rem', marginTop: '0.25rem'}}>
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
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    <i className={`fa-solid ${successMessage.includes('sent') || successMessage.includes('successful') ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                    {successMessage.replace('✓ ', '').replace('✗ ', '')}
                  </div>
                )}
                {selectedMedia && (
                  <div className="text-xs font-semibold px-3 py-1.5 rounded flex items-center justify-between bg-blue-100 text-blue-700">
                    <div className="flex items-center gap-2">
                      {selectedMedia.type === 'image' ? (
                        <i className="fa-solid fa-image text-blue-600"></i>
                      ) : selectedMedia.type === 'video' ? (
                        <i className="fa-solid fa-video text-rose-600"></i>
                      ) : selectedMedia.type === 'audio' ? (
                        <i className="fa-solid fa-music text-purple-600"></i>
                      ) : (
                        <i className="fa-solid fa-file text-blue-600"></i>
                      )}
                      <span>{selectedMedia.name || selectedMedia.filename || 'Media attached'}</span>
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
                <div className="flex gap-3 items-center bg-white rounded-full px-4 md:px-5 py-0 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                  {/* Media Attachment Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowMediaPicker(!showMediaPicker)}
                      disabled={uploadingMedia || isSendingReply}
                      className="text-gray-500 hover:text-gray-600 text-lg md:text-xl transition-colors active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 p-0 h-6 leading-6"
                      title="Attach file"
                    >
                      <i className="fa-solid fa-plus-circle"></i>
                    </button>

                    {/* Media Picker Menu */}
                    {showMediaPicker && (
                      <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-48 z-50">
                        <button
                          onClick={() => {
                            setShowMediaPicker(false);
                            if (fileInputRef.current) {
                              fileInputRef.current.accept = 'image/*';
                              fileInputRef.current.click();
                            }
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors flex items-center gap-3"
                        >
                          <i className="fa-solid fa-image text-blue-500 w-5"></i>
                          <span className="text-sm text-gray-700">Image</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowMediaPicker(false);
                            if (fileInputRef.current) {
                              fileInputRef.current.accept = 'video/*';
                              fileInputRef.current.click();
                            }
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-rose-50 transition-colors flex items-center gap-3"
                        >
                          <i className="fa-solid fa-video text-rose-500 w-5"></i>
                          <span className="text-sm text-gray-700">Video</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowMediaPicker(false);
                            if (fileInputRef.current) {
                              fileInputRef.current.accept = 'audio/*';
                              fileInputRef.current.click();
                            }
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-purple-50 transition-colors flex items-center gap-3"
                        >
                          <i className="fa-solid fa-music text-purple-500 w-5"></i>
                          <span className="text-sm text-gray-700">Audio</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowMediaPicker(false);
                            if (fileInputRef.current) {
                              fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar';
                              fileInputRef.current.click();
                            }
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-3"
                        >
                          <i className="fa-solid fa-file text-gray-500 w-5"></i>
                          <span className="text-sm text-gray-700">Document</span>
                        </button>
                        <div className="border-t border-gray-200 my-2"></div>
                        <button
                          onClick={() => {
                            setShowMediaPicker(false);
                            if (fileInputRef.current) {
                              fileInputRef.current.accept = '*';
                              fileInputRef.current.click();
                            }
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-yellow-50 transition-colors flex items-center gap-3"
                        >
                          <i className="fa-solid fa-star text-yellow-500 w-5"></i>
                          <span className="text-sm text-gray-700">All Files</span>
                        </button>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleMediaUpload}
                      accept="image/*,video/*,.pdf,audio/*"
                      className="hidden"
                      disabled={uploadingMedia}
                    />
                  </div>
                  
                  {/* Emoji Picker Button */}
                  <div className="relative" ref={emojiPickerRef}>
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      disabled={uploadingMedia || isSendingReply}
                      className="text-gray-500 hover:text-yellow-500 text-lg md:text-xl transition-colors active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 p-0 h-6 leading-6"
                      title="Add emoji"
                    >
                      😊
                    </button>

                    {/* Emoji Picker Dropdown */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-64 overflow-y-auto w-80">
                        {/* Emoji Grid */}
                        <div className="p-3 grid grid-cols-7 gap-2">
                          {/* Smileys */}
                          {['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😌', '😔', '😑', '😐', '😶', '🤤', '😴'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleEmojiSelect(emoji)}
                              className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-gray-200 p-3 grid grid-cols-7 gap-2">
                          {/* Hearts & Love */}
                          {['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '♥️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '👋', '🤚', '🖐️', '✋', '🖖', '👌'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleEmojiSelect(emoji)}
                              className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-gray-200 p-3 grid grid-cols-7 gap-2">
                          {/* Celebrations */}
                          {['🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🍰', '🧁', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🎃', '🎄', '⭐', '✨', '🌟', '💫', '⚡', '🔥'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleEmojiSelect(emoji)}
                              className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-gray-200 p-3 grid grid-cols-7 gap-2">
                          {/* Nature & Animals */}
                          {['😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleEmojiSelect(emoji)}
                              className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-gray-200 p-3 grid grid-cols-7 gap-2">
                          {/* Hand Gestures */}
                          {['👍', '👎', '👊', '👏', '🙌', '👐', '🤲', '🤝', '🤜', '🤛', '✊', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '🫶', '🫵', '☝️', '👆', '👇', '👈', '👉'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleEmojiSelect(emoji)}
                              className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <textarea
                    ref={textareaRef}
                    value={replyText}
                    onChange={handleTextareaChange}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !isSendingReply) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder="Type a message..."
                    disabled={isSendingReply || uploadingMedia}
                    className="bg-transparent flex-1 focus:outline-none text-sm md:text-base text-gray-900 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed resize-none overflow-hidden font-medium m-0 border-0"
                    style={{ lineHeight: '1.5rem', minHeight: '1.5rem', maxHeight: '160px', fontFamily: 'inherit', padding: '0.375rem 0', margin: 0, border: 'none', verticalAlign: 'middle' }}
                  />
                  <button 
                    onClick={handleSendReply}
                    disabled={isSendingReply || (!replyText.trim() && !selectedMedia)}
                    className={`text-lg md:text-xl transition-all active:scale-90 flex-shrink-0 p-0 rounded-full h-6 leading-6 flex items-center justify-center ${
                      (replyText.trim() || selectedMedia)
                        ? 'text-green-500 hover:text-green-600 hover:bg-green-50'
                        : 'text-gray-500 hover:text-gray-600 hover:bg-gray-100'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
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

      {/* Moderated Chats Modal */}
      {showModeratedChats && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-96 h-96 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-black flex items-center gap-2 text-gray-800">
                <i className="fa-solid fa-check-circle text-cyan-600"></i>
                Moderated Chats
              </h3>
              <button
                onClick={() => setShowModeratedChats(false)}
                className="text-gray-600 hover:text-gray-800 transition-colors text-lg"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            {/* Chats List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {moderatedChatsList.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <i className="fa-solid fa-inbox text-4xl mb-2 text-gray-300"></i>
                    <p className="text-sm">No moderated chats yet</p>
                    <p className="text-xs text-gray-500 mt-1">Chats you've replied to will appear here</p>
                  </div>
                </div>
              ) : (
                moderatedChatsList.map((chat) => {
                  const participant1 = chat.participants?.[0];
                  const participant2 = chat.participants?.[1];
                  
                  return (
                    <div
                      key={chat.id}
                      className="p-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-200 hover:border-cyan-400 hover:shadow-md transition-all cursor-pointer active:scale-98"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {participant1?.name || 'User'} → {participant2?.name || 'Operator'}
                          </p>
                          <p className="text-xs text-gray-700 mt-0.5">
                            {participant1?.username || 'user'} | {participant2?.username || 'operator'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-600">
                              <i className="fa-solid fa-comments text-cyan-600 mr-1"></i>
                              {chat.messageCount || 0} messages
                            </span>
                            <span className="text-xs text-gray-600">
                              <i className="fa-solid fa-clock text-amber-600 mr-1"></i>
                              {new Date(chat.markedAsRepliedAt || chat.lastUpdated).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                            <i className="fa-solid fa-check text-white"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {showProfileEditModal && editingProfileData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4 flex items-center justify-between border-b border-gray-200">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-user-edit"></i>
                Edit Profile
              </h2>
              <button
                onClick={closeProfileEditModal}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center transition-all"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Error Message */}
              {profileEditError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-lg text-sm flex items-center gap-2">
                  <i className="fa-solid fa-exclamation-circle"></i>
                  {profileEditError}
                </div>
              )}

              {/* Photo Upload */}
              <div>
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2 block">
                  <i className="fa-solid fa-camera text-indigo-500 mr-1"></i>
                  Profile Photo
                </label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-indigo-400 transition-colors cursor-pointer"
                      onClick={() => profilePhotoInputRef.current?.click()}
                    >
                      {profilePhotoPreview ? (
                        <img src={profilePhotoPreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                      ) : operatorProfile?.images?.[0] ? (
                        <img src={operatorProfile.images[0]} alt="Current" className="w-full h-40 object-cover rounded-lg" />
                      ) : (
                        <div className="py-8">
                          <i className="fa-solid fa-cloud-arrow-up text-4xl text-gray-400 mb-2 block"></i>
                          <p className="text-gray-600 text-sm">Click to upload photo</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={profilePhotoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePhotoSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Name Field */}
              <div>
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2 block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editingProfileData.name}
                  onChange={(e) => setEditingProfileData({ ...editingProfileData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter full name"
                />
              </div>

              {/* Age Field */}
              <div>
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2 block">
                  Age
                </label>
                <input
                  type="number"
                  value={editingProfileData.age}
                  onChange={(e) => setEditingProfileData({ ...editingProfileData, age: parseInt(e.target.value) || '' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter age"
                  min="18"
                  max="100"
                />
              </div>

              {/* Location Field */}
              <div>
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2 block">
                  <i className="fa-solid fa-location-dot text-indigo-500 mr-1"></i>
                  Location
                </label>
                <input
                  type="text"
                  value={editingProfileData.location}
                  onChange={(e) => setEditingProfileData({ ...editingProfileData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter location"
                />
              </div>

              {/* Bio Field */}
              <div>
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2 block">
                  Bio
                </label>
                <textarea
                  value={editingProfileData.bio}
                  onChange={(e) => setEditingProfileData({ ...editingProfileData, bio: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Enter bio/about"
                  rows={4}
                />
              </div>

              {/* Interests Field */}
              <div>
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2 block">
                  <i className="fa-solid fa-heart text-rose-500 mr-1"></i>
                  Interests (comma separated)
                </label>
                <input
                  type="text"
                  value={Array.isArray(editingProfileData.interests) ? editingProfileData.interests.join(', ') : ''}
                  onChange={(e) => setEditingProfileData({ ...editingProfileData, interests: e.target.value.split(',').map(i => i.trim()).filter(i => i) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. travel, cooking, hiking"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-2 justify-end">
              <button
                onClick={closeProfileEditModal}
                disabled={savingProfile}
                className="px-4 py-2 bg-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-400 active:scale-95 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveProfileChanges}
                disabled={savingProfile}
                className="px-6 py-2 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {savingProfile ? (
                  <>
                    <i className="fa-solid fa-spinner animate-spin"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-save"></i>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Info Modal */}
      {showProfileInfoModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl max-w-xs w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-user text-lg"></i>
                <h2 className="text-lg font-black">Profile</h2>
              </div>
              <button
                onClick={() => setShowProfileInfoModal(false)}
                className="text-white/70 hover:text-white transition-colors text-2xl"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {moderatorData && (
                <>
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                    <img
                      src={moderatorData.avatar || 'https://i.pravatar.cc/150?img=1'}
                      alt={moderatorData.name}
                      className="w-12 h-12 rounded-full border border-blue-400"
                    />
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Moderator</p>
                      <p className="text-base font-black text-gray-900">{moderatorData.name}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-0.5">Username</p>
                    <p className="text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded text-xs">@{moderatorData.username}</p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-0.5">Role</p>
                    <p className="text-gray-900 font-semibold text-xs inline-flex items-center gap-1 bg-amber-50 px-2 py-1 rounded">
                      <i className="fa-solid fa-shield text-amber-600"></i>
                      {moderatorData.role || 'Moderator'}
                    </p>
                  </div>

                  {moderatorData.email && (
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-0.5">Email</p>
                      <p className="text-gray-900 break-all text-xs">{moderatorData.email}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-2 flex gap-2 justify-end border-t border-gray-200">
              <button
                onClick={() => setShowProfileInfoModal(false)}
                className="px-3 py-1 bg-gray-300 text-gray-700 font-bold rounded text-sm hover:bg-gray-400 active:scale-95 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Earnings Modal */}
      {showEarningsModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl max-w-xs w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-wallet text-lg"></i>
                <h2 className="text-lg font-black">Earnings</h2>
              </div>
              <button
                onClick={() => setShowEarningsModal(false)}
                className="text-white/70 hover:text-white transition-colors text-2xl"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Session Earnings Card */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded p-3">
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-0.5">Session Earnings</p>
                <p className="text-2xl font-black text-purple-600 flex items-center gap-1">
                  <i className="fa-solid fa-coins text-sm"></i>
                  ${sessionEarnings.toFixed(2)}
                </p>
                <p className="text-xs text-purple-600 mt-0.5">This session</p>
              </div>

              {/* Total Earnings Card */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded p-3">
                <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-0.5">Total Earnings</p>
                <p className="text-2xl font-black text-green-600 flex items-center gap-1">
                  <i className="fa-solid fa-piggy-bank text-sm"></i>
                  ${totalEarnings.toFixed(2)}
                </p>
                <p className="text-xs text-green-600 mt-0.5">Lifetime</p>
              </div>

              {/* Per Reply */}
              <div className="bg-gray-50 border border-gray-200 rounded p-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">Per Reply</p>
                  <p className="text-base font-black text-amber-600">$0.10</p>
                </div>
              </div>

              {/* Next Reset */}
              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                    <i className="fa-solid fa-clock text-sm"></i>
                    Reset
                  </p>
                  <p className="text-xs font-bold text-blue-600">
                    {lastEarningsReset
                      ? new Date(new Date(lastEarningsReset).getTime() + 24 * 60 * 60 * 1000)
                          .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                      : '12:00 PM UTC'}
                  </p>
                </div>
              </div>

              {/* Pending Payout */}
              <div className="bg-gray-50 border border-gray-200 rounded p-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">Pending</p>
                  <p className="text-base font-black text-gray-600">$0.00</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-2 flex gap-2 justify-end border-t border-gray-200">
              <button
                onClick={() => setShowEarningsModal(false)}
                className="px-3 py-1 bg-gray-300 text-gray-700 font-bold rounded text-sm hover:bg-gray-400 active:scale-95 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl max-w-xs w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-chart-line text-lg"></i>
                <h2 className="text-lg font-black">Stats</h2>
              </div>
              <button
                onClick={() => setShowStatsModal(false)}
                className="text-white/70 hover:text-white transition-colors text-2xl"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-2">
              {/* Messages Moderated */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3 flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-comments text-blue-600 text-xs"></i>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Messages</p>
                    <p className="text-xs text-blue-600 mt-0 font-semibold">{messages.length}</p>
                  </div>
                </div>
              </div>

              {/* Session Earnings */}
              <div className="bg-purple-50 border border-purple-200 rounded p-3 flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-coins text-purple-600 text-xs"></i>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">This Session</p>
                    <p className="text-xs text-purple-600 mt-0 font-semibold">${sessionEarnings.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Total Earnings */}
              <div className="bg-green-50 border border-green-200 rounded p-3 flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-piggy-bank text-green-600 text-xs"></i>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Lifetime</p>
                    <p className="text-xs text-green-600 mt-0 font-semibold">${totalEarnings.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Moderated Chats */}
              <div className="bg-cyan-50 border border-cyan-200 rounded p-3 flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 rounded bg-cyan-100 flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-check-circle text-cyan-600 text-xs"></i>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-cyan-700 uppercase tracking-wide">Chats</p>
                    <p className="text-xs text-cyan-600 mt-0 font-semibold">{moderatedChatsList.length}</p>
                  </div>
                </div>
              </div>

              {/* Chat ID */}
              <div className="bg-gray-50 border border-gray-200 rounded p-2">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-0.5">Chat ID</p>
                <p className="text-xs text-gray-900 font-mono bg-white px-1.5 py-1 rounded break-all border border-gray-200">
                  {selectedChatId}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-2 flex gap-2 justify-end border-t border-gray-200">
              <button
                onClick={() => setShowStatsModal(false)}
                className="px-3 py-1 bg-gray-300 text-gray-700 font-bold rounded text-sm hover:bg-gray-400 active:scale-95 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Modal - Using existing component */}
      {showPaymentMethodModal && (
        <PaymentMethodModal
          isOpen={showPaymentMethodModal}
          onClose={() => setShowPaymentMethodModal(false)}
          moderatorId={currentUserId}
        />
      )}

      {/* Landing Page Settings Panel */}
      <LandingPageSettingsPanel
        isOpen={showLandingPageSettings}
        onClose={() => setShowLandingPageSettings(false)}
      />
    </div>
  );
};

export default ChatModerationView;
