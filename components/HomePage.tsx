import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Logo/Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-red-500 rounded-full shadow-lg">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21s-6.5-4.35-9-7.5C-1 7.5 6 3 12 9c6-6 13 1.5 9 4.5C18.5 16.65 12 21 12 21z" fill="white" />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-gray-900">Spark Dating</h1>
          <p className="text-lg text-gray-600">Meet people who share your heart</p>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/#/login')}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/#/signup')}
            className="w-full py-4 border-2 border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Create Account
          </button>
        </div>

        {/* Features */}
        <div className="pt-8 border-t border-gray-200 space-y-4 text-left">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-heart text-pink-500 text-lg mt-1"></i>
            <div>
              <h3 className="font-bold text-gray-900">Find Your Match</h3>
              <p className="text-sm text-gray-600">Discover compatible people nearby</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-shield text-pink-500 text-lg mt-1"></i>
            <div>
              <h3 className="font-bold text-gray-900">Stay Safe</h3>
              <p className="text-sm text-gray-600">Verified profiles and secure chat</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-video text-pink-500 text-lg mt-1"></i>
            <div>
              <h3 className="font-bold text-gray-900">Connect Instantly</h3>
              <p className="text-sm text-gray-600">Video and voice calling built-in</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-500">
          By signing in, you agree to our <a href="#" className="text-pink-600">Terms</a> and <a href="#" className="text-pink-600">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};

export default HomePage;
