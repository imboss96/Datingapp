
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SwiperScreen from './components/SwiperScreen';
import ChatList from './components/ChatList';
import ChatRoom from './components/ChatRoom';
import ModeratorPanel from './components/ModeratorPanel';
import ProfileSettings from './components/ProfileSettings';
import Navigation from './components/Navigation';
import Sidebar from './components/Sidebar';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import IntroScreen from './components/IntroScreen';
import TempHome from './components/TempHome';
import ProfileSetup from './components/ProfileSetup';
import DiscoveryPage from './components/DiscoveryPage';
import VideoCallRoom from './components/VideoCallRoom';
import IncomingCall from './components/IncomingCall';
import OutgoingCall from './components/OutgoingCall';
import { UserProfile, UserRole, Chat, Notification, NotificationType } from './types';
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
  coordinates: { latitude: 40.7128, longitude: -74.0060 }, // NYC coordinates
  interests: ['Design', 'Chess', 'Running'],
  coins: 10, // Free starter coins
  verification: { status: 'UNVERIFIED' },
  blockedUsers: [],
  reportedUsers: []
};

const ProfileSetupWrapper: React.FC<{ onComplete: React.Dispatch<React.SetStateAction<UserProfile | null>> }> = ({ onComplete }) => {
  const googleUserStr = localStorage.getItem('googleUser');
  
  if (!googleUserStr) {
    return <Navigate to="/login" />;
  }

  const googleUser = JSON.parse(googleUserStr);

  const handleProfileComplete = (userData: any) => {
    localStorage.removeItem('googleUser');
    const userProfile: UserProfile = {
      id: userData.id,
      name: userData.name,
      age: userData.age,
      bio: userData.bio,
      images: userData.images || [userData.profilePicture],
      isPremium: userData.isPremium || false,
      role: (userData.role as any) || UserRole.USER,
      location: userData.location,
      interests: userData.interests || [],
      coins: userData.coins || 10
    };
    onComplete(userProfile);
  };

  return (
    <ProfileSetup
      userId={googleUser.userId}
      name={googleUser.name}
      email={googleUser.email}
      profilePicture={googleUser.profilePicture}
      onComplete={handleProfileComplete}
    />
  );
};

