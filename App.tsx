import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './src/globals.css';
import LandingPage from './components/LandingPage';
import VerifyEmailInfoPage from './components/VerifyEmailInfoPage';
import VerifyEmailPage from './components/VerifyEmailPage';
import LoginPage from './components/LoginPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import AccountSuspendedPage from './components/AccountSuspendedPage';
import SwiperScreen from "./components/SwiperScreen";
import DiscoveryPage from "./components/DiscoveryPage";
import ChatList from './components/ChatList';
import ChatRoom from './components/ChatRoom';
import VideoCallRoom from './components/VideoCallRoom';
import ModeratorPanel from './components/ModeratorPanel';
import ModeratorChatPanel from './components/ModeratorChatPanel';
import StandaloneModerationDashboard from './components/StandaloneModerationDashboard';
import StandaloneModeratorDashboard from './components/StandaloneModeratorDashboard';
import ModeratorPortal from './components/ModeratorPortal';
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
import LegalConsentGate from './components/LegalConsentGate';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import ModalPreview from './components/ModalPreview';
import { WebSocketProvider } from './services/WebSocketProvider';
import { AlertProvider } from './services/AlertContext';
import { NotificationProvider } from './services/NotificationContext';
import { CoinPackageProvider } from './services/CoinPackageContext';
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

const parseProfileInterests = (interests: unknown): string[] => {
  if (Array.isArray(interests)) {
    return interests.filter((interest): interest is string => typeof interest === 'string' && interest.trim().length > 0);
  }

  if (typeof interests === 'string') {
    return interests.split(',').map((interest) => interest.trim()).filter(Boolean);
  }

  return [];
};

const isProfileSetupComplete = (user: Partial<UserProfile> | null): boolean => {
  if (!user) return false;

  const normalizedGender = typeof user.gender === 'string' ? user.gender.trim().toLowerCase() : '';
  const interests = parseProfileInterests(user.interests);
  const images = Array.isArray(user.images) ? user.images.filter(Boolean) : [];
  const username = typeof user.username === 'string' ? user.username.trim() : '';
  const location = typeof user.location === 'string' ? user.location.trim() : '';
  const age = Number(user.age);

  return Boolean(
    normalizedGender &&
    ['man', 'woman', 'other'].includes(normalizedGender) &&
    username.length >= 3 &&
    age >= 18 &&
    location &&
    location !== 'Not specified' &&
    interests.length > 0 &&
    images.length > 0
  );
};

