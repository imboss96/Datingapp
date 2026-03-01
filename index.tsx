
import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import ModerationApp from './components/ModerationApp';
import './src/globals.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';

// Check if user is accessing moderation platform
const isModerationPath = window.location.hash.includes('#/moderation-');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isModerationPath ? (
      // Standalone moderation platform (no Google OAuth needed)
      <ModerationApp />
    ) : (
      // Main app with Google OAuth
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    )}
  </React.StrictMode>
);

