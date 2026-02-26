import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './src/globals.css';
import LandingPage from './components/LandingPage';
import VerifyEmailInfoPage from './components/VerifyEmailInfoPage';
import VerifyEmailPage from './components/VerifyEmailPage';
import LoginPage from './components/LoginPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import SwiperScreen from "./components/SwiperScreen";
import ChatList from './components/ChatList';
import ChatRoom from './components/ChatRoom';
import ModeratorPanel from './components/ModeratorPanel';
import ModeratorChatPanel from './components/ModeratorChatPanel';
import ProfileSettings from './components/ProfileSettings';
import ProfileSetup from './components/ProfileSetup';
import Navigation from './components/Navigation';
import Sidebar from './components/Sidebar';
import MatchNotificationCenter from './components/MatchNotificationCenter';
import MatchesPage from './components/MatchesPage';
import ErrorBoundary from './components/ErrorBoundary';
import TermsPage from './components/TermsPage';
import PrivacyPage from './components/PrivacyPage';
import CookiePolicyPage from './components/CookiePolicyPage';
import { WebSocketProvider } from './services/WebSocketProvider';
import { AlertProvider } from './services/AlertContext';
import { UserProfile, UserRole, Chat, VerificationStatus } from './types';
import apiClient from './services/apiClient';

const INITIAL_ME: UserProfile = {
  id: 'me',
  name: 'Alex',
  age: 28,
  bio: 'Product Designer at Spark. I love code and design.',
  images: ['https://picsum.photos/400/600?random=100'],
  isPremium: false,
  role: UserRole.ADMIN,
  location: 'New York, NY',
  interests: ['Design', 'Chess', 'Running'],
  coins: 10,
  verification: { status: VerificationStatus.UNVERIFIED },
  blockedUsers: [],
  reportedUsers: []
};

