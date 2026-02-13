import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { UserProfile, UserRole } from '../types';
import apiClient from '../services/apiClient';

const LoginPage: React.FC<{ onLoginSuccess?: (user: UserProfile, isSignup: boolean) => void; onClose?: () => void; isModal?: boolean }> = ({ onLoginSuccess, onClose, isModal = false }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper function to check if profile is complete
  const isProfileComplete = (user: any): boolean => {
    console.log('[DEBUG LoginPage] Checking profile complete for user:', {
      id: user.id,
      name: user.name,
      age: user.age,
      location: user.location,
      interests: user.interests,
      interestsIsArray: Array.isArray(user.interests),
      interestsLength: Array.isArray(user.interests) ? user.interests.length : 'N/A'
    });
    const isComplete = user.interests && Array.isArray(user.interests) && user.interests.length > 0 && 
           user.location && user.location !== 'Not specified' && 
           user.age && user.age > 0;
    console.log('[DEBUG LoginPage] Profile complete:', isComplete);
    return isComplete;
  };

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

        // Call register endpoint
        const response = await apiClient.register(email, password, name, 25);
        const user: UserProfile = {
          id: response.user.id,
          name: response.user.name,
          age: response.user.age || 25,
          bio: response.user.bio || 'Welcome to lunesa!',
          images: response.user.profilePicture ? [response.user.profilePicture] : [],
          isPremium: false,
          role: UserRole.USER,
          location: response.user.location || 'Not specified',
          interests: response.user.interests || [],
          coins: response.user.coins || 10
        };
        // New signup always needs profile setup
        onLoginSuccess?.(user, true);
      } else {
        // Sign in validation
        if (!email || !password) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }

        // Call login endpoint
        const response = await apiClient.login(email, password);
        console.log('[DEBUG LoginPage] Login response:', response);
        const user: UserProfile = {
          id: response.user.id,
          name: response.user.name,
          age: response.user.age || 25,
          bio: response.user.bio || 'Welcome to lunesa!',
          images: response.user.profilePicture ? [response.user.profilePicture] : [],
          isPremium: false,
          role: UserRole.USER,
          location: response.user.location || 'Not specified',
          interests: response.user.interests || [],
          coins: response.user.coins || 10
        };
        // Check if profile is complete for returning user
        const needsProfileSetup = !isProfileComplete(response.user);
        console.log('[DEBUG LoginPage] Email login - needsProfileSetup:', needsProfileSetup);
        onLoginSuccess?.(user, needsProfileSetup);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError('');

    try {
      if (!credentialResponse.credential) {
        setError('Google authentication failed');
        setLoading(false);
        return;
      }

      // Decode the JWT token from Google
      const base64Url = credentialResponse.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const decoded = JSON.parse(jsonPayload);

      // Call backend Google auth endpoint
      const response = await apiClient.googleSignIn(
        credentialResponse.credential,
        decoded.email,
        decoded.name,
        decoded.picture
      );
      console.log('[DEBUG LoginPage] Google auth response:', response);

      const user: UserProfile = {
        id: response.user.id,
        name: response.user.name,
        age: response.user.age || 25,
        bio: response.user.bio || 'Welcome to lunesa!',
        images: response.user.profilePicture ? [response.user.profilePicture] : [],
        isPremium: false,
        role: UserRole.USER,
        location: response.user.location || 'Not specified',
        interests: response.user.interests || [],
        coins: response.user.coins || 10
      };

      // Check if profile is complete - for returning Google users, skip ProfileSetup if complete
      const needsProfileSetup = !isProfileComplete(response.user);
      console.log('[DEBUG LoginPage] Google login - needsProfileSetup:', needsProfileSetup);
      onLoginSuccess?.(user, needsProfileSetup);
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google authentication failed. Please try again.');
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
      <div className="mb-6">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          theme="outline"
          size="large"
          text="signin_with"
          locale="en_US"
        />
      </div>

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
