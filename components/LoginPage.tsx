import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';

const LoginPage: React.FC<{ onLoginSuccess?: (user: UserProfile, isSignup: boolean) => void; onClose?: () => void; isModal?: boolean }> = ({ onLoginSuccess, onClose, isModal = false }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        // Sign up validation
        if (!email || !password || !confirmPassword || !name) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
      } else {
        // Sign in validation
        if (!email || !password) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }
      }

      // Simulate API call
      setTimeout(() => {
        const mockUser: UserProfile = {
          id: 'user-' + Date.now(),
          name: mode === 'signup' ? name : email.split('@')[0],
          age: 28,
          bio: 'Welcome to lunesa!',
          images: ['https://picsum.photos/400/600?random=' + Math.random()],
          isPremium: false,
          role: UserRole.USER,
          location: 'New York, NY',
          interests: [],
          coins: 10
        };
        onLoginSuccess?.(mockUser, mode === 'signup');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    setLoading(true);
    // Simulate Google OAuth
    setTimeout(() => {
      const mockUser: UserProfile = {
        id: 'user-' + Date.now(),
        name: 'Google User',
        age: 28,
        bio: 'Welcome to lunesa!',
        images: ['https://picsum.photos/400/600?random=' + Math.random()],
        isPremium: false,
        role: UserRole.USER,
        location: 'New York, NY',
        interests: [],
        coins: 10
      };
      onLoginSuccess?.(mockUser, true);
    }, 1000);
  };

  const content = (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">lunesa</h1>
        <p className="text-sm text-gray-600">Find your perfect match</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-8 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setMode('signin')}
          className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all text-sm ${
            mode === 'signin'
              ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => setMode('signup')}
          className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all text-sm ${
            mode === 'signup'
              ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Sign Up
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Google Sign In/Up Button */}
      <button
        onClick={handleGoogleAuth}
        disabled={loading}
        className="w-full py-3 rounded-lg border-2 border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 transition-colors mb-4 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">or</span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleEmailAuth} className="space-y-4">
        {mode === 'signup' && (
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
            required
          />
        )}

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
          required
        />

        {mode === 'signup' && (
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
            required
          />
        )}

        {mode === 'signin' && (
          <div className="flex justify-end">
            <a href="#" className="text-sm text-pink-600 hover:underline">Forgot password?</a>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold hover:shadow-lg transition-all disabled:opacity-50 text-sm"
        >
          {loading ? (mode === 'signin' ? 'Signing in...' : 'Creating account...') : (mode === 'signin' ? 'Sign In' : 'Create Account')}
        </button>
      </form>

      <p className="text-center text-xs text-gray-500 leading-relaxed mt-6">
        By continuing, you agree to lunesa's <a href="#" className="text-pink-600 hover:underline">Terms of Use</a> and <a href="#" className="text-pink-600 hover:underline">Privacy Policy</a>
      </p>
    </div>
  );

  // If modal version, wrap with overlay and close button
  if (isModal) {
    return (
      <div className="fixed inset-0 backdrop-blur-md bg-white/20 flex items-center justify-center p-4 z-50">
        <div className="relative w-full max-w-md">
          <button
            onClick={onClose}
            className="absolute -top-10 right-0 text-gray-800 hover:text-gray-600 text-xl font-bold"
          >
            ✕
          </button>
          {content}
        </div>
      </div>
    );
  }

  // Full page version (for direct route)
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-red-50 flex items-center justify-center p-4">
      {content}
    </div>
  );
};

export default LoginPage;
