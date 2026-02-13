import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';

const LoginPage: React.FC<{ onLoginSuccess?: (user: UserProfile) => void }> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Mock login - in production, this would call your API
      if (!email || !password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      // Simulate API call
      setTimeout(() => {
        const mockUser: UserProfile = {
          id: 'user-' + Date.now(),
          name: email.split('@')[0],
          age: 28,
          bio: 'Welcome to Spark!',
          images: ['https://picsum.photos/400/600?random=' + Math.random()],
          isPremium: false,
          role: UserRole.USER,
          location: 'New York, NY',
          interests: [],
          coins: 10
        };
        onLoginSuccess?.(mockUser);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Spark</h1>
          <p className="text-sm text-gray-600">Sign in to your account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">Demo Mode</p>
          <p className="text-xs text-gray-500 mt-2">Enter any email and password to continue</p>
        </div>

        <p className="text-center text-xs text-gray-500 leading-relaxed mt-6">
          By signing in, you agree to Spark's <a href="#" className="text-pink-600 hover:underline">Terms of Use</a> and <a href="#" className="text-pink-600 hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