const buildCompletedProfileUser = (baseUser: UserProfile, userData: any): UserProfile => {
  const interests = parseProfileInterests(userData.interests);
  const parsedAge = Number.parseInt(String(userData.age), 10);

  return {
    ...baseUser,
    ...userData,
    age: Number.isFinite(parsedAge) && parsedAge > 0 ? parsedAge : baseUser.age,
    bio: userData.bio ?? baseUser.bio,
    location: userData.location ?? baseUser.location,
    username: userData.username ?? baseUser.username,
    gender: userData.gender ?? baseUser.gender,
    images: Array.isArray(userData.images) ? userData.images : baseUser.images,
    interests: interests.length > 0 ? interests : baseUser.interests,
    termsOfServiceAccepted: userData.termsOfServiceAccepted ?? baseUser.termsOfServiceAccepted ?? true,
    privacyPolicyAccepted: userData.privacyPolicyAccepted ?? baseUser.privacyPolicyAccepted ?? true,
    cookiePolicyAccepted: userData.cookiePolicyAccepted ?? baseUser.cookiePolicyAccepted ?? true,
  };
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
  const isModeratorPortalRoute = location.pathname === '/moderator-portal';
  const [isStandalonePWA, setIsStandalonePWA] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [emailToVerify, setEmailToVerify] = useState('');
  const [showLegalConsent, setShowLegalConsent] = useState(false);
  const [activePolicyModal, setActivePolicyModal] = useState<'terms' | 'privacy' | 'cookies' | null>(null);
  const [legalSaving, setLegalSaving] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [activeCall, setActiveCall] = useState<{
    otherUser?: UserProfile;
    otherUserId: string;
    isInitiator: boolean;
    isVideo: boolean;
    minimized: boolean;
  } | null>(null);

  useEffect(() => {
    const handleCallStart = (event: Event) => {
      const data = (event as CustomEvent).detail || {};
      if (!data.otherUserId) return;
      setActiveCall((prev) => {
        if (prev && prev.otherUserId !== data.otherUserId) {
          window.dispatchEvent(new CustomEvent('app:call:blocked', {
            detail: {
              activeWithName: prev.otherUser?.username || prev.otherUser?.name || 'User'
            }
          }));
          return prev;
        }
        return {
          otherUser: data.otherUser,
          otherUserId: data.otherUserId,
          isInitiator: !!data.isInitiator,
          isVideo: !!data.isVideo,
          minimized: false,
        };
      });
    };

    const handleCallEnd = () => {
      setActiveCall(null);
    };
    const handleCallRestore = () => {
      setActiveCall((prev) => (prev ? { ...prev, minimized: false } : prev));
    };

    window.addEventListener('app:call:start', handleCallStart as EventListener);
    window.addEventListener('app:call:end', handleCallEnd);
    window.addEventListener('app:call:restore', handleCallRestore);
    return () => {
      window.removeEventListener('app:call:start', handleCallStart as EventListener);
      window.removeEventListener('app:call:end', handleCallEnd);
      window.removeEventListener('app:call:restore', handleCallRestore);
    };
  }, []);

  useEffect(() => {
    (window as any).__activeCall = activeCall;
  }, [activeCall]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const detectStandalone = () => {
      const standalone = mediaQuery.matches || (window.navigator as any).standalone === true;
      setIsStandalonePWA(standalone);
      document.documentElement.classList.toggle('standalone-pwa', standalone);
      document.body.classList.toggle('standalone-pwa', standalone);
    };

    detectStandalone();
    mediaQuery.addEventListener('change', detectStandalone);

    return () => {
      mediaQuery.removeEventListener('change', detectStandalone);
      document.documentElement.classList.remove('standalone-pwa');
      document.body.classList.remove('standalone-pwa');
    };
  }, []);

  const hasAcceptedLegal = currentUser ? (
    currentUser.termsOfServiceAccepted &&
    currentUser.privacyPolicyAccepted &&
    currentUser.cookiePolicyAccepted
  ) : false;
  const requiresProfileSetup = Boolean(
    currentUser &&
    hasAcceptedLegal &&
    !isProfileSetupComplete(currentUser)
  );
  const profileSetupUser = (newSignupUser || currentUser) as UserProfile | null;

  const persistFullLegalAcceptance = async (userId: string, fallbackUser?: UserProfile | null) => {
    const acceptanceDate = new Date().toISOString();
    await apiClient.updateProfile(userId, {
      termsOfServiceAccepted: true,
      privacyPolicyAccepted: true,
      cookiePolicyAccepted: true,
      legalAcceptanceDate: acceptanceDate,
    });

    try {
      const refreshed = await apiClient.getCurrentUser();
      return refreshed as UserProfile;
    } catch (err) {
      console.warn('[DEBUG App] Failed to refresh user after legal acceptance:', err);
      if (!fallbackUser) throw err;
      return {
        ...fallbackUser,
        termsOfServiceAccepted: true,
        privacyPolicyAccepted: true,
        cookiePolicyAccepted: true,
        legalAcceptanceDate: new Date(acceptanceDate),
      } as UserProfile;
    }
  };

  const renderPolicyModal = () => {
    if (!activePolicyModal) return null;

    const closeModal = () => setActivePolicyModal(null);
    if (activePolicyModal === 'terms') {
      return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="w-full h-screen max-w-4xl bg-white">
            <TermsPage onAccept={closeModal} onClose={closeModal} isModal={true} />
          </div>
        </div>
      );
    }
    if (activePolicyModal === 'privacy') {
      return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="w-full h-screen max-w-4xl bg-white">
            <PrivacyPage onAccept={closeModal} onClose={closeModal} isModal={true} />
          </div>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
        <div className="w-full h-screen max-w-4xl bg-white">
          <CookiePolicyPage onAccept={closeModal} onClose={closeModal} isModal={true} />
        </div>
      </div>
    );
  };

  if (!currentUser || !currentUser.id) {
    return (
      <>
        <Routes>
          <Route path="/" element={<LandingPage currentUser={null} onOpenLoginModal={() => setShowLoginModal(true)} />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email-info" element={<VerifyEmailInfoPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/account-suspended" element={<AccountSuspendedPage />} />
          <Route path="/terms" element={<TermsPage onAccept={() => {}} isModal={true} />} />
          <Route path="/privacy" element={<PrivacyPage onAccept={() => {}} isModal={true} />} />
          <Route path="/cookies" element={<CookiePolicyPage onAccept={() => {}} isModal={true} />} />
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
                setShowLegalConsent(true);
              } else {
                if (user.termsOfServiceAccepted && user.privacyPolicyAccepted && user.cookiePolicyAccepted) {
                  const needsProfileSetup = !isProfileSetupComplete(user);
                  setCurrentUser(user);
                  setNewSignupUser(needsProfileSetup ? user : null);
                  setShowProfileSetup(needsProfileSetup);
                } else {
                  setNewSignupUser(user);
                  setShowLegalConsent(true);
                }
              }
              setShowLoginModal(false);
            }}
          />
        )}

        {showLegalConsent && newSignupUser && (
          <div className="fixed inset-0 z-40">
            <LegalConsentGate
              userName={newSignupUser.name}
              isSaving={legalSaving}
              onOpenPolicy={(policy) => setActivePolicyModal(policy)}
              onAcceptAll={async () => {
                setLegalSaving(true);
                try {
                  const persistedUser = await persistFullLegalAcceptance(newSignupUser.id, newSignupUser);
                  const needsProfileSetup = !isProfileSetupComplete(persistedUser);
                  setCurrentUser(persistedUser);
                  setNewSignupUser(needsProfileSetup ? persistedUser : null);
                  setShowProfileSetup(needsProfileSetup);
                  setShowLegalConsent(false);
                } catch (err) {
                  console.warn('[DEBUG App] Failed to persist legal acceptance:', err);
                } finally {
                  setLegalSaving(false);
                }
              }}
              onLogout={async () => {
                try { await apiClient.logout(); } catch (err) { console.warn('[DEBUG App] Logout failed:', err); }
                setShowLegalConsent(false);
                setCurrentUser(null);
                setNewSignupUser(null);
              }}
            />
          </div>
        )}

        {renderPolicyModal()}

        {showProfileSetup && newSignupUser && (
          <div className="fixed inset-0 backdrop-blur-md bg-white/20 flex items-center justify-center p-4 z-50" style={{ width: '100vw', height: '100vh' }}>
            <ProfileSetup
              userId={newSignupUser.id}
              name={newSignupUser.name}
              email={newSignupUser.email || `${newSignupUser.name}@lunesa.com`}
              profilePicture={newSignupUser.images?.[0]}
              onComplete={(userData: any) => {
                const completeUser = buildCompletedProfileUser(newSignupUser, userData);
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

        <PWAInstallPrompt />
      </>
    );
  }

  if (!hasAcceptedLegal) {
    return (
      <>
        <LegalConsentGate
          userName={currentUser?.name}
          isSaving={legalSaving}
          onOpenPolicy={(policy) => setActivePolicyModal(policy)}
          onAcceptAll={async () => {
            if (!currentUser) return;
            setLegalSaving(true);
            try {
              const refreshed = await persistFullLegalAcceptance(currentUser.id, currentUser);
              setCurrentUser(refreshed);
            } catch (err) {
              console.warn('[DEBUG App] Failed to persist legal acceptance:', err);
            } finally {
              setLegalSaving(false);
            }
          }}
          onLogout={async () => {
            try { await apiClient.logout(); } catch (err) { console.warn('[DEBUG App] Logout failed:', err); }
            setCurrentUser(null);
          }}
        />
        {renderPolicyModal()}

        <PWAInstallPrompt />
      </>
    );
  }

  if (requiresProfileSetup && profileSetupUser) {
    return (
      <>
        <div className="fixed inset-0 backdrop-blur-md bg-white/20 flex items-center justify-center p-4 z-50" style={{ width: '100vw', height: '100vh' }}>
          <ProfileSetup
            userId={profileSetupUser.id}
            name={profileSetupUser.name}
            email={profileSetupUser.email || `${profileSetupUser.name}@lunesa.com`}
            profilePicture={profileSetupUser.images?.[0]}
            onComplete={(userData: any) => {
              const completeUser = buildCompletedProfileUser(profileSetupUser, userData);
              setCurrentUser(completeUser);
              setShowProfileSetup(false);
              setNewSignupUser(null);
            }}
            onCancel={async () => {
              try { await apiClient.logout(); } catch (err) { console.warn('[DEBUG App] Logout failed:', err); }
              setCurrentUser(null);
              setShowProfileSetup(false);
              setNewSignupUser(null);
            }}
          />
        </div>
        <PWAInstallPrompt />
      </>
    );
  }

  const updateCoins = async (amount: number) => {
    if (!currentUser) return;
    try {
      // Call backend API to persist coin change
      const response = await apiClient.deductCoin(currentUser.id);
      if (response.coins !== undefined) {
        // Update local state with server response
        setCurrentUser(prev => prev ? { ...prev, coins: response.coins } : null);
      }
    } catch (err: any) {
      console.error('[ERROR] Failed to deduct coin:', err);
      // Optionally show error message to user
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f0f2f5] overflow-hidden">
      {!isModeratorPortalRoute && (
        <div className="hidden md:flex w-[375px] h-full bg-white border-r border-gray-200 flex-col shadow-lg z-20">
          <Sidebar currentUser={currentUser} isAdmin={isAdmin} isModerator={isModerator} onOpenProfileSettings={() => setShowProfileSettings(true)} />
        </div>
      )}

      <div className={`${isModeratorPortalRoute ? 'w-full' : 'flex-1'} flex flex-col h-screen bg-white md:bg-transparent overflow-hidden`}>
        <Routes>
          {/* ✅ SwiperScreen now receives live coords */}
          <Route path="/" element={
            <div className="flex-1 overflow-y-auto">
              <SwiperScreen currentUser={currentUser} onDeductCoin={() => updateCoins(-1)} />
            </div>
          } />
          <Route path="/discover" element={
            <div className="flex-1 overflow-y-auto">
              <DiscoveryPage currentUser={currentUser} />
            </div>
          } />
          <Route path="/chats" element={
            <div className="flex w-full h-full">
              <div className="md:hidden flex-1 min-h-0 flex flex-col overflow-hidden"><ChatList currentUser={currentUser} /></div>
              <div className="hidden md:flex flex-1 flex-col h-full"><ChatRoom currentUser={currentUser} onDeductCoin={() => updateCoins(-1)} /></div>
            </div>
          } />
          <Route path="/chat/:id" element={<div className="flex-1 flex flex-col h-full"><ChatRoom currentUser={currentUser} onDeductCoin={() => updateCoins(-1)} /></div>} />
          <Route path="/matches" element={<div className="flex-1 overflow-y-auto"><MatchesPage currentUserId={currentUser?.id} /></div>} />
          <Route path="/terms" element={<div className="flex-1 overflow-y-auto"><TermsPage onAccept={() => {}} isModal={false} /></div>} />
          <Route path="/privacy" element={<div className="flex-1 overflow-y-auto"><PrivacyPage onAccept={() => {}} isModal={false} /></div>} />
          <Route path="/cookies" element={<div className="flex-1 overflow-y-auto"><CookiePolicyPage onAccept={() => {}} isModal={false} /></div>} />
          {isAdmin && (
            <Route path="/admin" element={<div className="flex-1 overflow-y-auto"><ModeratorPanel /></div>} />
          )}
          {(isAdmin || isModerator) && (
            <Route path="/moderator" element={<div className="flex-1 overflow-y-auto"><ModeratorChatPanel /></div>} />
          )}
          {(isAdmin || isModerator) && (
            <Route path="/moderator-portal" element={<div className="flex-1"><ModeratorPortal currentUser={currentUser} /></div>} />
          )}
          <Route path="/modal-preview" element={<ModalPreview />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        {!isStandalonePWA && !isChatRoute && !isModeratorPortalRoute && (
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

        {activeCall && (
          <>
            <VideoCallRoom
              currentUser={currentUser}
              otherUser={activeCall.otherUser}
              otherUserId={activeCall.otherUserId}
              isInitiator={activeCall.isInitiator}
              isVideo={activeCall.isVideo}
              minimized={activeCall.minimized}
              onToggleMinimize={(minimized) => {
                setActiveCall((prev) => (prev ? { ...prev, minimized } : prev));
              }}
              onCallEnd={() => {
                setActiveCall(null);
                window.dispatchEvent(new CustomEvent('app:call:end'));
              }}
            />
            {activeCall.minimized && (
              <button
                onClick={() => setActiveCall((prev) => (prev ? { ...prev, minimized: false } : prev))}
                className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-white/95 border border-gray-200 shadow-xl rounded-full px-4 py-2 flex items-center gap-2"
              >
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-semibold text-gray-900 truncate max-w-[55vw]">
                  On call with {activeCall.otherUser?.username || activeCall.otherUser?.name || 'User'}
                </span>
                <i className="fa-solid fa-up-right-and-down-left-from-center text-gray-500 text-xs"></i>
              </button>
            )}
          </>
        )}

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
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
  const [suspensionError, setSuspensionError] = useState<any>(null); // ✅ Suspension/ban status
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

  // Unread count - fetch on user load, then rely on WebSocket for real-time updates
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
        // Silent fail - WebSocket will provide real-time updates
      }
    };
    // Fetch once on load
    fetchUnreadCount();
    // No polling - rely on WebSocket for real-time updates
    return () => {};
  }, [currentUser?.id]);

  // ✅ SUSPENSION CHECK - Periodic check to detect if user is suspended/banned while logged in
  useEffect(() => {
    if (!currentUser?.id) return;

    const suspensionCheckInterval = setInterval(async () => {
      try {
        const userStatus = await apiClient.getCurrentUser();
        // Check if suspension error in response
        if ((userStatus as any).code === 'ACCOUNT_SUSPENDED' || (userStatus as any).code === 'ACCOUNT_BANNED') {
          console.log('[INFO] User is suspended/banned - forcing logout:', (userStatus as any).code);
          setSuspensionError(userStatus);
          // Force logout
          setCurrentUser(null);
          localStorage.removeItem('token');
        }
      } catch (err: any) {
        // Check if it's a suspension/ban error (403 status)
        if (err.response?.status === 403 && (err.response?.data?.code === 'ACCOUNT_SUSPENDED' || err.response?.data?.code === 'ACCOUNT_BANNED')) {
          console.log('[INFO] User suspension detected via error - forcing logout');
          setSuspensionError(err.response.data);
          setCurrentUser(null);
          localStorage.removeItem('token');
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(suspensionCheckInterval);
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

  // ✅ Show suspension page if user was suspended while logged in
  if (suspensionError) {
    return (
      <ErrorBoundary>
        <AccountSuspendedPage
          error={suspensionError}
          email={currentUser?.name}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AlertProvider>
        <NotificationProvider>
          <CoinPackageProvider>
            <WebSocketProvider userId={currentUser?.id || null}>
            <HashRouter>
            {/* ✅ Standalone Moderation Routes - Accessible directly without App wrapper */}
            <Routes>
              <Route path="/moderation" element={<StandaloneModerationDashboard />} />
              <Route path="/*" element={
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
                  userCoords={userCoords}
                />
              } />
            </Routes>

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
                          <i className="fa-solid fa-comment-dots text-rose-500"></i>
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
          </CoinPackageProvider>
        </NotificationProvider>
      </AlertProvider>
    </ErrorBoundary>
  );
};

export default App;

