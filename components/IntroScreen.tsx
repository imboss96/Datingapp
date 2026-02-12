import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const IntroScreen: React.FC = () => {
  const navigate = useNavigate();
  const [currentCard, setCurrentCard] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);
  const [canSwipe, setCanSwipe] = useState(true);

  const cards = [
    {
      name: 'Sophie',
      age: 28,
      image: 'https://picsum.photos/400/600?random=10',
      bio: 'Adventure seeker, coffee lover',
      interests: ['Travel', 'Photography', 'Yoga']
    },
    {
      name: 'Emma',
      age: 26,
      image: 'https://picsum.photos/400/600?random=11',
      bio: 'Artist & creative soul',
      interests: ['Art', 'Music', 'Design']
    },
    {
      name: 'Olivia',
      age: 29,
      image: 'https://picsum.photos/400/600?random=12',
      bio: 'Fitness enthusiast',
      interests: ['Fitness', 'Hiking', 'Cooking']
    }
  ];

  useEffect(() => {
    if (timeLeft <= 0) {
      navigate('/landing');
      return;
    }

    const t = setTimeout(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearTimeout(t);
  }, [timeLeft, navigate]);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!canSwipe || isAnimating) return;

    setCanSwipe(false);
    setIsAnimating(true);

    setTimeout(() => {
      if (direction === 'right') {
        // Like animation
      } else {
        // Pass animation
      }
      setCurrentCard((prev) => (prev + 1) % cards.length);
      setIsAnimating(false);
      setCanSwipe(true);
    }, 300);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handleSwipe('left');
    if (e.key === 'ArrowRight') handleSwipe('right');
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canSwipe, isAnimating]);

  const card = cards[currentCard];

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-pink-50 flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Logo */}
      <div className="absolute top-6 flex items-center gap-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent">
          Spark
        </h1>
      </div>

      {/* Timer */}
      <div className="absolute top-6 right-6 bg-white px-6 py-3 rounded-full shadow-lg">
        <p className="text-sm text-gray-600">
          Continuing in <span className="font-bold text-red-500">{timeLeft}s</span>
        </p>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-md h-96 relative mb-8 perspective">
        {/* Card Stack */}
        <div className="relative w-full h-full">
          {/* Background cards for depth */}
          {[2, 1].map((offset) => (
            <div
              key={offset}
              className="absolute w-full h-full bg-white rounded-3xl shadow-xl"
              style={{
                transform: `scale(${1 - offset * 0.02}) translateY(${offset * 12}px)`,
                zIndex: -offset,
              }}
            ></div>
          ))}

          {/* Main card */}
          <div
            className={`absolute w-full h-full bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
              isAnimating ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
            }`}
          >
            {/* Card Image */}
            <div className="relative w-full h-3/4 overflow-hidden bg-gray-200">
              <img
                src={card.image}
                alt={card.name}
                className="w-full h-full object-cover"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

              {/* Like/Pass indicators */}
              <div className="absolute top-4 left-4 right-4 flex justify-between text-sm text-white">
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-xs font-medium">Pass</span>
                </div>
                <div className="text-white font-bold text-lg">
                  {currentCard + 1}/{cards.length}
                </div>
                <div className="w-12 h-12 rounded-full bg-red-500/80 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-xs font-medium">Like</span>
                </div>
              </div>
            </div>

            {/* Card Info */}
            <div className="h-1/4 p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {card.name}, <span className="text-red-500">{card.age}</span>
                </h2>
                <p className="text-gray-600 text-sm mt-1">{card.bio}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {card.interests.map((interest, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-8 justify-center mt-8">
        <button
          onClick={() => handleSwipe('left')}
          className="w-14 h-14 rounded-full bg-white shadow-md hover:shadow-lg transition flex items-center justify-center text-sm hover:scale-105 border-2 border-gray-200"
          title="Pass (Left Arrow)"
        >
          Pass
        </button>
        <button
          onClick={() => handleSwipe('right')}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-red-500 to-pink-600 shadow-lg hover:shadow-xl transition flex items-center justify-center text-sm hover:scale-105 text-white font-semibold"
          title="Like (Right Arrow)"
        >
          Like
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-8 left-0 right-0 text-center text-gray-600 text-sm">
        <p>Swipe or use arrow keys • Pass • Like</p>
      </div>

      {/* Decorative elements */}
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-pink-200/30 rounded-full blur-3xl"></div>
      <div className="absolute -top-40 -left-20 w-60 h-60 bg-red-200/20 rounded-full blur-3xl"></div>
    </div>
  );
};

export default IntroScreen;
