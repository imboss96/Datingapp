
import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavigationProps {
  isAdmin: boolean;
  isModerator: boolean;
  coins: number;
  unreadCount?: number;
  onOpenProfileSettings?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ isAdmin, isModerator, coins, unreadCount = 0, onOpenProfileSettings }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto glass-morphism border-t h-16 flex items-center justify-around z-20 md:hidden safe-area-bottom overflow-x-auto">
      <NavLink 
        to="/" 
        className={({ isActive }) => `flex flex-col items-center transition-colors ${isActive ? 'text-red-500' : 'text-gray-400'}`}
      >
        <i className="fa-solid fa-fire text-xl"></i>
        <span className="text-[10px] mt-1 font-medium">Swipe</span>
      </NavLink>

      <NavLink 
        to="/discover" 
        className={({ isActive }) => `flex flex-col items-center transition-colors ${isActive ? 'text-red-500' : 'text-gray-400'}`}
      >
        <i className="fa-solid fa-magnifying-glass text-xl"></i>
        <span className="text-[10px] mt-1 font-medium">Search</span>
      </NavLink>
      
      <NavLink 
        to="/matches" 
        className={({ isActive }) => `flex flex-col items-center transition-colors ${isActive ? 'text-red-500' : 'text-gray-400'}`}
      >
        <i className="fa-solid fa-heart text-xl"></i>
        <span className="text-[10px] mt-1 font-medium">Matches</span>
      </NavLink>

      <NavLink 
        to="/chats" 
        className={({ isActive }) => `flex flex-col items-center transition-colors ${isActive ? 'text-red-500' : 'text-gray-400'}`}
      >
        <div className="flex flex-col items-center relative">
          <i className="fa-solid fa-message text-xl"></i>
          <span className="text-[10px] mt-1 font-medium">Chats</span>
          {unreadCount > 0 && <span className="absolute -top-1 -right-3 bg-red-500 text-white text-[8px] px-1.5 rounded-full font-black">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </div>
      </NavLink>

      <button
        onClick={() => onOpenProfileSettings?.()}
        className="flex flex-col items-center transition-colors text-gray-400 hover:text-red-500"
      >
        <div className="flex flex-col items-center relative">
          <i className="fa-solid fa-user text-xl"></i>
          <span className="text-[10px] mt-1 font-medium">Profile</span>
          <span className="absolute -top-1 -right-3 bg-amber-500 text-white text-[8px] px-1 rounded-full font-black">{coins}</span>
        </div>
      </button>

      {(isAdmin || isModerator) && (
        <NavLink 
          to={isAdmin ? "/admin" : "/moderator"} 
          className={({ isActive }) => `flex flex-col items-center transition-colors ${isActive ? 'text-red-500' : 'text-gray-400'}`}
        >
          <i className="fa-solid fa-shield-halved text-xl"></i>
          <span className="text-[10px] mt-1 font-medium">{isAdmin ? 'Admin' : 'Mod'}</span>
        </NavLink>
      )}
    </nav>
  );
};

export default Navigation;
