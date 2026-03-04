
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
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-md border-t border-rose-200/50 h-16 flex items-center justify-around z-20 md:hidden safe-area-bottom overflow-x-auto shadow-2xl">
      <NavLink 
        to="/" 
        className={({ isActive }) => `flex flex-col items-center transition-all duration-200 p-2 rounded-lg ${isActive ? 'text-rose-500 bg-rose-50/80 shadow-md' : 'text-gray-400 hover:text-rose-400'}`}
      >
        <i className="fa-solid fa-fire text-xl"></i>
        <span className="text-[10px] mt-1 font-semibold">Swipe</span>
      </NavLink>

      {/* Search tab removed for small screens per UI request */}
      
      <NavLink 
        to="/matches" 
        className={({ isActive }) => `flex flex-col items-center transition-all duration-200 p-2 rounded-lg ${isActive ? 'text-rose-500 bg-rose-50/80 shadow-md' : 'text-gray-400 hover:text-rose-400'}`}
      >
        <i className="fa-solid fa-heart text-xl"></i>
        <span className="text-[10px] mt-1 font-semibold">Matches</span>
      </NavLink>

      <NavLink 
        to="/chats" 
        className={({ isActive }) => `flex flex-col items-center transition-all duration-200 p-2 rounded-lg ${isActive ? 'text-rose-500 bg-rose-50/80 shadow-md' : 'text-gray-400 hover:text-rose-400'}`}
      >
        <div className="flex flex-col items-center relative">
          <i className="fa-solid fa-message text-xl"></i>
          <span className="text-[10px] mt-1 font-semibold">Thread</span>
          {unreadCount > 0 && <span className="absolute -top-1 -right-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[8px] px-1.5 rounded-full font-black shadow-lg">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </div>
      </NavLink>

      <button
        onClick={() => onOpenProfileSettings?.()}
        className="flex flex-col items-center transition-all duration-200 p-2 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-50/50"
      >
        <div className="flex flex-col items-center relative">
          <i className="fa-solid fa-user text-xl"></i>
          <span className="text-[10px] mt-1 font-semibold">Profile</span>
          <span className="absolute -top-1 -right-3 bg-gradient-to-r from-amber-400 to-rose-400 text-white text-[8px] px-1 rounded-full font-black shadow-lg">{coins}</span>
        </div>
      </button>

      {(isAdmin || isModerator) && (
        <NavLink 
          to={isAdmin ? "/admin" : "/moderator"} 
          className={({ isActive }) => `flex flex-col items-center transition-all duration-200 p-2 rounded-lg ${isActive ? 'text-rose-500 bg-rose-50/80 shadow-md' : 'text-gray-400 hover:text-rose-400'}`}
        >
          <i className="fa-solid fa-shield-halved text-xl"></i>
          <span className="text-[10px] mt-1 font-semibold">{isAdmin ? 'Admin' : 'Mod'}</span>
        </NavLink>
      )}
    </nav>
  );
};

export default Navigation;
