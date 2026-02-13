
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
import { UserProfile, UserRole, Chat } from './types';
import { useWebSocket } from './services/useWebSocket';

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

const AppContent: React.FC<{ currentUser: UserProfile | null; setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile | null>>; isAdmin: boolean; showLoginModal: boolean; setShowLoginModal: React.Dispatch<React.SetStateAction<boolean>>; showProfileSetup: boolean; setShowProfileSetup: React.Dispatch<React.SetStateAction<boolean>>; newSignupUser: UserProfile | null; setNewSignupUser: React.Dispatch<React.SetStateAction<UserProfile | null>> }> = ({ currentUser, setCurrentUser, isAdmin, showLoginModal, setShowLoginModal, showProfileSetup, setShowProfileSetup, newSignupUser, setNewSignupUser }) => {
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith('/chat/');
  
  
  // If no user is logged in
  if (!currentUser || !currentUser.id) {
    return (
      <>
        <Routes>
          <Route path="/" element={<LandingPage onOpenLoginModal={() => setShowLoginModal(true)} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        {showLoginModal && !showProfileSetup && (
          <LoginPage 
            isModal={true}
            onClose={() => setShowLoginModal(false)}
            onLoginSuccess={(user, isSignup) => {
              console.log('[DEBUG App] Login success - user:', { id: user.id, name: user.name, isSignup, hasInterests: user.interests?.length > 0, location: user.location, age: user.age });
              if (isSignup) {
                // For signup, show profile setup
                console.log('[DEBUG App] Showing ProfileSetup modal');
                setNewSignupUser(user);
                setShowProfileSetup(true);
              } else {
                // For signin, go directly to app
                console.log('[DEBUG App] Going directly to main app (profile complete)');
                setCurrentUser(user);
              }
              setShowLoginModal(false);
            }} 
          />
        )}
        {showProfileSetup && newSignupUser && (
          <div className="fixed inset-0 backdrop-blur-md bg-white/20 flex items-center justify-center p-4 z-50" style={{ width: '100vw', height: '100vh' }}>
            <ProfileSetup
              userId={newSignupUser.id}
              name={newSignupUser.name}
              email={newSignupUser.name + '@lunesa.com'} // Mock email
              profilePicture={newSignupUser.images?.[0]}
              onComplete={(userData: any) => {
                console.log('[DEBUG App] ProfileSetup completed with data:', userData);
                // Merge profile setup data with the signup user
                // Handle interests as either string or array
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
                  interests: interests
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
          <Route path="/profile" element={<div className="flex-1 overflow-y-auto"><ProfileSettings user={currentUser} setUser={setCurrentUser} /></div>} />
          {isAdmin && (
            <Route path="/admin" element={<div className="flex-1 overflow-y-auto"><ModeratorPanel /></div>} />
          )}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        
        {/* Mobile Navigation - Hidden on chat route */}
        {!isChatRoute && (
          <div className="md:hidden">
            <Navigation isAdmin={isAdmin} coins={currentUser.coins} />
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

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        console.log('[DEBUG App] Loaded user from localStorage:', { id: user.id, name: user.name });
      } catch (e) {
        console.error('[DEBUG App] Failed to parse saved user:', e);
        localStorage.removeItem('currentUser');
      }
    }
    setIsLoading(false);
  }, []);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (currentUser && currentUser.id) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      console.log('[DEBUG App] Saved user to localStorage:', { id: currentUser.id, name: currentUser.name });
    } else if (currentUser === null) {
      localStorage.removeItem('currentUser');
      console.log('[DEBUG App] Cleared user from localStorage');
    }
  }, [currentUser]);

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
      />
      
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
  );
};

export default App;
