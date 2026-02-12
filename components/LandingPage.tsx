import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const testimonials = [
    {
      name: 'Sarah M.',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
      text: 'Found the love of my life on Spark! The genuine connections here are unmatched.',
      status: 'Married for 2 years'
    },
    {
      name: 'Jessica L.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
      text: 'Finally met someone who actually gets me. Spark is a game-changer!',
      status: 'In a relationship'
    },
    {
      name: 'David C.',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
      text: 'The quality of people here is incredible. Worth every penny of premium!',
      status: 'Premium Member'
    },
    {
      name: 'Emma R.',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
      text: 'Best dating app I\'ve tried. Real people, real conversations.',
      status: 'In a relationship'
    }
  ];

  const features = [
    { title: 'Smart Matching', description: 'Our algorithm learns your preferences to find compatible matches' },
    { title: 'Verified Profiles', description: 'Every profile is verified for authenticity and safety' },
    { title: 'Real Conversations', description: 'Meaningful messaging without bots or fake accounts' },
    { title: 'Instant Insights', description: 'See who likes you and matches in real-time' },
    { title: 'Advanced Filters', description: 'Find exactly who you want with powerful search tools' },
    { title: 'Premium Features', description: 'Unlimited likes, message anyone, and exclusive perks' }
  ];

  // Steps data removed as it's now defined inline in the component

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-black text-red-500">spark</h1>
            <div className="hidden md:flex gap-8 items-center text-sm font-medium">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#safety" className="text-gray-600 hover:text-gray-900">Safety</a>
              <a href="#stories" className="text-gray-600 hover:text-gray-900">Stories</a>
            </div>
            <div className="space-x-3">
              <button onClick={() => navigate('/login')} className="px-6 py-2 text-red-500 font-semibold hover:bg-red-50 rounded-full">Sign In</button>
              <button onClick={() => navigate('/login')} className="px-6 py-2 bg-red-500 text-white font-semibold rounded-full hover:bg-red-600">Get Started</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Tinder-style Hero */}
      <section className="relative bg-gradient-to-br from-pink-500 to-red-500 text-white py-20 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left: Headline + CTA */}
            <div className="w-full lg:w-1/2 space-y-6">
              <h2 className="text-5xl lg:text-6xl font-extrabold leading-tight">Find your spark — swipe, match, meet.</h2>
              <p className="text-lg opacity-90 max-w-xl">Fast, fun, and honest — swipe through real profiles and make meaningful connections. Join millions already discovering real matches.</p>

              <div className="flex items-center gap-4 mt-6">
                <button onClick={() => navigate('/login')} className="px-8 py-3 bg-white text-red-600 font-bold rounded-full shadow-lg hover:scale-105 transform transition">Create Free Account</button>
                <button onClick={() => navigate('/login')} className="px-6 py-3 border-2 border-white text-white font-semibold rounded-full hover:bg-white/10">Sign In</button>
              </div>

              <div className="flex gap-6 mt-8">
                <div>
                  <p className="text-3xl font-extrabold">10M+</p>
                  <p className="text-sm opacity-90">Matches made</p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold">500K+</p>
                  <p className="text-sm opacity-90">Active daily users</p>
                </div>
              </div>
            </div>

            {/* Right: Card stack demo */}
            <div className="w-full lg:w-1/2 flex items-center justify-center">
              <div className="relative w-80 h-[520px]">
                {/* Background stacked cards for depth */}
                <div className="absolute top-8 left-4 w-full h-full rounded-3xl bg-white/10 transform scale-95 translate-y-6 shadow-xl"></div>
                <div className="absolute top-4 left-8 w-full h-full rounded-3xl bg-white/15 transform scale-97 translate-y-3 shadow-2xl"></div>

                {/* Main card */}
                <div className="absolute inset-0 bg-white rounded-3xl overflow-hidden shadow-2xl">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=1200&fit=crop" alt="Demo" className="w-full h-3/4 object-cover" />
                  <div className="p-5 bg-gradient-to-t from-black/60 to-transparent text-white h-1/4 flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold">Alex, <span className="text-pink-300">29</span></h3>
                      <div className="text-sm opacity-90">3 miles</div>
                    </div>
                    <p className="text-sm opacity-90 mt-2">Designer • Coffee lover • Weekend hiker</p>
                  </div>
                </div>

                {/* Action buttons under card */}
                <div className="absolute left-0 right-0 bottom-[-36px] flex justify-center gap-6">
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-sm shadow-lg border-2 border-gray-100">No</div>
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-sm shadow-xl border-4 border-white">Hot</div>
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-sm shadow-lg border-2 border-gray-100">Star</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4 text-gray-900">Stand Out. Get Noticed.</h2>
            <p className="text-xl text-gray-600">Smart features designed to help you make meaningful connections</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-8 hover:shadow-lg transition border border-gray-100">
                <div className="w-12 h-12 rounded-full bg-red-100 mb-4"></div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900">How Spark Works</h2>
            <p className="text-xl text-gray-600 mt-2">Find your perfect match in four simple steps</p>
          </div>
          <div className="space-y-20">
            {[
              { num: '01', title: 'Create Your Profile', desc: 'Add photos and tell your story in 30 seconds', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop' },
              { num: '02', title: 'Discover & Swipe', desc: 'Browse amazing people and swipe on who catches your eye', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop' },
              { num: '03', title: 'Match & Chat', desc: 'When you both like each other, start a conversation', img: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=500&fit=crop' },
              { num: '04', title: 'Meet & Connect', desc: 'Take it offline and find your spark', img: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&h=500&fit=crop' }
            ].map((step, idx) => (
              <div key={idx} className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${idx % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
                <div className={idx % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className="text-red-500 font-black text-6xl mb-4">{step.num}</div>
                  <h3 className="text-3xl font-black text-gray-900 mb-4">{step.title}</h3>
                  <p className="text-lg text-gray-600">{step.desc}</p>
                </div>
                <div className={idx % 2 === 1 ? 'lg:order-1' : ''}>
                  <img src={step.img} alt={step.title} className="rounded-3xl w-full shadow-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="stories" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900">Real Stories, Real Love</h2>
            <p className="text-xl text-gray-600 mt-2">Thousands of people finding real connections on Spark</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((t, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 shadow hover:shadow-lg border border-gray-100">
                <div className="flex items-center gap-4 mb-4">
                  <img src={t.image} alt={t.name} className="w-14 h-14 rounded-full object-cover" />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.status}</p>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 fill-yellow-400" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 text-sm">"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety Section */}
      <section id="safety" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900">Safety First</h2>
            <p className="text-xl text-gray-600">Your safety is our top priority</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {[
                { title: 'Verified Profiles', desc: 'Every user is verified with photo and ID checks' },
                { title: '24/7 Moderation', desc: 'Our team monitors for fake accounts and inappropriate behavior' },
                { title: 'Block & Report', desc: 'Easy tools to block users and report suspicious activity' },
                { title: 'Privacy First', desc: 'Your data is encrypted and never shared with third parties' }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-6">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex-shrink-0"></div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <img src="https://images.unsplash.com/photo-1516534775068-bb57b6439066?w=500&h=600&fit=crop" alt="Safety" className="rounded-3xl shadow-xl" />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900">Upgrade Your Experience</h2>
            <p className="text-xl text-gray-600 mt-2">Choose a plan that works for you</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Free', price: '', features: ['5 likes per day', 'Basic messaging', 'See who likes you'] },
              { name: 'Plus', price: '$9.99/mo', features: ['Unlimited likes', 'Advanced filters', 'See likes & messages', 'No ads', 'Rematch'], highlight: true },
              { name: 'Premium', price: '$24.99/mo', features: ['Everything in Plus', 'Message anyone', 'Travel mode', 'VIP badge', 'Top Picks'] }
            ].map((plan, idx) => (
              <div key={idx} className={`rounded-2xl p-8 ${plan.highlight ? 'bg-red-500 text-white shadow-2xl scale-105' : 'bg-white border border-gray-200'}` }>
                <h3 className={`text-2xl font-bold mb-4 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                {plan.price && <p className={`text-3xl font-black mb-6 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.price}</p>}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <div className={`w-5 h-5 rounded-full ${plan.highlight ? 'bg-white/30' : 'bg-red-100'}`}></div>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-3 rounded-full font-bold ${plan.highlight ? 'bg-white text-red-500 hover:bg-gray-100' : 'bg-red-500 text-white hover:bg-red-600'}`}>Get {plan.name}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-red-500 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-black mb-6">Ready to Find Your Person?</h2>
          <p className="text-xl mb-10 max-w-2xl mx-auto opacity-90">Join millions finding real connections on Spark</p>
          <div className="flex gap-4 justify-center flex-col sm:flex-row">
            <button onClick={() => navigate('/login')} className="px-8 py-4 bg-white text-red-500 font-bold rounded-full hover:bg-gray-100">Create Free Account</button>
            <button onClick={() => navigate('/login')} className="px-8 py-4 border-2 border-white text-white font-bold rounded-full hover:bg-white/10">Sign In</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
            <div>
              <h4 className="text-white font-bold mb-6">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Press</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Safety</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white">Terms</a></li>
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Follow</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white">Instagram</a></li>
                <li><a href="#" className="hover:text-white">Twitter</a></li>
                <li><a href="#" className="hover:text-white">TikTok</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex justify-between items-center">
            <h1 className="text-xl font-black text-red-500">spark</h1>
            <p className="text-sm">&copy; 2026 Spark. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
