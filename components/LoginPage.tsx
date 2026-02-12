import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import apiClient from '../services/apiClient';
import { UserProfile } from '../types';

const LoginPage: React.FC<{ onLoginSuccess?: (user: UserProfile) => void }> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [location, setLocation] = useState('');
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        if (!name || !age) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }
        const response = await apiClient.register(email, password, name, parseInt(age), location);
        const mockUser = {
          id: response.user.id,
          name: response.user.name,
          age: response.user.age,
          bio: response.user.bio || '',
          images: response.user.images || [],
          isPremium: response.user.isPremium || false,
          role: response.user.role || 'standard',
          location: response.user.location || location || 'Not specified',
          interests: response.user.interests || [],
          coins: response.user.coins || 10
        };
        onLoginSuccess?.(mockUser);
        navigate('/');
      } else {
        const response = await apiClient.login(email, password);
        const mockUser = {
          id: response.user.id,
          name: response.user.name,
          age: response.user.age,
          bio: response.user.bio || '',
          images: response.user.images || [],
          isPremium: response.user.isPremium || false,
          role: response.user.role || 'standard',
          location: response.user.location || 'Not specified',
          interests: response.user.interests || [],
          coins: response.user.coins || 10
        };
        onLoginSuccess?.(mockUser);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError('');

    try {
      const decoded = jwtDecode<any>(credentialResponse.credential);
      
      const response = await apiClient.googleSignIn(
        credentialResponse.credential,
        decoded.email,
        decoded.name,
        decoded.picture
      );
      
      localStorage.setItem('googleUser', JSON.stringify({
        userId: response.user.id,
        name: response.user.name,
        email: response.user.email,
        profilePicture: response.user.profilePicture,
        isNewUser: !response.user.age || !response.user.bio
      }));
      
      if (!response.user.age || !response.user.bio) {
        navigate('/profile-setup');
      } else {
        const mockUser = {
          id: response.user.id,
          name: response.user.name,
          age: response.user.age,
          bio: response.user.bio || '',
          images: response.user.images || [],
          isPremium: response.user.isPremium || false,
          role: response.user.role || 'standard',
          location: response.user.location || 'Not specified',
          interests: response.user.interests || [],
          coins: response.user.coins || 10
        };
        onLoginSuccess?.(mockUser);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-red-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* Left: Decorative image */}
        <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-pink-200 to-red-200 p-8">
          <div className="w-80 h-96 rounded-2xl overflow-hidden shadow-xl">
            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=1200&fit=crop" alt="Romantic" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Right: Form */}
        <div className="p-10 flex flex-col justify-center">
          <div className="mb-6 text-center">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-3">
              <path d="M12 21s-6.5-4.35-9-7.5C-1 7.5 6 3 12 9c6-6 13 1.5 9 4.5C18.5 16.65 12 21 12 21z" fill="#F43F5E" />
            </svg>
            <h1 className="text-3xl font-extrabold text-gray-900">{isSignUp ? 'Create Your Spark' : 'Welcome Back'}</h1>
            <p className="text-sm text-gray-600 mt-1">Join to meet people who share your heart.</p>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            {isSignUp && (
              <>
                <input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm"
                  />
                </div>
              </>
            )}

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm"
            />

            <div className="relative">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm"
              />
              {!isSignUp && (
                <button type="button" className="absolute right-3 top-2 text-sm text-pink-600 font-medium">Forgot?</button>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold shadow-md hover:scale-102 transition-transform"
            >
              {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Log in'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">or continue with</p>
            <div className="mt-3 flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in failed')}
                text={isSignUp ? 'signup_with' : 'signin_with'}
                width="200"
              />
            </div>
          </div>

          <p className="text-center text-sm text-gray-600 mt-6">
            {isSignUp ? 'Already have an account? ' : "Don't have account yet? "}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-pink-600 font-semibold"
            >
              {isSignUp ? 'Log in' : 'Sign up'}
            </button>
          </p>

          <p className="text-center text-xs text-gray-500 mt-6">
            By continuing you agree to our <a href="#" className="text-pink-600">Terms & Conditions</a> and <a href="#" className="text-pink-600">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
