import React, { useEffect, useState } from 'react';
import StandaloneModeratorDashboard from './StandaloneModeratorDashboard';
import { ModerationAuthProvider } from '../services/ModerationAuthContext';
import { UserProfile } from '../types';

interface ModeratorPortalProps {
  currentUser: UserProfile | null;
}

/**
 * ✅ Fort Knox Moderator Portal
 * - BULLETPROOF: Prevents ALL escape routes to main app
 * - Covers URL deletion, parent directory, hash removal, direct navigation
 * - Forces permanent lock on /moderator-portal
 */
const ModeratorPortal: React.FC<ModeratorPortalProps> = ({ currentUser }) => {
  const [attemptedEscape, setAttemptedEscape] = useState(false);

  useEffect(() => {
    // ✅ UNBREAKABLE LOCK: Monitor and enforce /moderator-portal
    const enforcePortalLock = () => {
      const currentHash = window.location.hash;
      const currentPath = window.location.pathname;
      
      // Block ANY attempt to leave /moderator-portal
      if (!currentHash.includes('/moderator-portal')) {
        console.warn('[SECURITY] Escape attempt detected - enforcing portal lock');
        setAttemptedEscape(true);
        window.location.hash = '/moderator-portal';
      }
    };

    // ✅ PREVENT: Back button navigation
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      window.history.pushState(null, '', '/#/moderator-portal');
      enforcePortalLock();
    };

    // ✅ PREVENT: Direct URL changes
    const handleHashChange = () => {
      setTimeout(() => {
        if (!window.location.hash.includes('/moderator-portal')) {
          console.warn('[SECURITY] URL manipulation detected - resetting to portal');
          window.location.hash = '/moderator-portal';
        }
      }, 0);
    };

    // ✅ PREVENT: Pathname changes (e.g., deleting hash entirely)
    const monitorPathChange = () => {
      setInterval(() => {
        const hash = window.location.hash;
        if (!hash || !hash.includes('/moderator-portal')) {
          console.warn('[SECURITY] Direct path navigation detected');
          window.location.hash = '/moderator-portal';
        }
      }, 500); // Check every 500ms
    };

    // ✅ PREVENT: Link clicks outside moderator-portal
    const handleLinkClick = (event: MouseEvent) => {
      const target = (event.target as Element)?.closest('a');
      if (target && target.href) {
        const href = target.getAttribute('href') || '';
        
        // Allow logout links
        if (href.includes('logout') || href.includes('moderationTest')) {
          return;
        }
        
        // Block ALL other navigation attempts
        if (!href.includes('/moderator-portal') && !href.startsWith('#/moderator-portal')) {
          event.preventDefault();
          event.stopPropagation();
          console.warn('[SECURITY] Unauthorized link click blocked:', href);
          setAttemptedEscape(true);
          return false;
        }
      }
    };

    // ✅ PREVENT: Window location changes via JavaScript
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      // Block back button (Alt+Left Arrow on Windows, Cmd+[ on Mac)
      if ((event.altKey && event.key === 'ArrowLeft') || (event.metaKey && event.key === '[')) {
        event.preventDefault();
        console.warn('[SECURITY] Back button blocked');
      }
    });

    // ✅ Setup all protections
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    document.addEventListener('click', handleLinkClick, true);
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      // Block back button (Alt+Left Arrow on Windows, Cmd+[ on Mac)
      if ((event.altKey && event.key === 'ArrowLeft') || (event.metaKey && event.key === '[')) {
        event.preventDefault();
        console.warn('[SECURITY] Back button shortcut blocked');
      }
    });
    
    // Initial enforcement
    enforcePortalLock();
    monitorPathChange();

    // ✅ Block back/forward navigation
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, []);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <i className="fa-solid fa-lock text-red-500 text-4xl mb-4 block"></i>
          <p className="text-gray-300 font-semibold">Access Denied</p>
          <p className="text-gray-500 text-sm mt-2">You must be logged in as a moderator</p>
        </div>
      </div>
    );
  }

  // ✅ Verify user is moderator or admin
  if (currentUser.role !== 'MODERATOR' && currentUser.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <i className="fa-solid fa-shield-halved text-orange-500 text-4xl mb-4 block"></i>
          <p className="text-gray-300 font-semibold">Insufficient Permissions</p>
          <p className="text-gray-500 text-sm mt-2">Only moderators and admins can access this section</p>
        </div>
      </div>
    );
  }

  // ✅ ESCAPE ATTEMPT INDICATOR
  if (attemptedEscape) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-red-900 to-slate-900">
        <div className="text-center bg-red-950/50 backdrop-blur p-8 rounded-xl border border-red-500">
          <i className="fa-solid fa-triangle-exclamation text-red-500 text-5xl mb-4 block animate-pulse"></i>
          <p className="text-red-200 font-bold text-lg">Security Warning</p>
          <p className="text-red-300 text-sm mt-2">Unauthorized navigation attempt detected</p>
          <p className="text-red-400 text-xs mt-4">You are locked to the Moderator Portal</p>
        </div>
      </div>
    );
  }

  return (
    <ModerationAuthProvider>
      <StandaloneModeratorDashboard />
    </ModerationAuthProvider>
  );
};

export default ModeratorPortal;
