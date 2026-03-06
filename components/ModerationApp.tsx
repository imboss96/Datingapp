import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';
import ModerationTestPage from './ModerationTestPage';
import { ModerationAuthProvider, useModerationAuth } from '../services/ModerationAuthContext';
import { WebSocketProvider } from '../services/WebSocketProvider';
import { AlertProvider } from '../services/AlertContext';

/**
 * Standalone Moderation App
 * No dependency on main app authentication or state
 * Completely independent platform
 */
const ModerationAppContent: React.FC = () => {
  const { user } = useModerationAuth();

  return (
    <WebSocketProvider userId={user?.id || null}>
      <AlertProvider>
        <HashRouter>
          <Routes>
            <Route path="/moderation-test" element={<ModerationTestPage />} />
            <Route path="/moderator-portal" element={<Navigate to="/moderation-test" replace />} />
            <Route path="/" element={<Navigate to="/moderation-test" />} />
            <Route path="*" element={<Navigate to="/moderation-test" />} />
          </Routes>
        </HashRouter>
      </AlertProvider>
    </WebSocketProvider>
  );
};

const ModerationApp: React.FC = () => {
  useEffect(() => {
    document.documentElement.classList.add('standalone-moderation');
    document.body.classList.add('standalone-moderation');

    return () => {
      document.documentElement.classList.remove('standalone-moderation');
      document.body.classList.remove('standalone-moderation');
    };
  }, []);

  return (
    <ErrorBoundary>
      <ModerationAuthProvider>
        <ModerationAppContent />
      </ModerationAuthProvider>
    </ErrorBoundary>
  );
};

export default ModerationApp;
