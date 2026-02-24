import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

interface AssignedChat {
  id: string;
  participants: any[];
  messages: any[];
  lastUpdated: number;
  supportStatus: string;
}

const ModeratorChatPanel: React.FC = () => {
  const navigate = useNavigate();
  const [assignedChats, setAssignedChats] = useState<AssignedChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<AssignedChat | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    fetchAssignedChats();
  }, []);

  const fetchAssignedChats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAssignedChats();
      setAssignedChats(response.assignedChats || []);
    } catch (error) {
      console.error('Failed to fetch assigned chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedChat || !messageText.trim()) return;

    try {
      await apiClient.sendModeratorMessage(selectedChat.id, messageText.trim());
      setMessageText('');
      // Refresh chat data
      fetchAssignedChats();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const resolveChat = async (chatId: string) => {
    try {
      await apiClient.resolveSupportChat(chatId);
      fetchAssignedChats();
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
      }
    } catch (error) {
      console.error('Failed to resolve chat:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-medium">Loading assigned chats...</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-white md:bg-[#f0f2f5] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="md:hidden text-gray-500 hover:text-red-500 transition-colors">
            <i className="fa-solid fa-chevron-left text-lg"></i>
          </button>
          <div className="flex-1">
            <h3 className="font-black text-gray-900 text-xl">Support Chats</h3>
            <p className="text-xs text-gray-500 mt-1">Assigned conversations needing assistance</p>
          </div>
          <button
            onClick={fetchAssignedChats}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 items-center justify-center transition-colors flex"
            title="Refresh"
          >
            <i className="fa-solid fa-rotate-right"></i>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Chat List */}
        <div className="w-full md:w-80 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <h4 className="font-bold text-gray-900 text-sm">Assigned Chats ({assignedChats.length})</h4>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {assignedChats.length === 0 ? (
              <div className="text-center py-12 px-4">
                <i className="fa-solid fa-inbox text-4xl text-gray-200 mb-2"></i>
                <p className="text-gray-400 text-sm">No assigned chats</p>
                <p className="text-gray-300 text-xs mt-1">Chats will appear here when assigned by admins</p>
              </div>
            ) : (
              assignedChats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedChat?.id === chat.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex -space-x-2">
                      {chat.participants.slice(0, 2).map((participant, idx) => (
                        <img
                          key={idx}
                          src={participant?.profilePicture || 'https://via.placeholder.com/32x32?text=?'}
                          alt={participant?.name}
                          className="w-8 h-8 rounded-full border-2 border-white"
                        />
                      ))}
                    </div>
                    <div className="flex-1">
                      <h5 className="text-sm font-bold text-gray-900">
                        {chat.participants.map(p => p?.name).join(' & ')}
                      </h5>
                      <p className="text-xs text-gray-500">
                        {chat.supportStatus === 'active' ? 'Active Support' : 'Assigned'}
                      </p>
                    </div>
                  </div>
                  
                  {chat.messages.length > 0 && (
                    <p className="text-xs text-gray-600 truncate">
                      {chat.messages[chat.messages.length - 1]?.text}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">
                      {new Date(chat.lastUpdated).toLocaleDateString()}
                    </span>
                    {chat.supportStatus === 'active' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat View */}
        {selectedChat ? (
          <div className="flex-1 flex flex-col bg-white">
            {/* Chat Header */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {selectedChat.participants.slice(0, 2).map((participant, idx) => (
                      <img
                        key={idx}
                        src={participant?.profilePicture || 'https://via.placeholder.com/32x32?text=?'}
                        alt={participant?.name}
                        className="w-10 h-10 rounded-full border-2 border-white"
                      />
                    ))}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">
                      {selectedChat.participants.map(p => p?.name).join(' & ')}
                    </h4>
                    <p className="text-xs text-gray-500">Support Chat</p>
                  </div>
                </div>
                
                <button
                  onClick={() => resolveChat(selectedChat.id)}
                  className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded hover:bg-green-600 transition-colors"
                >
                  Resolve
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedChat.messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.isEditedByModerator ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-2xl ${
                      message.isEditedByModerator
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <div className={`text-xs mt-1 ${
                      message.isEditedByModerator ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                      {message.isEditedByModerator && (
                        <span className="ml-2 font-bold">MODERATOR</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your support message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageText.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <i className="fa-solid fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <i className="fa-solid fa-comments text-6xl text-gray-200 mb-4"></i>
              <h3 className="text-lg font-bold text-gray-400 mb-2">Select a Chat</h3>
              <p className="text-gray-500">Choose a support chat from the list to start helping</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModeratorChatPanel;