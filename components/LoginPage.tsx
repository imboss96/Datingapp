import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { UserProfile, UserRole, VerificationStatus } from '../types';
import apiClient from '../services/apiClient';
import PasswordResetModal from './PasswordResetModal';
import AccountSuspendedPage from './AccountSuspendedPage';
import GoogleSignupBanner from './GoogleSignupBanner';
// ...existing code...

interface LoginPageProps {
  onLoginSuccess?: (user: UserProfile, isSignup: boolean) => void;
  onClose?: () => void;
  isModal?: boolean;
  initialMode?: 'signin' | 'signup';
}
const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onClose, isModal = false, initialMode }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode || 'signin');
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [suspensionError, setSuspensionError] = useState<any>(null);
  const [suspensionEmail, setSuspensionEmail] = useState('');

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
    const normalizedGender = typeof user.gender === 'string' ? user.gender.trim().toLowerCase() : '';
    const isComplete = user.interests && Array.isArray(user.interests) && user.interests.length > 0 &&
           user.images && Array.isArray(user.images) && user.images.length > 0 &&
           user.username && user.username.trim().length >= 3 &&
           user.location && user.location !== 'Not specified' &&
           user.age && user.age >= 18 &&
           ['man', 'woman', 'other'].includes(normalizedGender);
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
          // Check if email already exists but not verified
          if (err.message && (err.message.includes('already registered but not verified') || err.message.includes('Email registered but not verified'))) {
            // Direct user to login
            setError('This email is already registered but not verified. Please log in instead, and we will send you a verification email.');
            setMode('signin');
            setLoading(false);
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
            email: me.email || email,
            gender: me.gender || undefined,
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
          console.log('[DEBUG LoginPage] Login error caught:', { message: err.message, code: err.code, status: err.status });
          
          if (err.message && (err.message.toLowerCase().includes('email not verified') || err.message.includes('We have sent you a verification email'))) {
            // Email not verified - redirect to verify email page with resend flag
            if (onClose) onClose();
            navigate('/verify-email-info', { state: { email, justResent: true } });
            return;
          }
          
          // Check for account suspension or ban
          if (err.code === 'ACCOUNT_SUSPENDED' || err.code === 'ACCOUNT_BANNED') {
            console.log('[DEBUG LoginPage] Account suspended/banned, showing modal...');
            setSuspensionError(err);
            setSuspensionEmail(email);
            setShowSuspensionModal(true);
            setLoading(false);
            return;
          }
          
          // Fallback check for suspension/ban in message
          if (err.message && (err.message.includes('Account Suspended') || err.message.includes('Account Banned'))) {
            console.log('[DEBUG LoginPage] Suspension detected in message, showing modal...');
            setSuspensionError(err);
            setSuspensionEmail(email);
            setShowSuspensionModal(true);
            setLoading(false);
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
        email: me.email || decoded.email,
        gender: me.gender || undefined,
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

  // ─── Facebook Authentication ────
  const handleFacebookLogin = async () => {
    setLoading(true);
    setError('');
    try {
      // Ensure Facebook SDK is loaded
      if (!window.FB) {
        throw new Error('Facebook SDK not loaded');
      }

      // Initialize Facebook SDK (must be done once)
      window.FB.init({
        appId: import.meta.env.VITE_FACEBOOK_APP_ID || 'YOUR_FACEBOOK_APP_ID',
        xfbml: true,
        version: 'v18.0'
      });

      // Login with Facebook
      window.FB.login(async (response: any) => {
        if (response.authResponse) {
          console.log('[DEBUG LoginPage] Facebook login success');
          
          // Get user info from Facebook
          window.FB.api('/me', { fields: 'id,name,email,picture' }, async (userInfo: any) => {
            try {
              console.log('[DEBUG LoginPage] Facebook user info:', userInfo);
              
              const facebookToken = response.authResponse.accessToken;
              const email = userInfo.email || `fb_${userInfo.id}@lunesa.local`;
              const name = userInfo.name || 'Facebook User';
              const profilePicture = userInfo.picture?.data?.url;

              // Call backend Facebook auth endpoint
              const authResponse = await apiClient.facebookSignIn(
                facebookToken,
                email,
                name,
                profilePicture
              );
              console.log('[DEBUG LoginPage] Facebook auth response:', authResponse);

              // Fetch authoritative user after auth
              const me = await apiClient.getCurrentUser();
              const user: UserProfile = {
                id: me.id,
                name: me.name,
                username: me.username || '',
                email: me.email || email,
                gender: me.gender || undefined,
                age: me.age || 25,
                bio: me.bio || 'Welcome to lunesa!',
                images: me.images || [],
                isPremium: me.isPremium || false,
                role: (me.role as UserRole) || UserRole.USER,
                location: me.location || 'Not specified',
                interests: me.interests || [],
                coins: me.coins || 10,
                verification: { status: VerificationStatus.UNVERIFIED },
                blockedUsers: [],
                reportedUsers: [],
                termsOfServiceAccepted: me.termsOfServiceAccepted || false,
                privacyPolicyAccepted: me.privacyPolicyAccepted || false,
                cookiePolicyAccepted: me.cookiePolicyAccepted || false,
              };

              onLoginSuccess?.(user, false);
            } catch (err: any) {
              console.error('[ERROR LoginPage] Facebook user info fetch error:', err);
              setError(err.message || 'Failed to fetch Facebook profile');
              setLoading(false);
            }
          });
        } else {
          console.log('[DEBUG LoginPage] Facebook login cancelled');
          setError('Facebook login cancelled');
          setLoading(false);
        }
      }, { scope: 'public_profile,email' });
    } catch (err: any) {
      console.error('[ERROR LoginPage] Facebook login error:', err);
      setError(err.message || 'Facebook authentication failed');
      setLoading(false);
    }
  };

  // ─── TikTok Authentication ────
  const handleTiktokLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const clientKey = import.meta.env.VITE_TIKTOK_CLIENT_KEY || 'YOUR_TIKTOK_CLIENT_KEY';
      const redirectUri = `${window.location.origin}/auth/tiktok/callback`;
      const scope = 'user.info.basic';
      const state = Math.random().toString(36).substring(7);
      
      // Store state for CSRF protection
      sessionStorage.setItem('tiktok_state', state);
      
      // Build TikTok OAuth URL with proper query parameters
      const params = new URLSearchParams({
        client_key: clientKey,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: scope,
        state: state
      });
      
      const tiktokAuthUrl = `https://www.tiktok.com/v1/oauth/authorize?${params.toString()}`;
      
      console.log('[DEBUG LoginPage] Redirecting to TikTok:', tiktokAuthUrl);
      window.location.href = tiktokAuthUrl;
    } catch (err: any) {
      console.error('[ERROR LoginPage] TikTok login error:', err);
      setError(err.message || 'TikTok authentication failed');
      setLoading(false);
    }
  };

  // Handle TikTok OAuth callback (when component mounts and URL has code parameter)
  // Handle OAuth callback errors
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    
    if (error) {
      console.error('[ERROR LoginPage] OAuth error:', error);
      setError(`Authentication failed: ${error}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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

      {/* Google Signup Banner - Show in signup mode */}
      {mode === 'signup' && (
        <div className="mb-8">
          <GoogleSignupBanner variant="compact" />
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Google & Facebook Sign In/Up Buttons */}
      <div className="space-y-3 mb-6">
        <div className="w-full">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            size="large"
            text="signin_with"
          />
        </div>
        
        <button
          onClick={handleFacebookLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-all duration-200 text-sm"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Sign in with Facebook
        </button>
        
        <button
          onClick={handleTiktokLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-all duration-200 text-sm"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.1 1.82 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.96-.1z" />
          </svg>
          Sign in with TikTok
        </button>
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

  // Render suspension modal if needed
  if (showSuspensionModal && suspensionError) {
    return (
      <AccountSuspendedPage
        isModal={true}
        onClose={() => setShowSuspensionModal(false)}
        error={suspensionError}
        email={suspensionEmail}
      />
    );
  }

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
