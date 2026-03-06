import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ModeratorPanel from './ModeratorPanel';
import apiClient from '../services/apiClient';
import { UserProfile, UserRole } from '../types';

const StandaloneModerationDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load and verify user is admin/moderator
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await apiClient.getCurrentUser();
        if (!cancelled) {
          if (!user || !user.id) {
            setError('Not authenticated');
            navigate('/#/login');
            return;
          }
          
          // Check if user is admin or moderator
          if (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR) {
            setError('Unauthorized: Admin or Moderator role required');
            navigate('/');
            return;
          }
          
          setCurrentUser(user as UserProfile);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[ERROR] Failed to load user:', err);
          setError('Failed to load user profile');
          navigate('/#/login');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    
    return () => { cancelled = true; };
  }, [navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-semibold">Loading Moderation Dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-8 max-w-md text-center">
          <i className="fa-solid fa-exclamation-triangle text-red-500 text-4xl mb-4 block"></i>
          <h2 className="text-white font-bold text-lg mb-2">Access Denied</h2>
          <p className="text-red-200 text-sm mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Authorized: Show moderation panel
  if (currentUser) {
    return (
      <div className="w-full h-screen bg-gray-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 border-b border-slate-600 shadow-lg">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-shield-halved text-amber-400 text-2xl"></i>
                <div>
                  <h1 className="text-2xl font-black text-white">Moderation Dashboard</h1>
                  <p className="text-sm text-slate-300">
                    <i className="fa-solid fa-circle text-green-400 text-xs mr-2"></i>
                    Professional Admin Panel - {currentUser.role === UserRole.ADMIN ? 'Administrator' : 'Moderator'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-white font-semibold text-sm">{currentUser.name}</p>
                  <p className="text-slate-400 text-xs">{currentUser.role}</p>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    navigate('/#/login');
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <i className="fa-solid fa-sign-out-alt"></i>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - ModeratorPanel */}
        <div className="flex-1 overflow-hidden">
          <ModeratorPanel />
        </div>
      </div>
    );
  }

  return null;
};

export default StandaloneModerationDashboard;
