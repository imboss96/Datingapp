import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

interface ModeratedChat {
  id: string;
  participants: Array<{ id: string; name: string; username: string; avatar?: string }>;
  participantIds: string[];
  messageCount: number;
  lastUpdated: number;
  markedAsRepliedAt?: number;
  isReplied: boolean;
  replyStatus: 'replied' | 'unreplied';
  unreadCounts: Record<string, number>;
}

interface ModeratedChatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  moderatorId: string;
}

const ModeratedChatsModal: React.FC<ModeratedChatsModalProps> = ({ isOpen, onClose, moderatorId }) => {
  const [chats, setChats] = useState<ModeratedChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'replied' | 'unreplied'>('all');

  useEffect(() => {
    if (isOpen) {
      fetchModeratedChats();
    }
  }, [isOpen, moderatorId]);

  const fetchModeratedChats = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.getModeratedChats();
      if (response.success) {
        setChats(response.moderatedChats || []);
      }
    } catch (err) {
      console.error('Error fetching moderated chats:', err);
      setError('Failed to load moderated chats');
      // Fallback with empty data
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter((chat) => {
    if (filter === 'replied') return chat.isReplied || chat.replyStatus === 'replied';
    if (filter === 'unreplied') return !chat.isReplied && chat.replyStatus !== 'replied';
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 flex items-center justify-between border-b">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-comments"></i>
            Moderated Chats
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center transition-all"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Filter Buttons */}
          <div className="flex gap-2 items-center">
            <span className="text-sm font-bold text-gray-700">Filter:</span>
            {[
              { id: 'all', label: 'All', icon: 'fa-list' },
              { id: 'replied', label: 'Replied', icon: 'fa-check' },
              { id: 'unreplied', label: 'Unreplied', icon: 'fa-clock' }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilter(btn.id as any)}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                  filter === btn.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <i className={`fa-solid ${btn.icon}`}></i>
                {btn.label}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
              <p className="text-gray-600 text-xs">Total Chats</p>
              <p className="font-bold text-blue-600 text-lg">{chats.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
              <p className="text-gray-600 text-xs">Replied</p>
              <p className="font-bold text-green-600 text-lg">{chats.filter(c => c.isReplied).length}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-200">
              <p className="text-gray-600 text-xs">Unreplied</p>
              <p className="font-bold text-amber-600 text-lg">{chats.filter(c => !c.isReplied).length}</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <i className="fa-solid fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8 text-gray-500">
              <i className="fa-solid fa-spinner animate-spin text-2xl mb-2"></i>
              <p>Loading chats...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredChats.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
              <i className="fa-solid fa-inbox text-4xl mb-2 text-gray-300"></i>
              <p className="font-bold">No {filter !== 'all' ? filter : ''} chats found</p>
              <p className="text-sm">Chats you've moderated will appear here</p>
            </div>
          )}

          {/* Chats List */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {filteredChats.map((chat) => {
              const participant1 = chat.participants?.[0];
              const participant2 = chat.participants?.[1];
              const hasReplied = chat.isReplied || chat.replyStatus === 'replied';

              return (
                <div
                  key={chat.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    hasReplied
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Participants */}
                      <div className="flex items-center gap-2 mb-2">
                        {participant1?.avatar && (
                          <img
                            src={participant1.avatar}
                            alt={participant1.name}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <p className="text-sm font-bold text-gray-900">
                          {participant1?.name || 'User'} → {participant2?.name || 'Operator'}
                        </p>
                      </div>

                      {/* Usernames */}
                      <p className="text-xs text-gray-600 mb-2">
                        @{participant1?.username || 'user'} | @{participant2?.username || 'operator'}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <i className="fa-solid fa-comments"></i>
                          {chat.messageCount} messages
                        </span>
                        <span className="flex items-center gap-1">
                          <i className="fa-solid fa-calendar"></i>
                          {new Date(chat.markedAsRepliedAt || chat.lastUpdated).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex-shrink-0 ml-4">
                      {hasReplied ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white">
                            <i className="fa-solid fa-check"></i>
                          </div>
                          <span className="text-xs font-bold text-green-600">Replied</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                            <i className="fa-solid fa-clock"></i>
                          </div>
                          <span className="text-xs font-bold text-amber-600">Pending</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chat ID */}
                  <p className="text-xs text-gray-500 mt-3 border-t border-current/10 pt-2">
                    Chat ID: {chat.id}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchModeratedChats}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-refresh"></i>
            Refresh Chats
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModeratedChatsModal;
