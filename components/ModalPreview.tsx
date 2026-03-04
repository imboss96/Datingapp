import React, { useState } from 'react';
import MatchModal from './MatchModal';
import { AlertProvider } from '../services/AlertContext';

export default function ModalPreview() {
  const [showModal, setShowModal] = useState(true);

  const mockMatchedUser = {
    id: 'user123',
    name: 'Sarah Johnson',
    username: 'sarahj',
    age: 26,
    location: 'Lagos, Nigeria',
    images: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop'],
    interests: ['Travel', 'Photography', 'Yoga', 'Music', 'Cooking'],
    role: 'user' as const,
    isPremium: false,
    isVerified: true,
    bio: 'Love travel and photography',
  };

  return (
    <AlertProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">MatchModal Preview</h1>
          <p className="text-gray-300 mb-8">Click button to toggle the modal</p>
          
          <button
            onClick={() => setShowModal(!showModal)}
            className="px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-lg transition"
          >
            {showModal ? 'Close Modal' : 'Open Modal'}
          </button>

          {/* Modal Component */}
          <MatchModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            matchedUser={mockMatchedUser as any}
            interestMatch={87}
            onMessage={() => console.log('Message clicked')}
          />
        </div>
      </div>
    </AlertProvider>
  );
}
