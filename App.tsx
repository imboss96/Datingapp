import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './src/globals.css';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import SwiperScreen from './components/SwiperScreen';
import ChatList from './components/ChatList';
import ChatRoom from './components/ChatRoom';
import ModeratorPanel from './components/ModeratorPanel';
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
import EmailVerificationModal from './components/EmailVerificationModal';
import { WebSocketProvider } from './services/WebSocketProvider';
import { AlertProvider } from './services/AlertContext';
import { UserProfile, UserRole, Chat } from './types';
import { useWebSocket } from './services/useWebSocket';
import apiClient from './services/apiClient';

// Mock Initial Data - New accounts start with 10 free coins
const INITIAL_ME: UserProfile = {
  id: 'me',
  name: 'Alex',
  age: 28,
  bio: 'Product Designer at Spark. I love code and design.',
  images: ['https://picsum.photos/400/600?random=100'],
  isPremium: false, // Start as standard user
  role: UserRole.ADMIN,
  location: 'New York, NY',
  interests: ['Design', 'Chess', 'Running'],
  coins: 10 // Free starter coins
};

const AppContent: React.FC<{ currentUser: UserProfile | null; setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile | null>>; isAdmin: boolean; showLoginModal: boolean; setShowLoginModal: React.Dispatch<React.SetStateAction<boolean>>; showProfileSetup: boolean; setShowProfileSetup: React.Dispatch<React.SetStateAction<boolean>>; newSignupUser: UserProfile | null; setNewSignupUser: React.Dispatch<React.SetStateAction<UserProfile | null>>; totalUnreadCount: number }> = ({ currentUser, setCurrentUser, isAdmin, showLoginModal, setShowLoginModal, showProfileSetup, setShowProfileSetup, newSignupUser, setNewSignupUser, totalUnreadCount }) => {
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith('/chat/');
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [emailToVerify, setEmailToVerify] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showCookies, setShowCookies] = useState(false);
  
  // Check if user has accepted legal documents
  const hasAcceptedLegal = currentUser ? (
    currentUser.termsOfServiceAccepted && 
    currentUser.privacyPolicyAccepted
  ) : false;

  // If no user is logged in
  if (!currentUser || !currentUser.id) {
    return (
      <>
        {!showTerms && !showPrivacy && !showCookies && !showProfileSetup && (
          <Routes>
            <Route path="/" element={<LandingPage onOpenLoginModal={() => setShowLoginModal(true)} />} />
            <Route path="/terms" element={<TermsPage onAccept={() => setShowTerms(false)} isModal={true} />} />
            <Route path="/privacy" element={<PrivacyPage onAccept={() => setShowPrivacy(false)} isModal={true} />} />
            <Route path="/cookies" element={<CookiePolicyPage onAccept={() => setShowCookies(false)} isModal={true} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        )}
        {showLoginModal && !showProfileSetup && (
          <LoginPage 
            isModal={true}
            onClose={() => setShowLoginModal(false)}
            onLoginSuccess={(user, isSignup) => {
              console.log('[DEBUG App] Login success - user:', { id: user.id, name: user.name, isSignup, hasInterests: user.interests?.length > 0, location: user.location, age: user.age });
              if (isSignup) {
                // For signup, show legal acceptance modals first
                console.log('[DEBUG App] Showing legal acceptance modals');
                setNewSignupUser(user);
                setEmailToVerify(user.name + '@lunesa.com'); // Mock email - will be replaced with real email later
                setShowTerms(true);
              } else {
                // For signin, if legal is accepted sign the user in.
                // Do not force the profile-setup flow for returning users — make it optional.
                if (user.termsOfServiceAccepted && user.privacyPolicyAccepted) {
                  console.log('[DEBUG App] Signing in returning user — legal accepted, setting current user');
                  setCurrentUser(user);
                } else {
                  console.log('[DEBUG App] Need to accept legal documents');
                  setNewSignupUser(user);
                  setShowTerms(true);
                }
              }
              setShowLoginModal(false);
            }} 
          />
        )}

        {/* Legal Documents Modals */}
        {showTerms && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
            <div className="w-full h-screen max-w-4xl bg-white">
              <TermsPage
                onAccept={() => {
                  console.log('[DEBUG App] Terms accepted - moving to Privacy');
                  setShowTerms(false);
                  setShowPrivacy(true);
                }}
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
                onAccept={() => {
                  console.log('[DEBUG App] Privacy accepted - moving to Cookies');
                  setShowPrivacy(false);
                  setShowCookies(true);
                }}
                onClose={() => {
                  console.log('[DEBUG App] Privacy declined - back to Terms');
                  setShowPrivacy(false);
                  setShowTerms(true);
                }}
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
                  console.log('[DEBUG App] Cookies accepted');
                  setShowCookies(false);
                  // Set legal acceptance and proceed. Persist flags to backend so they survive logout/login.
                  if (newSignupUser) {
                    try {
                      await apiClient.updateProfile(newSignupUser.id, {
                        termsOfServiceAccepted: true,
                        privacyPolicyAccepted: true,
                        cookiePolicyAccepted: true,
                        legalAcceptanceDate: new Date().toISOString()
                      });
                      console.log('[DEBUG App] Persisted legal acceptance to backend for user:', newSignupUser.id);

                      // Fetch authoritative user from server (ensure flags persisted and we have full user object)
                      const refreshed = await apiClient.getCurrentUser();
                      console.log('[DEBUG App] Refreshed user from server after legal accept:', refreshed);

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
                      console.warn('[DEBUG App] Failed to persist legal acceptance or refresh user:', err);
                    }
                  }
                }}
                onClose={() => {
                  console.log('[DEBUG App] Cookie policy declined');
                  setShowCookies(false);
                  setShowPrivacy(true);
                }}
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
                console.log('[DEBUG App] ProfileSetup completed with data:', userData);
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
                  interests: interests,
                  termsOfServiceAccepted: true,
                  privacyPolicyAccepted: true,
                  cookiePolicyAccepted: true
                };
                console.log('[DEBUG App] Setting current user after profile setup:', { id: completeUser.id, age: completeUser.age, location: completeUser.location, interests: completeUser.interests });
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

  // If user is logged in but hasn't accepted legal documents - show legal gate
  if (!hasAcceptedLegal) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Please Accept Our Policies
          </h1>
          <p className="text-gray-600 mb-6">
            To continue using the app, you need to accept our Terms of Service, Privacy Policy, and Cookie Policy.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => setShowTerms(true)}
              className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold py-3 rounded-lg hover:from-pink-600 hover:to-red-600 transition"
            >
              Review Terms of Service
            </button>
            <button
              onClick={() => setShowPrivacy(true)}
              className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold py-3 rounded-lg hover:from-pink-600 hover:to-red-600 transition"
            >
              Review Privacy Policy
            </button>
            <button
              onClick={() => setShowCookies(true)}
              className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold py-3 rounded-lg hover:from-pink-600 hover:to-red-600 transition"
            >
              Review Cookie Policy
            </button>
          </div>

          <button
            onClick={async () => {
              try {
                await apiClient.logout();
              } catch (err) {
                console.warn('[DEBUG App] Logout API call failed:', err);
              }
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
              const updated = { ...currentUser, termsOfServiceAccepted: true, legalAcceptanceDate: new Date().toISOString() } as UserProfile;
              setCurrentUser(updated);
              setShowTerms(false);
              (async () => {
                try {
                  if (currentUser && currentUser.id) {
                    await apiClient.updateProfile(currentUser.id, {
                      termsOfServiceAccepted: true,
                      legalAcceptanceDate: updated.legalAcceptanceDate
                    });
                    const refreshed = await apiClient.getCurrentUser();
                    setCurrentUser(refreshed as UserProfile);
                    console.log('[DEBUG App] Persisted terms acceptance to backend for user:', currentUser.id);
                  }
                } catch (err) {
                  console.warn('[DEBUG App] Failed to persist terms acceptance:', err);
                }
              })();
            }}
            onClose={() => setShowTerms(false)}
            isModal={true}
          />
        )}
        {showPrivacy && (
          <PrivacyPage 
            onAccept={() => {
              const updated = { ...currentUser, privacyPolicyAccepted: true, legalAcceptanceDate: new Date().toISOString() } as UserProfile;
              setCurrentUser(updated);
              setShowPrivacy(false);
              (async () => {
                try {
                  if (currentUser && currentUser.id) {
                    await apiClient.updateProfile(currentUser.id, {
                      privacyPolicyAccepted: true,
                      legalAcceptanceDate: updated.legalAcceptanceDate
                    });
                    const refreshed = await apiClient.getCurrentUser();
                    setCurrentUser(refreshed as UserProfile);
                    console.log('[DEBUG App] Persisted privacy acceptance to backend for user:', currentUser.id);
                  }
                } catch (err) {
                  console.warn('[DEBUG App] Failed to persist privacy acceptance:', err);
                }
              })();
            }}
            onClose={() => setShowPrivacy(false)}
            isModal={true}
          />
        )}
        {showCookies && (
          <CookiePolicyPage 
            onAccept={async () => {
              const updated = { ...currentUser, cookiePolicyAccepted: true, legalAcceptanceDate: new Date().toISOString() } as UserProfile;
                  setCurrentUser(updated);
                  setShowCookies(false);
                  if (currentUser && currentUser.id) {
                    try {
                      await apiClient.updateProfile(currentUser.id, {
                        cookiePolicyAccepted: true,
                        legalAcceptanceDate: updated.legalAcceptanceDate
                      });
                      // Refresh authoritative user
                      const refreshed = await apiClient.getCurrentUser();
                      console.log('[DEBUG App] Refreshed user from server after cookie accept:', refreshed);
                      setCurrentUser(refreshed as UserProfile);
                    } catch (err) {
                      console.warn('[DEBUG App] Failed to persist cookie acceptance:', err);
                    }
                  }
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
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-[375px] h-full bg-white border-r border-gray-200 flex-col shadow-lg z-20">
        <Sidebar currentUser={currentUser} isAdmin={isAdmin} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen bg-white md:bg-transparent pb-20 md:pb-0 safe-area-bottom">
        <Routes>
          <Route path="/" element={<div className="flex-1 overflow-y-auto"><SwiperScreen currentUser={currentUser} onDeductCoin={() => updateCoins(-1)} /></div>} />
          <Route path="/chats" element={<div className="md:hidden flex-1 overflow-y-auto"><ChatList currentUser={currentUser} /></div>} />
          <Route path="/chat/:id" element={<div className="flex-1 flex flex-col h-full"><ChatRoom currentUser={currentUser} onDeductCoin={() => updateCoins(-1)} /></div>} />
          <Route path="/matches" element={<div className="flex-1 overflow-y-auto"><MatchesPage currentUserId={currentUser?.id} /></div>} />
          <Route path="/profile" element={<div className="flex-1 overflow-y-auto"><ProfileSettings user={currentUser} setUser={setCurrentUser} /></div>} />
          <Route path="/terms" element={<div className="flex-1 overflow-y-auto"><TermsPage onAccept={() => setShowTerms(false)} isModal={false} /></div>} />
          <Route path="/privacy" element={<div className="flex-1 overflow-y-auto"><PrivacyPage onAccept={() => setShowPrivacy(false)} isModal={false} /></div>} />
          <Route path="/cookies" element={<div className="flex-1 overflow-y-auto"><CookiePolicyPage onAccept={() => setShowCookies(false)} isModal={false} /></div>} />
          {isAdmin && (
            <Route path="/admin" element={<div className="flex-1 overflow-y-auto"><ModeratorPanel /></div>} />
          )}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        
        {/* Mobile Navigation - Hidden on chat route */}
        {!isChatRoute && (
          <div className="md:hidden">
            <Navigation isAdmin={isAdmin} coins={currentUser.coins} unreadCount={totalUnreadCount} />
          </div>
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
  const [toastNotifications, setToastNotifications] = useState<Array<{
    id: string;
    type: 'message' | 'success' | 'error';
    title: string;
    message: string;
    chatId?: string;
    senderName?: string;
    timestamp: number;
  }>>([]);
  const isAdmin = currentUser ? (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MODERATOR) : false;

  // Initialize WebSocket connection
  const handleMessageNotification = (data: any) => {
    if (data.type === 'new_message') {
      // Play notification sound
      playNotificationSound();
      
      // Add toast notification
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
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        setToastNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    }
  };

  useWebSocket(currentUser?.id || null, handleMessageNotification);

  const playNotificationSound = () => {
    // Create a simple beep sound notification
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

  // Load authoritative user from backend on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiClient.getCurrentUser();
        if (!cancelled) {
          if (me && me.id) {
            setCurrentUser(me as UserProfile);
            console.log('[DEBUG App] Loaded user from backend:', { id: (me as any).id, name: (me as any).name });
          } else {
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.warn('[DEBUG App] Could not fetch current user from backend:', err);
        if (!cancelled) setCurrentUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Fetch chats and calculate total unread count
  useEffect(() => {
    if (!currentUser?.id) {
      setTotalUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/chats', {
          headers: {
            'Authorization': `Bearer ${currentUser.id}`
          }
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
    
    // Poll for unread count updates every 3 seconds
    const interval = setInterval(fetchUnreadCount, 3000);
    return () => clearInterval(interval);
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
            showLoginModal={showLoginModal} 
            setShowLoginModal={setShowLoginModal}
            showProfileSetup={showProfileSetup}
            setShowProfileSetup={setShowProfileSetup}
            newSignupUser={newSignupUser}
            setNewSignupUser={setNewSignupUser}
            totalUnreadCount={totalUnreadCount}
          />
          
          {/* Match Notifications */}
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
                    onClick={() => {
                      setToastNotifications(prev => prev.filter(n => n.id !== notif.id));
                    }}
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

                <p className="text-sm text-gray-700 line-clamp-2 font-medium">
                  {notif.message}
                </p>

                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pt-1">
                  {new Date(notif.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>

              {/* Auto-dismiss progress bar */}
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
