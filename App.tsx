
import React, { useState } from 'react';
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
      <div className="flex-1 flex flex-col h-full relative bg-white md:bg-transparent overflow-hidden">
        <div className="flex-1 overflow-y-auto relative">
          <Routes>
            <Route path="/" element={<SwiperScreen currentUser={currentUser} onDeductCoin={() => updateCoins(-1)} />} />
            <Route path="/chats" element={<div className="md:hidden h-full"><ChatList /></div>} />
            <Route path="/chat/:id" element={<ChatRoom currentUser={currentUser} onDeductCoin={() => updateCoins(-1)} />} />
            <Route path="/profile" element={<ProfileSettings user={currentUser} setUser={setCurrentUser} />} />
            {isAdmin && (
              <Route path="/admin" element={<ModeratorPanel />} />
            )}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
        
        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Navigation isAdmin={isAdmin} coins={currentUser.coins} />
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [newSignupUser, setNewSignupUser] = useState<UserProfile | null>(null);
  const isAdmin = currentUser ? (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MODERATOR) : false;

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
    </HashRouter>
  );
};

export default App;
