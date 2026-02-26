import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { UserProfile, UserRole, VerificationStatus } from '../types';
import apiClient from '../services/apiClient';
import PasswordResetModal from './PasswordResetModal';
// ...existing code...

const LoginPage: React.FC<{ onLoginSuccess?: (user: UserProfile, isSignup: boolean) => void; onClose?: () => void; isModal?: boolean }> = ({ onLoginSuccess, onClose, isModal = false }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);

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

        // Call register endpoint and then fetch authoritative user (includes role)
        try {
          await apiClient.register(email, password, name, 25);
          // Request OTP for email verification
          try { await apiClient.requestEmailVerification(email); } catch (e) { /* ignore */ }
          // Show in-page prompt and redirect
          if (onClose) onClose();
          navigate('/verify-email-info', { state: { email, justResent: false } });
          return;
        } catch (err: any) {
          if (err.message && err.message.includes('Email registered but not verified')) {
            // If backend says email is registered but not verified, redirect and show resend
            if (onClose) onClose();
            navigate('/verify-email-info', { state: { email, justResent: true } });
            return;
          }
          setError(err.message || 'Registration failed');
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

        try {
          await apiClient.login(email, password);
          const me = await apiClient.getCurrentUser();
          console.log('[DEBUG LoginPage] Fetched current user after login:', me);
          const user: UserProfile = {
            id: me.id,
            name: me.name,
            username: me.username || '',
            age: me.age || 25,
            bio: me.bio || 'Welcome to lunesa!',
            images: me.images || [],
            isPremium: me.isPremium || false,
            role: (me.role as UserRole) || UserRole.USER,
            location: me.location || 'Not specified',
            interests: me.interests || [],
            coins: me.coins || 10,
            verification: { status: VerificationStatus.UNVERIFIED }, // Default verification status
            blockedUsers: [], // Not implemented in backend yet
            reportedUsers: [], // Not implemented in backend yet
            termsOfServiceAccepted: me.termsOfServiceAccepted || false,
            privacyPolicyAccepted: me.privacyPolicyAccepted || false,
            cookiePolicyAccepted: me.cookiePolicyAccepted || false,
          };
          // For sign-in, report as not a signup; App will decide if profile setup is needed
          onLoginSuccess?.(user, false);
        } catch (err: any) {
          if (err.message && err.message.toLowerCase().includes('email not verified')) {
            // Redirect to verify email info page and trigger resend
            if (onClose) onClose();
            navigate('/verify-email-info', { state: { email, justResent: true } });
            return;
          }
          setError(err.message || 'Authentication failed');
          setLoading(false);
        }
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

      // Fetch authoritative user after Google auth
      const me = await apiClient.getCurrentUser();
      const user: UserProfile = {
        id: me.id,
        name: me.name,
        username: me.username || '',
        age: me.age || 25,
        bio: me.bio || 'Welcome to lunesa!',
        images: me.images || [],
        isPremium: me.isPremium || false,
        role: (me.role as UserRole) || UserRole.USER,
        location: me.location || 'Not specified',
        interests: me.interests || [],
        coins: me.coins || 10,
        verification: { status: VerificationStatus.UNVERIFIED }, // Default verification status
        blockedUsers: [], // Not implemented in backend yet
        reportedUsers: [], // Not implemented in backend yet
        termsOfServiceAccepted: me.termsOfServiceAccepted || false,
        privacyPolicyAccepted: me.privacyPolicyAccepted || false,
        cookiePolicyAccepted: me.cookiePolicyAccepted || false,
      };

      // For Google sign-in, treat as signin (not explicit signup); App will decide if profile setup is needed
      onLoginSuccess?.(user, false);
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
          className={`flex-1 py-2 px-4 rounded-xl font-semibold transition-all text-sm ${
            mode === 'signin'
              ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => setMode('signup')}
          className={`flex-1 py-2 px-4 rounded-xl font-semibold transition-all text-sm ${
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
            <button
              type="button"
              onClick={() => setShowForgotPasswordModal(true)}
              className="text-sm text-pink-600 hover:underline transition-colors"
            >
              Forgot password?
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold hover:shadow-lg transition-all disabled:opacity-50 text-sm"
        >
          {loading ? (mode === 'signin' ? 'Signing in...' : 'Creating account...') : (mode === 'signin' ? 'Sign In' : 'Create Account')}
        </button>
      </form>

      <p className="text-center text-xs text-gray-500 leading-relaxed mt-6">
        By continuing, you agree to lunesa's <a href="#" className="text-pink-600 hover:underline">Terms of Use</a> and <a href="#" className="text-pink-600 hover:underline">Privacy Policy</a>
      </p>

      {/* Password Reset Modal */}
      {showForgotPasswordModal && (
        <PasswordResetModal
          isOpen={showForgotPasswordModal}
          onClose={() => setShowForgotPasswordModal(false)}
          mode="request"
          userEmail={email}
        />
      )}
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

  // ...existing code...
};

export default LoginPage;
