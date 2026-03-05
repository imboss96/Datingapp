import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import apiClient from '../services/apiClient';
import { formatLastSeen } from '../services/lastSeenUtils';
import ChatOptionsModal from './ChatOptionsModal';
import { useAlert } from '../services/AlertContext';

// ─── Types ────────────────────────────────────────────────────────────────────

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
const CACHE_TTL_MS    = 30 * 1000;

const readCache = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
};

const writeCache = (key: string, value: unknown): void => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

const isCacheStale = (): boolean => {
  const ts = localStorage.getItem(CACHE_KEY_TIME);
  return !ts || Date.now() - parseInt(ts, 10) > CACHE_TTL_MS;
};

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

const deduplicateAndSort = (chatsData: ChatData[]): ChatData[] => {
  if (!chatsData || chatsData.length === 0) return [];
  const chatsByParticipant: Record<string, ChatData> = {};
  let duplicatesFound = 0;
  for (const chat of chatsData) {
    if (!chat.id || !Array.isArray(chat.participants)) continue;
    const normalized = chat.participants
      .filter((p: string) => p && typeof p === 'string')
      .map((p: string) => p.trim().toLowerCase())
      .sort();
    const key = normalized.join('_');
    if (!key) continue;
    if (!chatsByParticipant[key]) {
      chatsByParticipant[key] = chat;
    } else {
      const existing = chatsByParticipant[key];
      if ((chat.lastUpdated || 0) > (existing.lastUpdated || 0)) {
        chatsByParticipant[key] = chat;
      }
      duplicatesFound++;
    }
  }
  const result = Object.values(chatsByParticipant);
  return result.sort((a, b) => {
    const unreadA = a.unreadCount ?? 0;
    const unreadB = b.unreadCount ?? 0;
    if (unreadA !== unreadB) return unreadB - unreadA;
    return (b.lastUpdated || 0) - (a.lastUpdated || 0);
  });
};

const getLastMessage = (chat: ChatData, currentUserId?: string): { text: string; isMe: boolean } => {
  if (!chat.messages?.length) return { text: 'No messages yet', isMe: false };
  const last = chat.messages[chat.messages.length - 1];
  return { text: last.text, isMe: last.senderId === currentUserId };
};

const getTimeAgo = (timestamp: number): string => {
  const diff  = Date.now() - timestamp;
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  <  1) return 'now';
  if (mins  < 60) return `${mins} min`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

const ChatSkeleton: React.FC = () => (
  <div className="divide-y divide-gray-50 mt-2">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
        <div className="w-14 h-14 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-gray-200 rounded-full w-1/3" />
          <div className="h-3 bg-gray-100 rounded-full w-2/3" />
        </div>
        <div className="h-2.5 bg-gray-100 rounded w-10" />
      </div>
    ))}
  </div>
);

// ─── Avatar ───────────────────────────────────────────────────────────────────

const Avatar: React.FC<{
  src?: string;
  alt: string;
  size?: 'sm' | 'md';
  hasRing?: boolean;
  isOnline?: boolean;
}> = ({ src, alt, size = 'md', hasRing = false, isOnline = false }) => {
  const [errored, setErrored] = useState(false);
  const initials = alt.slice(0, 2).toUpperCase();

  // Outer wrapper sizing (includes ring padding)
  const outerDim  = size === 'sm' ? 'w-[68px] h-[68px]' : 'w-[60px] h-[60px]';
  // Inner image sizing (slightly smaller to leave room for ring gap)
  const innerDim  = size === 'sm' ? 'w-[58px] h-[58px]' : 'w-[52px] h-[52px]';

  return (
    <div className={`relative shrink-0 flex items-center justify-center ${outerDim}`}>
      {/* Gradient ring */}
      {hasRing && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #f72585, #ff6b9d, #c9184a)',
            padding: '2.5px',
          }}
        >
          <div className="w-full h-full rounded-full bg-white" />
        </div>
      )}

      {/* Avatar */}
      <div className={`relative z-10 ${innerDim} rounded-full overflow-hidden`}>
        {!src || errored ? (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-base">
            {initials}
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setErrored(true)}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Online dot */}
      {isOnline && (
        <span className="absolute bottom-0.5 right-0.5 z-20 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
      )}
    </div>
  );
};