const AppContent: React.FC<{ currentUser: UserProfile | null; setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile | null>>; isAdmin: boolean; onLogout: () => void }> = ({ currentUser, setCurrentUser, isAdmin, onLogout }) => {
  const location = useLocation();
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([
    {
      id: '1',
      name: 'Elena',
      age: 26,
      bio: 'Travel enthusiast and yoga lover',
      images: ['https://picsum.photos/400/600?random=1'],
      isPremium: false,
      role: UserRole.USER,
      location: 'Los Angeles, CA',
      coordinates: { latitude: 34.0522, longitude: -118.2437 },
      interests: ['Travel', 'Yoga', 'Art'],
      coins: 5,
      verification: { status: 'VERIFIED' },
      blockedUsers: [],
      reportedUsers: []
    },
    {
      id: '2',
      name: 'Sophia',
      age: 24,
      bio: 'Coffee addict and book lover',
      images: ['https://picsum.photos/400/600?random=2'],
      isPremium: true,
      role: UserRole.USER,
      location: 'San Francisco, CA',
      coordinates: { latitude: 37.7749, longitude: -122.4194 },
      interests: ['Books', 'Coffee', 'Music'],
      coins: 100,
      verification: { status: 'VERIFIED' },
      blockedUsers: [],
      reportedUsers: []
    },
    {
      id: '3',
      name: 'Isabella',
      age: 27,
      bio: 'Fitness coach and adventure seeker',
      images: ['https://picsum.photos/400/600?random=3'],
      isPremium: false,
      role: UserRole.USER,
      location: 'Austin, TX',
      coordinates: { latitude: 30.2672, longitude: -97.7431 },
      interests: ['Fitness', 'Outdoors', 'Cooking'],
      coins: 15,
      verification: { status: 'PENDING' },
      blockedUsers: [],
      reportedUsers: []
    },
  ]);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      userId: 'me',
      type: NotificationType.MATCH,
      title: 'New Match!',
      message: 'You matched with Elena',
      fromUserId: '1',
      read: false,
      timestamp: Date.now() - 600000,
      actionUrl: '/chat/1'
    },
  ]);
  const [incomingCall, setIncomingCall] = useState<{ caller: UserProfile; isVideo: boolean } | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<{ recipient: UserProfile; isVideo: boolean } | null>(null);
  
  if (!currentUser) {
    return (
      <Routes>
        <Route path="/" element={<TempHome />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage onLoginSuccess={setCurrentUser} />} />
        <Route path="/profile-setup" element={<ProfileSetupWrapper onComplete={setCurrentUser} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }
  
  const updateCoins = (amount: number) => {
    setCurrentUser(prev => prev ? { ...prev, coins: Math.max(0, prev.coins + amount) } : null);
  };

  const handleBlockUser = (userId: string) => {
    setCurrentUser(prev => prev ? { ...prev, blockedUsers: [...prev.blockedUsers, userId] } : null);
  };

  const handleReportUser = (userId: string, reason: string, description: string) => {
    setCurrentUser(prev => prev ? { ...prev, reportedUsers: [...prev.reportedUsers, userId] } : null);
    setNotifications(prev => [...prev, {
      id: Date.now().toString(),
      userId: 'me',
      type: NotificationType.REPORT,
      title: 'Report Submitted',
      message: `Your report has been received. Our team will review it.`,
      read: false,
      timestamp: Date.now()
    }]);
  };

  const handleStartCall = (recipient: UserProfile, isVideo: boolean) => {
    setOutgoingCall({ recipient, isVideo });
  };

  const handleAcceptCall = () => {
    if (incomingCall) {
      setIncomingCall(null);
      // In a real app, this would navigate to video call with actual WebRTC
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f0f2f5] overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-[375px] h-full bg-white border-r border-gray-200 flex-col shadow-lg z-20">
        <Sidebar currentUser={currentUser} isAdmin={isAdmin} />
        <div className="p-4 border-t">
          <button
            onClick={onLogout}
            className="w-full py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative bg-white md:bg-transparent overflow-hidden">
        <div className="flex-1 overflow-y-auto relative">
          <Routes>
            <Route path="/" element={<SwiperScreen currentUser={currentUser} onDeductCoin={() => updateCoins(-1)} />} />
            <Route path="/chats" element={<div className="md:hidden h-full"><ChatList /></div>} />
            <Route path="/chat/:id" element={<ChatRoom currentUser={currentUser} onDeductCoin={() => updateCoins(-1)} />} />
            <Route path="/discover" element={<DiscoveryPage currentUser={currentUser} allProfiles={allProfiles} blockedUsers={currentUser.blockedUsers} onBlockUser={handleBlockUser} onReportUser={handleReportUser} />} />
            <Route path="/video/:id" element={<VideoCallRoom currentUser={currentUser} otherUser={allProfiles.find(p => p.id === location.pathname.split('/')[2])} />} />
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

        {/* Call Modals */}
        <IncomingCall
          isOpen={incomingCall !== null}
          caller={incomingCall?.caller || null}
          isVideo={incomingCall?.isVideo || false}
          onAccept={handleAcceptCall}
          onReject={() => setIncomingCall(null)}
        />

        <OutgoingCall
          isOpen={outgoingCall !== null}
          recipient={outgoingCall?.recipient || null}
          isVideo={outgoingCall?.isVideo || false}
          onCancel={() => setOutgoingCall(null)}
        />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    if (token) {
      // Fetch current user from backend using stored token
      (async () => {
        try {
          const user = await apiClient.getCurrentUser();
          if (user) {
            const userProfile: UserProfile = {
              id: user.id,
              name: user.name,
              age: user.age,
              bio: user.bio || '',
              images: user.images || (user.profilePicture ? [user.profilePicture] : []),
              isPremium: user.isPremium || false,
              role: (user.role as any) || UserRole.USER,
              location: user.location || 'Not specified',
              coordinates: user.coordinates || { latitude: 0, longitude: 0 },
              interests: user.interests || [],
              coins: user.coins || 0,
              verification: user.verification || { status: 'UNVERIFIED' },
              blockedUsers: user.blockedUsers || [],
              reportedUsers: user.reportedUsers || []
            };
            setCurrentUser(userProfile);
          } else {
            setCurrentUser(null);
          }
        } catch (err) {
          setCurrentUser(null);
        }
      })();
    }
    setLoading(false);
  }, []);

  const isAdmin = currentUser && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MODERATOR);

  const handleLogout = () => {
    apiClient.clearToken();
    setCurrentUser(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <HashRouter>
      <AppContent currentUser={currentUser} setCurrentUser={setCurrentUser} isAdmin={isAdmin || false} onLogout={handleLogout} />
    </HashRouter>
  );
};

export default App;
