
import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';

// Lightweight local stub to replace Gemini profile generation
const generateProfileStub = async (name: string) => {
  return {
    bio: `${name} loves good conversation and new experiences.`,
    interests: ['Travel', 'Music', 'Food', 'Movies']
  };
};

interface SwiperScreenProps {
  currentUser: UserProfile;
  onDeductCoin: () => void;
}

const MOCK_NAMES = ["Sarah", "James", "Elena", "Liam", "Maya", "Noah"];

const SwiperScreen: React.FC<SwiperScreenProps> = ({ currentUser, onDeductCoin }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      const newProfiles = await Promise.all(MOCK_NAMES.map(async (name, i) => {
        const data = await generateProfileStub(name);
        return {
          id: `u-${i}`,
          name,
          age: Math.floor(Math.random() * 10) + 20,
          bio: data.bio,
          images: [`https://picsum.photos/400/600?random=${i}`],
          isPremium: Math.random() > 0.8,
          role: UserRole.USER,
          location: 'Nearby',
          interests: data.interests,
          coins: 0
        };
      }));
      setProfiles(newProfiles);
      setLoading(false);
    };
    fetchProfiles();
  }, []);

  const handleSwipe = (direction: 'left' | 'right') => {
    setCurrentIndex(prev => prev + 1);
  };

  const handleSuperLike = () => {
    if (!currentUser.isPremium && currentUser.coins < 1) {
      alert("Out of coins! Top up in your profile to keep swiping.");
      return;
    }
    if (!currentUser.isPremium) onDeductCoin();
    handleSwipe('right');
  };

  const handleRewind = () => {
    if (currentIndex === 0) return;
    if (!currentUser.isPremium && currentUser.coins < 1) {
      alert("Rewind costs 1 coin. Top up to undo your last choice!");
      return;
    }
    if (!currentUser.isPremium) onDeductCoin();
    setCurrentIndex(prev => prev - 1);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-gray-500 font-medium">Finding potential matches...</p>
    </div>
  );

  if (currentIndex >= profiles.length) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white md:bg-gray-50">
      <div className="bg-red-50 p-6 rounded-full mb-4 shadow-inner">
        <i className="fa-solid fa-location-dot text-4xl text-red-500"></i>
      </div>
      <h2 className="text-2xl font-bold text-gray-800">No more people!</h2>
      <p className="text-gray-500 mt-2 max-w-xs leading-relaxed">Try increasing your distance or adjusting your filters to see more profiles.</p>
      <button 
        onClick={() => setCurrentIndex(0)}
        className="mt-6 px-10 py-3 spark-gradient text-white rounded-full font-bold shadow-xl active:scale-95 transition-transform"
      >
        Refresh Discovery
      </button>
    </div>
  );

  const profile = profiles[currentIndex];

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 md:p-8 bg-white md:bg-gray-50">
      <div className="w-full h-full max-w-[420px] max-h-[700px] flex flex-col relative group">
        <div className="flex-1 relative">
          <div className="absolute inset-0 bg-gray-200 rounded-[2rem] overflow-hidden shadow-2xl swipe-card ring-1 ring-black/5">
            <img 
              src={profile.images[0]} 
              alt={profile.name} 
              className="w-full h-full object-cover select-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
            
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-3xl font-extrabold tracking-tight">{profile.name}, {profile.age}</h3>
                {profile.isPremium && (
                  <span className="premium-gradient px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-lg">
                    Premium
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300 mb-4">
                <i className="fa-solid fa-location-arrow text-[10px]"></i>
                <span className="font-medium">{profile.location}</span>
              </div>
              <p className="text-sm line-clamp-3 text-gray-100 mb-6 leading-relaxed font-normal">{profile.bio}</p>
              <div className="flex flex-wrap gap-2.5">
                {profile.interests.map(interest => (
                  <span key={interest} className="bg-white/10 backdrop-blur-xl ring-1 ring-white/20 px-4 py-1.5 rounded-full text-[11px] font-semibold">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex justify-center gap-5 mt-8 pb-4">
          <button 
            onClick={handleRewind}
            className="w-14 h-14 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center text-amber-500 text-xl hover:bg-amber-50 active:scale-90 transition-all group/btn"
            title="Rewind (1 Coin)"
          >
            <i className="fa-solid fa-rotate-left"></i>
            {!currentUser.isPremium && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">1</span>
            )}
          </button>
          <button 
            onClick={() => handleSwipe('left')}
            className="w-16 h-16 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center text-red-500 text-2xl hover:bg-red-50 active:scale-90 transition-all"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          <button 
            onClick={handleSuperLike}
            className="w-14 h-14 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center text-blue-400 text-xl hover:bg-blue-50 active:scale-90 transition-all relative"
            title="Super Like (1 Coin)"
          >
            <i className="fa-solid fa-star"></i>
             {!currentUser.isPremium && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">1</span>
            )}
          </button>
          <button 
            onClick={() => handleSwipe('right')}
            className="w-16 h-16 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center text-emerald-500 text-2xl hover:bg-emerald-50 active:scale-90 transition-all"
          >
            <i className="fa-solid fa-heart"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SwiperScreen;
