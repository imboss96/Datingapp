import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import apiClient from '../services/apiClient';
import { formatLastSeen } from '../services/lastSeenUtils';
import ChatOptionsModal from './ChatOptionsModal';
import { useAlert } from '../services/AlertContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatData {
  id: string;
  participants: string[];
  messages: Array<{
    id: string;
    senderId: string;
    text: string;
    timestamp: number;
  }>;
  lastUpdated: number;
  unreadCount?: number;
}

// ─── Cache Helpers ────────────────────────────────────────────────────────────

const CACHE_KEY_CHATS = 'cached_chats';
const CACHE_KEY_USERS = 'cached_users';
const CACHE_KEY_TIME  = 'cached_chats_time';
const CACHE_TTL_MS    = 5 * 60 * 1000; // 5 minutes

const readCache = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
};

const writeCache = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage full – ignore */ }
};

const isCacheStale = (): boolean => {
  const ts = localStorage.getItem(CACHE_KEY_TIME);
  return !ts || Date.now() - parseInt(ts, 10) > CACHE_TTL_MS;
};

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

const deduplicateAndSort = (chatsData: ChatData[]): ChatData[] => {
  const seen: Record<string, ChatData> = {};
  const result: ChatData[] = [];

  for (const chat of chatsData) {
    const key = [...(chat.participants ?? [])].sort().join(':');
    if (!seen[key]) {
      seen[key] = chat;
      result.push(chat);
    } else if (chat.lastUpdated > seen[key].lastUpdated) {
      result[result.indexOf(seen[key])] = chat;
      seen[key] = chat;
    }
  }

  return result.sort((a, b) => {
    const unreadDiff = (b.unreadCount ?? 0) - (a.unreadCount ?? 0);
    return unreadDiff !== 0 ? unreadDiff : b.lastUpdated - a.lastUpdated;
  });
};

const getLastMessage = (chat: ChatData): string =>
  chat.messages?.length ? chat.messages[chat.messages.length - 1].text : 'No messages yet';

const getTimeAgo = (timestamp: number): string => {
  const diff  = Date.now() - timestamp;
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  <  1) return 'now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

const ChatSkeleton: React.FC = () => (
  <div className="divide-y divide-gray-50">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
        <div className="w-14 h-14 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
          <div className="h-2 bg-gray-100 rounded w-1/4" />
        </div>
      </div>
    ))}
  </div>
);

// ─── Avatar with fallback ─────────────────────────────────────────────────────

