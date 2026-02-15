
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import ChatList from './ChatList';

interface SidebarProps {
  currentUser: UserProfile;
  isAdmin: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentUser, isAdmin }) => {
  const navigate = useNavigate();

  // Safety check for currentUser
  if (!currentUser || !currentUser.id) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-center">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Profile Header */}
      <div className="p-4 spark-gradient text-white flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => navigate('/profile')}
        >
          <div className="relative">
            <img 
              src={currentUser.images?.[0] || 'https://via.placeholder.com/40'} 
              className="w-10 h-10 rounded-full border-2 border-white/50 object-cover" 
              alt="My Profile" 
            />
            {currentUser.isPremium && <i className="fa-solid fa-crown absolute -top-1 -right-1 text-amber-400 text-[10px]"></i>}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight leading-none mb-1">{currentUser.username || currentUser.name}</span>
            <div className="flex items-center gap-1">
              <i className="fa-solid fa-coins text-amber-400 text-[10px]"></i>
              <span className="text-[10px] font-black">{currentUser.isPremium ? 'Unlimited' : currentUser.coins}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 items-center">
            {isAdmin && (
                <NavLink to="/admin" className="text-white/80 hover:text-white transition-colors">
                    <i className="fa-solid fa-shield-halved"></i>
                </NavLink>
            )}
            <button onClick={() => navigate('/profile')} className="text-white/80 hover:text-white transition-colors">
                <i className="fa-solid fa-plus-circle"></i>
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <NavLink 
          to="/" 
          className={({ isActive }) => `flex-1 py-4 text-center text-xs font-black uppercase tracking-widest border-b-2 transition-all ${isActive ? 'border-red-500 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Swipe
        </NavLink>
        <NavLink 
          to="/matches" 
          className={({ isActive }) => `flex-1 py-4 text-center text-xs font-black uppercase tracking-widest border-b-2 transition-all ${isActive ? 'border-red-500 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Matches
        </NavLink>
        <NavLink 
          to="/chats" 
          className={({ isActive }) => `flex-1 py-4 text-center text-xs font-black uppercase tracking-widest border-b-2 transition-all ${isActive ? 'border-red-500 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Messages
        </NavLink>
      </div>

      {/* Scrollable Chat List */}
      <div className="flex-1 overflow-y-auto pointer-events-auto">
        <ChatList currentUser={currentUser} />
      </div>
      
      {/* Global Economy CTA */}
      <div className="p-4">
          <div 
            onClick={() => navigate('/profile')}
            className={`${currentUser.isPremium ? 'bg-gray-900' : 'premium-gradient'} p-4 rounded-2xl text-white shadow-lg cursor-pointer hover:scale-[1.02] transition-transform group`}
          >
              <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                      <i className={`fa-solid ${currentUser.isPremium ? 'fa-crown text-amber-400' : 'fa-coins text-white'} text-xs`}></i>
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {currentUser.isPremium ? 'Gold Membership' : 'Coin Wallet'}
                      </span>
                  </div>
                  <i className="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
              </div>
              <p className="text-[10px] opacity-90 leading-tight">
                {currentUser.isPremium ? 'Unlimited chatting & swiping enabled globally.' : `You have ${currentUser.coins} coins. Get more for unlimited access!`}
              </p>
          </div>
      </div>
    </div>
  );
};

export default Sidebar;
