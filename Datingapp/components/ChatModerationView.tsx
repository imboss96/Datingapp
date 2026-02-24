import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../services/apiClient';
import useWebSocket from '../services/useWebSocket';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket for real-time updates (moderator registers as separate client)
  const { addMessageHandler } = useWebSocket(currentUserId);

  // Scroll to bottom when messages change
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-black flex items-center gap-2">
              <i className="fa-solid fa-magnifying-glass"></i>
              Chat Moderation
            </h2>
            <p className="text-blue-100 text-sm mt-1">Chat ID: {chat.id}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
            >
              <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
              Refresh
            </button>
            <button
              onClick={onClose}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              <i className="fa-solid fa-times"></i> Close
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Messages Panel */}
          <div className="flex-1 flex flex-col border-r border-gray-200">
            {/* Participants Info */}
            <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {chat.participants.slice(0, 2).map((pid) => {
                  const user = getMessageUserInfo(pid);
                  return (
                    <div
                      key={pid}
                      onClick={() => setSelectedUser(selectedUser === pid ? null : pid)}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedUser === pid ? 'bg-blue-100' : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        {user.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{user.name || user.username}</p>
                        <p className="text-xs text-gray-500">{pid.substring(0, 8)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-gray-500">
                {messages.length} messages • {chat.flaggedCount || 0} flagged
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p>No messages yet</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const sender = getMessageUserInfo(msg.senderId);
                  const isSenderSelected = selectedMessage?.id === msg.id;
                  return (
                    <div
                      key={msg.id}
                      onClick={() => setSelectedMessage(isSenderSelected ? null : msg)}
                      className={`p-4 rounded-lg cursor-pointer transition-all ${
                        msg.isDeleted
                          ? 'bg-gray-200 opacity-50'
                          : isSenderSelected
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : msg.isFlagged
                          ? 'bg-red-50 border-2 border-red-300'
                          : 'bg-white border border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                            {sender.username?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{sender.name || sender.username}</p>
                            <p className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {msg.isFlagged && (
                            <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded">
                              🚩 FLAGGED
                            </span>
                          )}
                          {msg.isEditedByModerator && (
                            <span className="bg-yellow-100 text-yellow-600 text-[10px] font-bold px-2 py-1 rounded">
                              EDITED
                            </span>
                          )}
                          {msg.isDeleted && (
                            <span className="bg-gray-300 text-gray-600 text-[10px] font-bold px-2 py-1 rounded">
                              DELETED
                            </span>
                          )}
                        </div>
                      </div>

                      {msg.isDeleted ? (
                        <p className="text-gray-500 italic text-sm">[Message deleted by moderator]</p>
                      ) : (
                        <p className="text-sm text-gray-800">{msg.text}</p>
                      )}

                      {msg.flagReason && (
                        <p className="text-xs text-red-600 mt-2 italic">Reason: {msg.flagReason}</p>
                      )}

                      {isSenderSelected && !msg.isDeleted && (
                        <div className="mt-3 flex gap-2 flex-wrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFlagMessage(msg);
                            }}
                            disabled={isSendingAction}
                            className={`text-xs font-bold px-3 py-1 rounded transition-colors ${
                              msg.isFlagged
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                            }`}
                          >
                            {msg.isFlagged ? '🚩 Unflag' : '🚩 Flag'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMessage(msg);
                            }}
                            disabled={isSendingAction}
                            className="text-xs font-bold px-3 py-1 bg-red-500 text-white hover:bg-red-600 rounded transition-colors"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Action Panel */}
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
            {/* Selected Item Info */}
            {selectedMessage || selectedUser ? (
              <>
                {selectedMessage && (
                  <div className="bg-blue-50 border-b border-blue-200 p-4">
                    <p className="text-xs font-bold text-blue-600 uppercase mb-2">Selected Message</p>
                    <p className="text-sm text-gray-800 line-clamp-3">{selectedMessage.text}</p>
                  </div>
                )}

                {selectedUser && (
                  <div className="bg-purple-50 border-b border-purple-200 p-4">
                    <p className="text-xs font-bold text-purple-600 uppercase mb-2">Selected User</p>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                        {getMessageUserInfo(selectedUser).username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">{getMessageUserInfo(selectedUser).name}</p>
                        <p className="text-xs text-gray-600">{selectedUser.substring(0, 12)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Form */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedMessage && (
                    <>
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-2">Action Type</label>
                        <select
                          value={actionType}
                          onChange={(e) => setActionType(e.target.value as any)}
                          className="w-full border border-gray-300 rounded-lg p-2 text-xs"
                        >
                          <option value="flag">🚩 Flag</option>
                          <option value="report">📝 Report</option>
                        </select>
                      </div>
                    </>
                  )}

                  {selectedUser && (
                    <>
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-2">Action Type</label>
                        <select
                          value={actionType}
                          onChange={(e) => setActionType(e.target.value as any)}
                          className="w-full border border-gray-300 rounded-lg p-2 text-xs"
                        >
                          <option value="warn">⚠️ Warn User</option>
                          <option value="timeout">⏱️ Timeout (1 hour)</option>
                          <option value="mute">🔇 Mute (1 hour)</option>
                          <option value="ban">🚫 Ban Permanently</option>
                          <option value="block">🚷 Block User</option>
                          <option value="report">📝 Report User</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-2">Reason</label>
                    <textarea
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Enter reason for this action..."
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs resize-none h-24"
                    />
                  </div>

                  {successMessage && (
                    <div className="bg-emerald-100 border border-emerald-300 text-emerald-700 p-3 rounded-lg text-xs font-bold">
                      ✓ {successMessage}
                    </div>
                  )}

                  {selectedMessage && (
                    <button
                      onClick={() => handleFlagMessage(selectedMessage)}
                      disabled={isSendingAction || !actionReason.trim()}
                      className="w-full py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors"
                    >
                      {selectedMessage.isFlagged ? 'Unflag Message' : 'Flag Message'}
                    </button>
                  )}

                  {selectedUser && (
                    <button
                      onClick={() => {
                        handleUserAction(selectedUser, actionType, actionReason);
                        setActionReason('');
                      }}
                      disabled={isSendingAction || !actionReason.trim()}
                      className="w-full py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors"
                    >
                      Execute Action
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <i className="fa-solid fa-hand-pointer text-4xl mb-2 text-gray-300"></i>
                  <p className="text-sm">Select a message or user to take action</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModerationView;