const AppContent: React.FC<{
  currentUser: UserProfile | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  isAdmin: boolean;
  isModerator: boolean;
  showLoginModal: boolean;
  setShowLoginModal: React.Dispatch<React.SetStateAction<boolean>>;
  showProfileSetup: boolean;
  setShowProfileSetup: React.Dispatch<React.SetStateAction<boolean>>;
  newSignupUser: UserProfile | null;
  setNewSignupUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  totalUnreadCount: number;
  userCoords: [number, number] | null; // ✅ live GPS coords
}> = ({
  currentUser, setCurrentUser, isAdmin, isModerator,
  showLoginModal, setShowLoginModal,
  showProfileSetup, setShowProfileSetup,
  newSignupUser, setNewSignupUser,
  totalUnreadCount,
  userCoords // ✅
}) => {
  const [darkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      // initialize from preference or stored value; no manual toggle provided
      return localStorage.getItem('theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith('/chat/');
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [emailToVerify, setEmailToVerify] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showCookies, setShowCookies] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  const hasAcceptedLegal = currentUser ? (
    currentUser.termsOfServiceAccepted &&
    currentUser.privacyPolicyAccepted
  ) : false;

  if (!currentUser || !currentUser.id) {
    return (
      <>
        <Routes>
          <Route path="/" element={<LandingPage onOpenLoginModal={() => setShowLoginModal(true)} />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email-info" element={<VerifyEmailInfoPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/terms" element={<TermsPage onAccept={() => setShowTerms(false)} isModal={true} />} />
          <Route path="/privacy" element={<PrivacyPage onAccept={() => setShowPrivacy(false)} isModal={true} />} />
          <Route path="/cookies" element={<CookiePolicyPage onAccept={() => setShowCookies(false)} isModal={true} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        {showLoginModal && !showProfileSetup && (
          <LoginPage
            isModal={true}
            onClose={() => setShowLoginModal(false)}
            onLoginSuccess={(user, isSignup) => {
              console.log('[DEBUG App] Login success - user:', { id: user.id, name: user.name, isSignup });
              if (isSignup) {
                setNewSignupUser(user);
                setEmailToVerify(user.name + '@lunesa.com');
                setShowTerms(true);
              } else {
                if (user.termsOfServiceAccepted && user.privacyPolicyAccepted) {
                  setCurrentUser(user);
                } else {
                  setNewSignupUser(user);
                  setShowTerms(true);
                }
              }
              setShowLoginModal(false);
            }}
          />
        )}

        {showTerms && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
            <div className="w-full h-screen max-w-4xl bg-white">
              <TermsPage
                onAccept={() => { setShowTerms(false); setShowPrivacy(true); }}
                onClose={() => setShowTerms(false)}
                isModal={true}
              />
            </div>
          </div>
        )}
        {showPrivacy && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
            <div className="w-full h-screen max-w-4xl bg-white">
              <PrivacyPage
                onAccept={() => { setShowPrivacy(false); setShowCookies(true); }}
                onClose={() => { setShowPrivacy(false); setShowTerms(true); }}
                isModal={true}
              />
            </div>
          </div>
        )}
        {showCookies && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
            <div className="w-full h-screen max-w-4xl bg-white">
              <CookiePolicyPage
                onAccept={async () => {
                  setShowCookies(false);
                  if (newSignupUser) {
                    try {
                      await apiClient.updateProfile(newSignupUser.id, {
                        termsOfServiceAccepted: true,
                        privacyPolicyAccepted: true,
                        cookiePolicyAccepted: true,
                        legalAcceptanceDate: new Date().toISOString()
                      });
                      const refreshed = await apiClient.getCurrentUser();
                      const persistedUser = refreshed as UserProfile;
                      const needsProfileSetup = !persistedUser.interests || persistedUser.interests.length === 0 || !persistedUser.location || !persistedUser.age;
                      if (needsProfileSetup) {
                        setNewSignupUser(persistedUser);
                        setShowProfileSetup(true);
                      } else {
                        setCurrentUser(persistedUser);
                        setNewSignupUser(null);
                      }
                    } catch (err) {
                      console.warn('[DEBUG App] Failed to persist legal acceptance:', err);
                    }
                  }
                }}
                onClose={() => { setShowCookies(false); setShowPrivacy(true); }}
                isModal={true}
              />
            </div>
          </div>
        )}

        {showProfileSetup && newSignupUser && (
          <div className="fixed inset-0 backdrop-blur-md bg-white/20 flex items-center justify-center p-4 z-50" style={{ width: '100vw', height: '100vh' }}>
            <ProfileSetup
              userId={newSignupUser.id}
              name={newSignupUser.name}
              email={newSignupUser.name + '@lunesa.com'}
              profilePicture={newSignupUser.images?.[0]}
              onComplete={(userData: any) => {
                let interests: string[] = [];
                if (userData.interests) {
                  if (Array.isArray(userData.interests)) {
                    interests = userData.interests;
                  } else if (typeof userData.interests === 'string') {
                    interests = userData.interests.split(',').map((i: string) => i.trim()).filter((i: string) => i);
                  }
                }
                const completeUser: UserProfile = {
                  ...newSignupUser,
                  age: parseInt(userData.age) || newSignupUser.age,
                  bio: userData.bio || newSignupUser.bio,
                  location: userData.location || newSignupUser.location,
                  interests,
                  termsOfServiceAccepted: true,
                  privacyPolicyAccepted: true,
                  cookiePolicyAccepted: true
                };
                setCurrentUser(completeUser);
                setShowProfileSetup(false);
                setNewSignupUser(null);
              }}
              onCancel={() => {
                setShowProfileSetup(false);
                setNewSignupUser(null);
                setShowLoginModal(true);
              }}
            />
          </div>
        )}
      </>
    );
  }

  if (!hasAcceptedLegal) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Accept Our Policies</h1>
          <p className="text-gray-600 mb-6">To continue using the app, you need to accept our Terms of Service, Privacy Policy, and Cookie Policy.</p>
          <div className="space-y-3">
            <button onClick={() => setShowTerms(true)} className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold py-3 rounded-lg hover:from-pink-600 hover:to-red-600 transition">Review Terms of Service</button>
            <button onClick={() => setShowPrivacy(true)} className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold py-3 rounded-lg hover:from-pink-600 hover:to-red-600 transition">Review Privacy Policy</button>
            <button onClick={() => setShowCookies(true)} className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold py-3 rounded-lg hover:from-pink-600 hover:to-red-600 transition">Review Cookie Policy</button>
          </div>
          <button
            onClick={async () => {
              try { await apiClient.logout(); } catch (err) { console.warn('[DEBUG App] Logout failed:', err); }
              setCurrentUser(null);
            }}
            className="mt-6 text-gray-600 hover:text-gray-800 underline"
          >
            Log Out
          </button>
        </div>

        {showTerms && (
          <TermsPage
            onAccept={() => {
              const updated = { ...currentUser, termsOfServiceAccepted: true, legalAcceptanceDate: new Date() } as UserProfile;
              setCurrentUser(updated);
              setShowTerms(false);
              (async () => {
                try {
                  await apiClient.updateProfile(currentUser.id, { termsOfServiceAccepted: true, legalAcceptanceDate: updated.legalAcceptanceDate });
                  const refreshed = await apiClient.getCurrentUser();
                  setCurrentUser(refreshed as UserProfile);
                } catch (err) { console.warn('[DEBUG App] Failed to persist terms:', err); }
              })();
            }}
            onClose={() => setShowTerms(false)}
            isModal={true}
          />
        )}
        {showPrivacy && (
          <PrivacyPage
            onAccept={() => {
              const updated = { ...currentUser, privacyPolicyAccepted: true, legalAcceptanceDate: new Date() } as UserProfile;
              setCurrentUser(updated);
              setShowPrivacy(false);
              (async () => {
                try {
                  await apiClient.updateProfile(currentUser.id, { privacyPolicyAccepted: true, legalAcceptanceDate: updated.legalAcceptanceDate });
                  const refreshed = await apiClient.getCurrentUser();
                  setCurrentUser(refreshed as UserProfile);
                } catch (err) { console.warn('[DEBUG App] Failed to persist privacy:', err); }
              })();
            }}
            onClose={() => setShowPrivacy(false)}
            isModal={true}
          />
        )}
        {showCookies && (
          <CookiePolicyPage
            onAccept={async () => {
              const updated = { ...currentUser, cookiePolicyAccepted: true, legalAcceptanceDate: new Date() } as UserProfile;
              setCurrentUser(updated);
              setShowCookies(false);
              try {
                await apiClient.updateProfile(currentUser.id, { cookiePolicyAccepted: true, legalAcceptanceDate: updated.legalAcceptanceDate });
                const refreshed = await apiClient.getCurrentUser();
                setCurrentUser(refreshed as UserProfile);
              } catch (err) { console.warn('[DEBUG App] Failed to persist cookies:', err); }
            }}
            onClose={() => setShowCookies(false)}
            isModal={true}
          />
        )}
      </div>
    );
  }

  const updateCoins = (amount: number) => {
    if (currentUser) {
      setCurrentUser(prev => prev ? { ...prev, coins: Math.max(0, prev.coins + amount) } : null);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f0f2f5] overflow-hidden">
      <div className="hidden md:flex w-[375px] h-full bg-white border-r border-gray-200 flex-col shadow-lg z-20">
        <Sidebar currentUser={currentUser} isAdmin={isAdmin} isModerator={isModerator} onOpenProfileSettings={() => setShowProfileSettings(true)} />
      </div>

      <div className="flex-1 flex flex-col h-screen bg-white md:bg-transparent pb-20 md:pb-0 safe-area-bottom">
        <Routes>
          {/* ✅ SwiperScreen now receives live coords */}
          <Route path="/" element={
            <div className="flex-1 overflow-y-auto">
              <SwiperScreen currentUser={currentUser} onDeductCoin={() => updateCoins(-1)} />
            </div>
          } />
          <Route path="/chats" element={<div className="md:hidden flex-1 overflow-y-auto"><ChatList currentUser={currentUser} /></div>} />
          <Route path="/chat/:id" element={<div className="flex-1 flex flex-col h-full"><ChatRoom currentUser={currentUser} onDeductCoin={() => updateCoins(-1)} /></div>} />
          <Route path="/matches" element={<div className="flex-1 overflow-y-auto"><MatchesPage currentUserId={currentUser?.id} /></div>} />
          <Route path="/terms" element={<div className="flex-1 overflow-y-auto"><TermsPage onAccept={() => setShowTerms(false)} isModal={false} /></div>} />
          <Route path="/privacy" element={<div className="flex-1 overflow-y-auto"><PrivacyPage onAccept={() => setShowPrivacy(false)} isModal={false} /></div>} />
          <Route path="/cookies" element={<div className="flex-1 overflow-y-auto"><CookiePolicyPage onAccept={() => setShowCookies(false)} isModal={false} /></div>} />
          {isAdmin && (
            <Route path="/admin" element={<div className="flex-1 overflow-y-auto"><ModeratorPanel /></div>} />
          )}
          {(isAdmin || isModerator) && (
            <Route path="/moderator" element={<div className="flex-1 overflow-y-auto"><ModeratorChatPanel /></div>} />
          )}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        {!isChatRoute && (
          <div className="md:hidden">
            <Navigation isAdmin={isAdmin} isModerator={isModerator} coins={currentUser.coins} unreadCount={totalUnreadCount} onOpenProfileSettings={() => setShowProfileSettings(true)} />
          </div>
        )}

        {showProfileSettings && currentUser && (
          <ProfileSettings
            user={currentUser}
            setUser={setCurrentUser}
            onClose={() => setShowProfileSettings(false)}
          />
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [newSignupUser, setNewSignupUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null); // ✅ live GPS state
  const [toastNotifications, setToastNotifications] = useState<Array<{
    id: string;
    type: 'message' | 'success' | 'error';
    title: string;
    message: string;
    chatId?: string;
    senderName?: string;
    timestamp: number;
  }>>([]);

  const isAdmin     = currentUser ? currentUser.role === UserRole.ADMIN : false;
  const isModerator = currentUser ? (currentUser.role === UserRole.MODERATOR || currentUser.role === UserRole.ADMIN) : false;

  const handleMessageNotification = (data: any) => {
    if (data.type === 'new_message') {
      playNotificationSound();
      const notification = {
        id: `notif-${Date.now()}`,
        type: 'message' as const,
        title: 'New Message',
        message: data.message.text,
        chatId: data.chatId,
        senderName: data.senderName,
        timestamp: Date.now()
      };
      setToastNotifications(prev => [...prev, notification]);
      setTimeout(() => {
        setToastNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    }
  };

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (err) {
      console.log('[DEBUG] Could not play notification sound:', err);
    }
  };

  // Load user on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiClient.getCurrentUser();
        if (!cancelled) {
          if (me && me.id) {
            setCurrentUser(me as UserProfile);
          } else {
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.warn('[DEBUG App] Could not fetch current user:', err);
        if (!cancelled) setCurrentUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Unread count polling
  useEffect(() => {
    if (!currentUser?.id) { setTotalUnreadCount(0); return; }
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/chats', {
          headers: { 'Authorization': `Bearer ${currentUser.id}` }
        });
        if (response.ok) {
          const chats = await response.json();
          const total = chats.reduce((sum: number, chat: Chat) => sum + (chat.unreadCount || 0), 0);
          setTotalUnreadCount(total);
        }
      } catch (err) {
        console.error('[DEBUG App] Failed to fetch unread count:', err);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 3000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // ✅ Debounced live location tracking — updates every 5s after movement stops
  useEffect(() => {
    if (!currentUser?.id) return;

    let locationTimer: ReturnType<typeof setTimeout>;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.longitude,
          position.coords.latitude
        ];

        clearTimeout(locationTimer);
        locationTimer = setTimeout(() => {
          console.log('[App] Location updated:', coords);
          setUserCoords(coords); // triggers SwiperScreen re-fetch via coords prop

          // Update currentUser state with new coordinates in correct format
          setCurrentUser(prev => prev ? {
            ...prev,
            coordinates: {
              longitude: position.coords.longitude,
              latitude: position.coords.latitude
            }
          } : null);

          // Also persist to backend
          apiClient.updateProfile(currentUser.id, { coordinates: coords })
            .catch(err => console.error('[App] Failed to update location:', err));
        }, 5000); // 5s debounce
      },
      (error) => {
        console.error('[App] Geolocation watch error:', error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(locationTimer);
    };
  }, [currentUser?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AlertProvider>
        <WebSocketProvider userId={currentUser?.id || null}>
          <HashRouter>
            <AppContent
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              isAdmin={isAdmin}
              isModerator={isModerator}
              showLoginModal={showLoginModal}
              setShowLoginModal={setShowLoginModal}
              showProfileSetup={showProfileSetup}
              setShowProfileSetup={setShowProfileSetup}
              newSignupUser={newSignupUser}
              setNewSignupUser={setNewSignupUser}
              totalUnreadCount={totalUnreadCount}
              userCoords={userCoords} // ✅ passed down to SwiperScreen
            />

            {currentUser?.id && (
              <MatchNotificationCenter userId={currentUser.id} />
            )}

            {/* Toast Notifications */}
            <div className="fixed bottom-0 right-0 p-4 space-y-3 max-w-md z-50">
              {toastNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className="rounded-xl shadow-2xl border border-red-200 bg-white animate-in slide-in-from-bottom-4 fade-in duration-300 cursor-pointer transform transition-all hover:scale-105 overflow-hidden"
                >
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                          <i className="fa-solid fa-comment-dots text-red-500"></i>
                          New Message
                        </h4>
                      </div>
                      <button
                        onClick={() => setToastNotifications(prev => prev.filter(n => n.id !== notif.id))}
                        className="text-gray-400 hover:text-gray-600 text-lg transition-colors"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                    {notif.senderName && (
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        From: {notif.senderName}
                      </p>
                    )}
                    <p className="text-sm text-gray-700 line-clamp-2 font-medium">{notif.message}</p>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pt-1">
                      {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="h-1 bg-gradient-to-r from-red-500 to-transparent animate-pulse"></div>
                </div>
              ))}
            </div>
          </HashRouter>
        </WebSocketProvider>
      </AlertProvider>
    </ErrorBoundary>
  );
};

export default App;