const Avatar: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
  const [errored, setErrored] = useState(false);
  const initials = alt.slice(0, 2).toUpperCase();

  if (!src || errored) {
    return (
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-sm border border-gray-100">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
      className="w-14 h-14 rounded-full object-cover shadow-sm border border-gray-100"
    />
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const ChatList: React.FC<{ currentUser?: UserProfile }> = ({ currentUser }) => {
  const navigate          = useNavigate();
  const { showAlert }     = useAlert();
  const fetchingUsersRef  = useRef<Record<string, boolean>>({});
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialise from cache immediately so the UI is never blank
  const initialChats = readCache<ChatData>(CACHE_KEY_CHATS);
  const initialUsers = readCache<UserProfile>(CACHE_KEY_USERS);

  const [chats,      setChats]      = useState<ChatData[]>(initialChats);
  const [allUsers,   setAllUsers]   = useState<UserProfile[]>(initialUsers);
  const [loading,    setLoading]    = useState(initialChats.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  // Options modal
  const [optionsModalOpen,     setOptionsModalOpen]     = useState(false);
  const [selectedChatId,       setSelectedChatId]       = useState<string | null>(null);
  const [selectedChatUsername, setSelectedChatUsername] = useState('');
  const [optionsLoading,       setOptionsLoading]       = useState(false);

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadData = useCallback(async (silent: boolean) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);

      // Step 1: fetch chats only
      const chatsData = await apiClient.getChats();
      const sorted = deduplicateAndSort(chatsData);

      // Step 2: fetch only the participants we need (not ALL users)
      const participantIds = [
        ...new Set(
          sorted
            .flatMap((c) => c.participants)
            .filter((id) => id !== currentUser?.id)
        ),
      ];

      // Fetch all participants in parallel, skip ones we already have cached
      const cachedUsers = readCache<UserProfile>(CACHE_KEY_USERS);
      const cachedIds   = new Set(cachedUsers.map((u: any) => u?.id));
      const missingIds  = participantIds.filter((id) => !cachedIds.has(id));

      const fetchedUsers = await Promise.all(
        missingIds.map((id) => apiClient.getUser(id).catch(() => null))
      );

      const newUsers = fetchedUsers
        .filter(Boolean)
        .map((u: any) => ({
          ...u,
          lastSeen: u.lastActiveAt ? new Date(u.lastActiveAt).getTime() : undefined,
          isOnline: u.isOnline ?? false,
        })) as UserProfile[];

      // Merge newly fetched with already cached
      const mergedUsers = [
        ...cachedUsers.filter((u: any) => participantIds.includes(u?.id)),
        ...newUsers,
      ];

      setChats(sorted);
      setAllUsers(mergedUsers);

      writeCache(CACHE_KEY_CHATS, sorted);
      writeCache(CACHE_KEY_USERS, mergedUsers);
      writeCache(CACHE_KEY_TIME,  Date.now());
    } catch (err) {
      console.error('[ChatList] Failed to load data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  // Initial load — use cache if fresh, otherwise fetch
  useEffect(() => {
    const silent = initialChats.length > 0;
    if (!silent || isCacheStale()) loadData(silent);
  }, [loadData]);

  // Re-fetch silently when a new WebSocket message arrives
  useEffect(() => {
    const handleNewMessage = () => loadData(true);
    window.addEventListener('ws:new_message', handleNewMessage);
    return () => window.removeEventListener('ws:new_message', handleNewMessage);
  }, [loadData]);

  // ── User resolution ─────────────────────────────────────────────────────────

  const getOtherUser = useCallback((chat: ChatData): UserProfile | null => {
    if (!currentUser) return null;
    const otherId = chat.participants.find(id => id !== currentUser.id);
    if (!otherId) return null;

    const found = allUsers.find(u => u?.id === otherId);

    // Lazy-fetch any participant still missing after initial load
    if (!found && !fetchingUsersRef.current[otherId]) {
      fetchingUsersRef.current[otherId] = true;
      apiClient.getUser(otherId)
        .then(u => {
          if (!u) return;
          const mapped = {
            ...u,
            lastSeen: u.lastActiveAt ? new Date(u.lastActiveAt).getTime() : undefined,
            isOnline: u.isOnline ?? false,
          };
          setAllUsers(prev => {
            if (prev.find(p => p?.id === mapped.id)) return prev;
            const updated = [...prev, mapped];
            writeCache(CACHE_KEY_USERS, updated);
            return updated;
          });
        })
        .catch(() => {})
        .finally(() => { fetchingUsersRef.current[otherId] = false; });
    }

    return found ?? null;
  }, [currentUser, allUsers]);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const openChat = useCallback((chatId: string, otherUser: UserProfile | null) => {
    navigate(`/chat/${otherUser?.id ?? chatId}`, { state: { matchedProfile: otherUser } });
  }, [navigate]);

  const handleChatClick = (e: React.MouseEvent, chatId: string, otherUser: UserProfile | null) => {
    if (optionsModalOpen) { e.stopPropagation(); return; }
    e.stopPropagation();
    openChat(chatId, otherUser);
  };

  // ── Long-press ──────────────────────────────────────────────────────────────

  const handleTouchStart = (chatId: string, username: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setSelectedChatId(chatId);
      setSelectedChatUsername(username);
      setOptionsModalOpen(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // ── Chat actions ────────────────────────────────────────────────────────────

  const removeChat = (id: string) => {
    setChats(prev => {
      const updated = prev.filter(c => c.id !== id);
      writeCache(CACHE_KEY_CHATS, updated);
      return updated;
    });
  };

  const handleDeleteChat = async () => {
    if (!selectedChatId) return;
    try {
      setOptionsLoading(true);
      await apiClient.deleteChat(selectedChatId);
      removeChat(selectedChatId);
      setOptionsModalOpen(false);
    } catch {
      showAlert('Error', 'Failed to delete chat. Please try again.');
    } finally {
      setOptionsLoading(false);
      setSelectedChatId(null);
      setSelectedChatUsername('');
    }
  };

  const handleBlockChat = async () => {
    if (!selectedChatId) return;
    try {
      setOptionsLoading(true);
      await apiClient.blockChatRequest(selectedChatId);
      removeChat(selectedChatId);
      setOptionsModalOpen(false);
    } catch {
      showAlert('Error', 'Failed to block chat. Please try again.');
    } finally {
      setOptionsLoading(false);
      setSelectedChatId(null);
      setSelectedChatUsername('');
    }
  };

  const closeOptionsModal = () => {
    setOptionsModalOpen(false);
    setSelectedChatId(null);
    setSelectedChatUsername('');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-full bg-white flex flex-col pointer-events-auto">

      {/* Header */}
      <div className="md:hidden p-4 border-b flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Messages</h2>
        {refreshing && (
          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Body */}
      {loading ? (
        <ChatSkeleton />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              Conversations ({chats.length})
            </h3>
          </div>

          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <i className="fa-solid fa-message text-4xl text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No conversations yet. Start swiping to match!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {chats.map(chat => {
                const otherUser = getOtherUser(chat);
                if (!otherUser) return null;

                const unread   = chat.unreadCount ?? 0;
                const username = otherUser.username || otherUser.name;

                return (
                  <div
                    key={chat.id}
                    role="button"
                    tabIndex={0}
                    onClick={e => handleChatClick(e, chat.id, otherUser)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openChat(chat.id, otherUser);
                      }
                    }}
                    onTouchStart={() => handleTouchStart(chat.id, username)}
                    onTouchEnd={handleTouchEnd}
                    onContextMenu={e => {
                      e.preventDefault();
                      setSelectedChatId(chat.id);
                      setSelectedChatUsername(username);
                      setOptionsModalOpen(true);
                    }}
                    className={`flex items-center gap-4 p-4 transition-colors cursor-pointer pointer-events-auto ${
                      unread > 0 ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50 active:bg-gray-100'
                    }`}
                  >
                    {/* Avatar with online indicator */}
                    <div className="relative shrink-0">
                      <Avatar src={otherUser.images?.[0]} alt={username} />
                      {otherUser.isOnline && (
                        <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                      )}
                    </div>

                    {/* Chat info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <h4 className={`text-gray-900 truncate text-sm ${unread > 0 ? 'font-black' : 'font-bold'}`}>
                          {username}
                        </h4>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {unread > 0 && (
                            <span className="inline-flex items-center justify-center bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                              {unread > 9 ? '9+' : unread}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                            {getTimeAgo(chat.lastUpdated)}
                          </span>
                        </div>
                      </div>

                      <p className={`text-xs truncate font-medium ${unread > 0 ? 'text-gray-600 font-semibold' : 'text-gray-400'}`}>
                        {getLastMessage(chat)}
                      </p>

                      <span className={`text-[10px] font-semibold uppercase tracking-tight ${otherUser.isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {formatLastSeen(otherUser.lastSeen, !!otherUser.isOnline)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Options Modal */}
      <ChatOptionsModal
        isOpen={optionsModalOpen}
        onClose={closeOptionsModal}
        onDelete={handleDeleteChat}
        onBlock={handleBlockChat}
        chatUsername={selectedChatUsername}
        loading={optionsLoading}
      />
    </div>
  );
};

export default ChatList;