// ─── Activity Story Item ──────────────────────────────────────────────────────

const ActivityItem: React.FC<{ user: UserProfile; isCurrentUser?: boolean; onClick: () => void }> = ({
  user, isCurrentUser = false, onClick,
}) => {
  const name = isCurrentUser ? 'You' : (user.username || user.name).split(' ')[0];
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0 group"
    >
      <Avatar
        src={user.images?.[0]}
        alt={name}
        size="sm"
        hasRing={true}
        isOnline={user.isOnline}
      />
      <span className="text-[12px] font-semibold text-gray-700 group-hover:text-rose-500 transition-colors max-w-[68px] truncate">
        {name}
      </span>
    </button>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const ChatList: React.FC<{ currentUser?: UserProfile }> = ({ currentUser }) => {
  const navigate         = useNavigate();
  const { showAlert }    = useAlert();
  const fetchingUsersRef = useRef<Record<string, boolean>>({});
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  let initialChats = readCache<ChatData>(CACHE_KEY_CHATS);
  initialChats = deduplicateAndSort(initialChats);
  const initialUsers = readCache<UserProfile>(CACHE_KEY_USERS);

  const [chats,       setChats]      = useState<ChatData[]>(initialChats);
  const [allUsers,    setAllUsers]   = useState<UserProfile[]>(initialUsers);
  const [loading,     setLoading]    = useState(initialChats.length === 0);
  const [refreshing,  setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [optionsModalOpen,     setOptionsModalOpen]     = useState(false);
  const [selectedChatId,       setSelectedChatId]       = useState<string | null>(null);
  const [selectedChatUsername, setSelectedChatUsername] = useState('');
  const [optionsLoading,       setOptionsLoading]       = useState(false);

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadData = useCallback(async (silent: boolean) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      const chatsData     = await apiClient.getChats();
      const dedupedFromApi = deduplicateAndSort(chatsData);

      const participantIds = [
        ...new Set(
          dedupedFromApi
            .flatMap((c) => c.participants)
            .filter((id) => id !== currentUser?.id)
        ),
      ];

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

      const mergedUsers = [
        ...cachedUsers.filter((u: any) => participantIds.includes(u?.id)),
        ...newUsers,
      ];

      setChats(dedupedFromApi);
      setAllUsers(mergedUsers);
      writeCache(CACHE_KEY_CHATS, dedupedFromApi);
      writeCache(CACHE_KEY_USERS, mergedUsers);
      writeCache(CACHE_KEY_TIME,  Date.now());
    } catch (err) {
      console.error('[ChatList] Failed to load data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const silent = initialChats.length > 0 && !isCacheStale();
    loadData(silent);
  }, [loadData]);

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
    navigate(`/chat/${chatId}`, { state: { matchedProfile: otherUser } });
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
      const updated = deduplicateAndSort(prev.filter(c => c.id !== id));
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
      showAlert('Success', 'Conversation deleted');
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
      showAlert('Success', 'Conversation blocked');
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

  // ── Filtered chats ──────────────────────────────────────────────────────────

  const filteredChats = chats.filter(chat => {
    if (!searchQuery.trim()) return true;
    const otherUser = getOtherUser(chat);
    if (!otherUser) return false;
    const username = (otherUser.username || otherUser.name).toLowerCase();
    return username.includes(searchQuery.toLowerCase());
  });

  // ── Activity bar users (recent chat partners) ───────────────────────────────

  const activityUsers = chats
    .slice(0, 8)
    .map(chat => getOtherUser(chat))
    .filter((u): u is UserProfile => u !== null);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    /* Outer shell: white background */
    <div className="h-full flex flex-col bg-white">

      {/* Header lives on white background */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 shrink-0">
        <h1 className="text-[30px] font-extrabold text-gray-900 tracking-tight">Messages</h1>
        <div className="flex items-center gap-2">
          {refreshing && (
            <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          )}
          <button
            onClick={() => loadData(true)}
            className="w-10 h-10 rounded-xl border border-rose-100 bg-white/70 flex items-center justify-center text-gray-500 hover:text-rose-500 transition-colors shadow-sm"
            title="Refresh"
          >
            {/* Filter / sliders icon matching screenshot */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4"  y1="6"  x2="20" y2="6"/>
              <line x1="8"  y1="6"  x2="8"  y2="3"/>
              <line x1="16" y1="6"  x2="16" y2="3"/>
              <line x1="4"  y1="12" x2="20" y2="12"/>
              <line x1="10" y1="12" x2="10" y2="9"/>
              <line x1="4"  y1="18" x2="20" y2="18"/>
              <line x1="14" y1="18" x2="14" y2="15"/>
            </svg>
          </button>
        </div>
      </div>

      {/* White card with rounded top corners */}
      <div className="flex-1 bg-white rounded-t-[28px] flex flex-col overflow-hidden shadow-[0_-4px_24px_rgba(200,60,120,0.08)]">

        {/* Search */}
        <div className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2.5 bg-gray-100 rounded-2xl px-4 py-3">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>
            </svg>
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none font-medium"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <ChatSkeleton />
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0">

            {/* Activities */}
            {activityUsers.length > 0 && !searchQuery && (
              <div className="px-5 pt-2 pb-4 shrink-0">
                <h2 className="text-[16px] font-extrabold text-gray-900 mb-4">Activities</h2>
                <div className="flex gap-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {currentUser && (
                    <ActivityItem user={currentUser} isCurrentUser onClick={() => {}} />
                  )}
                  {activityUsers.map(user => (
                    <ActivityItem
                      key={user.id}
                      user={user}
                      onClick={() => {
                        const chat = chats.find(c => c.participants.includes(user.id));
                        if (chat) openChat(chat.id, user);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Messages section title */}
            <div className="px-5 pb-2">
              <h2 className="text-[16px] font-extrabold text-gray-900">Messages</h2>
            </div>

            {filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                </div>
                <p className="text-gray-800 font-bold text-base">No conversations yet</p>
                <p className="text-gray-400 text-sm mt-1">Start swiping to find your match!</p>
              </div>
            ) : (
              <div className="pb-6">
                {filteredChats.map((chat, index) => {
                  const otherUser = getOtherUser(chat);
                  if (!otherUser) return null;

                  const unread    = chat.unreadCount ?? 0;
                  const username  = otherUser.username || otherUser.name;
                  const lastMsg   = getLastMessage(chat, currentUser?.id);
                  const timeLabel = getTimeAgo(chat.lastUpdated);

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
                      className="flex items-center gap-3.5 px-5 py-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
                    >
                      {/* Avatar with ring always shown */}
                      <Avatar
                        src={otherUser.images?.[0]}
                        alt={username}
                        hasRing={true}
                        isOnline={otherUser.isOnline}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                          <span className={`text-[15px] truncate ${unread > 0 ? 'font-extrabold text-gray-900' : 'font-bold text-gray-800'}`}>
                            {username}
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium shrink-0">
                            {timeLabel}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-[13px] truncate ${unread > 0 ? 'text-gray-700 font-semibold' : 'text-gray-400 font-normal'}`}>
                            {lastMsg.isMe && <span className="text-gray-400">You: </span>}
                            {lastMsg.text}
                          </p>
                          {unread > 0 && (
                            <span className="min-w-[20px] h-5 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center px-1.5 shrink-0">
                              {unread > 9 ? '9+' : unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

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