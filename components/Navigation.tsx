
import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavigationProps {
  isAdmin: boolean;
  coins: number;
}

const Navigation: React.FC<NavigationProps> = ({ isAdmin, coins }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto glass-morphism border-t h-16 flex items-center justify-around z-50 md:hidden">
      <NavLink 
        to="/" 
        className={({ isActive }) => `flex flex-col items-center transition-colors ${isActive ? 'text-red-500' : 'text-gray-400'}`}
      >
        <i className="fa-solid fa-fire text-xl"></i>
        <span className="text-[10px] mt-1 font-medium">Discover</span>
      </NavLink>
      
      <NavLink 
        to="/chats" 
        className={({ isActive }) => `flex flex-col items-center transition-colors ${isActive ? 'text-red-500' : 'text-gray-400'}`}
      >
        <i className="fa-solid fa-message text-xl"></i>
        <span className="text-[10px] mt-1 font-medium">Chats</span>
      </NavLink>

      <NavLink 
        to="/profile" 
        className={({ isActive }) => `flex flex-col items-center transition-colors ${isActive ? 'text-red-500' : 'text-gray-400'}`}
      >
        <div className="flex flex-col items-center relative">
          <i className="fa-solid fa-user text-xl"></i>
          <span className="text-[10px] mt-1 font-medium">Profile</span>
          <span className="absolute -top-1 -right-3 bg-amber-500 text-white text-[8px] px-1 rounded-full font-black">{coins}</span>
        </div>
      </NavLink>

      {isAdmin && (
        <NavLink 
          to="/admin" 
          className={({ isActive }) => `flex flex-col items-center transition-colors ${isActive ? 'text-red-500' : 'text-gray-400'}`}
        >
          <i className="fa-solid fa-shield-halved text-xl"></i>
          <span className="text-[10px] mt-1 font-medium">Mod</span>
        </NavLink>
      )}
    </nav>
  );
};

export default Navigation;
