
import React, { useState } from 'react';
import { UserProfile } from '../types';

interface Props {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
}

interface CoinPack {
  amount: number;
  price: string;
  icon: string;
  popular?: boolean;
}

const COIN_PACKS: CoinPack[] = [
  { amount: 50, price: '$4.99', icon: 'fa-box' },
  { amount: 200, price: '$14.99', icon: 'fa-boxes-stacked', popular: true },
  { amount: 500, price: '$29.99', icon: 'fa-vault' },
  { amount: 1200, price: '$59.99', icon: 'fa-gem' }
];

const PAYMENT_METHODS = [
  { id: 'card', name: 'Credit/Debit Card', icon: 'fa-credit-card', providers: ['Visa', 'Mastercard'] },
  { id: 'momo', name: 'Mobile Money', icon: 'fa-mobile-screen', providers: ['MTN', 'Airtel', 'M-Pesa'] },
  { id: 'apple', name: 'Apple Pay', icon: 'fa-brands fa-apple', providers: [] },
  { id: 'google', name: 'Google Pay', icon: 'fa-brands fa-google-pay', providers: [] },
];

const ProfileSettings: React.FC<Props> = ({ user, setUser }) => {
  const [selectedPack, setSelectedPack] = useState<CoinPack | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'SELECT_METHOD' | 'PROCESSING' | 'SUCCESS'>('SELECT_METHOD');
  const [selectedMethod, setSelectedMethod] = useState<string>('card');

  const handleOpenCheckout = (pack: CoinPack) => {
    setSelectedPack(pack);
    setPaymentStep('SELECT_METHOD');
  };

  const handleConfirmPayment = () => {
    setIsProcessing(true);
    setPaymentStep('PROCESSING');
    
    // Simulate payment gateway delay
    setTimeout(() => {
      if (selectedPack) {
        setUser(prev => ({ 
          ...prev, 
          coins: prev.coins + selectedPack.amount,
          isPremium: selectedPack.amount > 1000 ? true : prev.isPremium // Auto-upgrade if buying whale pack
        }));
      }
      setPaymentStep('SUCCESS');
      setIsProcessing(false);
    }, 2500);
  };

  const closeCheckout = () => {
    if (!isProcessing) {
      setSelectedPack(null);
      setPaymentStep('SELECT_METHOD');
    }
  };

  return (
    <div className="h-full bg-white flex flex-col relative">
      {/* Checkout Overlay */}
      {selectedPack && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeCheckout}></div>
          
          <div className="relative w-full md:max-w-md bg-white rounded-t-[2.5rem] md:rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 md:p-8">
              {paymentStep === 'SELECT_METHOD' && (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-900">Secure Checkout</h3>
                    <button onClick={closeCheckout} className="text-gray-400 hover:text-gray-600">
                      <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4 mb-6 flex items-center justify-between border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl spark-gradient flex items-center justify-center text-white shadow-lg">
                        <i className={`fa-solid ${selectedPack.icon} text-xl`}></i>
                      </div>
                      <div>
                        <p className="font-black text-gray-900">{selectedPack.amount} Spark Coins</p>
                        <p className="text-xs text-gray-500">Spark Global Virtual Currency</p>
                      </div>
                    </div>
                    <p className="text-lg font-black text-gray-900">{selectedPack.price}</p>
                  </div>

                  <div className="space-y-3 mb-8">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Method</p>
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                          selectedMethod === method.id 
                            ? 'border-red-500 bg-red-50/30' 
                            : 'border-gray-100 hover:border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                            selectedMethod === method.id ? 'text-red-500' : 'text-gray-400'
                          }`}>
                            <i className={method.icon}></i>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-gray-800">{method.name}</p>
                            {method.providers.length > 0 && (
                              <p className="text-[10px] text-gray-400 font-medium italic">
                                {method.providers.join(' • ')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedMethod === method.id ? 'border-red-500' : 'border-gray-200'
                        }`}>
                          {selectedMethod === method.id && <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>}
                        </div>
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={handleConfirmPayment}
                    className="w-full py-4 spark-gradient text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-transform flex items-center justify-center gap-3"
                  >
                    <i className="fa-solid fa-lock text-xs opacity-70"></i>
                    Pay {selectedPack.price}
                  </button>
                  <p className="text-[10px] text-gray-400 text-center mt-4">
                    Your payment is encrypted and secure. By paying, you agree to our Terms of Service.
                  </p>
                </>
              )}

              {paymentStep === 'PROCESSING' && (
                <div className="py-20 flex flex-col items-center text-center">
                  <div className="relative w-20 h-20 mb-6">
                    <div className="absolute inset-0 border-4 border-red-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-red-500 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-red-500">
                      <i className="fa-solid fa-shield-halved text-2xl"></i>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Processing Transaction</h3>
                  <p className="text-sm text-gray-500 max-w-[240px]">Connecting to secure gateway. Please do not close or refresh this window.</p>
                </div>
              )}

              {paymentStep === 'SUCCESS' && (
                <div className="py-12 flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500 text-4xl mb-6 animate-bounce">
                    <i className="fa-solid fa-circle-check"></i>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Purchase Successful!</h3>
                  <p className="text-sm text-gray-500 mb-8">
                    We've added <span className="font-bold text-gray-900">{selectedPack.amount} Spark Coins</span> to your wallet.
                  </p>
                  <button 
                    onClick={closeCheckout}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-transform"
                  >
                    Return to Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile UI */}
      <div className="relative h-64">
        <img src={user.images[0]} className="w-full h-full object-cover" alt="Me" />
        <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center">
          <div className="relative">
            <img src={user.images[0]} className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-xl" alt="Me" />
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center text-red-500 shadow-md hover:scale-110 transition-transform">
              <i className="fa-solid fa-camera text-xs"></i>
            </button>
          </div>
          <h2 className="text-white text-xl font-bold mt-3 tracking-tight">{user.name}, {user.age}</h2>
          <div className="mt-2 bg-white/20 backdrop-blur-md px-4 py-1 rounded-full border border-white/30 flex items-center gap-2">
            <i className="fa-solid fa-coins text-amber-400 text-xs"></i>
            <span className="text-white text-xs font-black uppercase tracking-widest">{user.isPremium ? 'Unlimited' : `${user.coins} Coins`}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-8 overflow-y-auto">
        {/* Premium Banner */}
        {!user.isPremium ? (
          <div className="premium-gradient p-6 rounded-3xl text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <i className="fa-solid fa-crown text-6xl -rotate-12 group-hover:scale-110 transition-transform"></i>
            </div>
            <h3 className="text-xl font-bold mb-2">Upgrade to Spark Gold</h3>
            <p className="text-xs opacity-90 mb-4 leading-relaxed">Unlimited coins, unlimited chats, see who likes you, and instant rewinds.</p>
            <button 
              onClick={() => handleOpenCheckout(COIN_PACKS[3])}
              className="bg-white text-orange-500 px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
            >
              Get Gold Plan
            </button>
          </div>
        ) : (
          <div className="bg-gray-900 p-6 rounded-3xl text-white shadow-xl flex items-center justify-between border-t border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <i className="fa-solid fa-crown text-amber-400"></i>
                <h3 className="text-lg font-bold tracking-tight">Spark Gold Member</h3>
              </div>
              <p className="text-xs text-gray-400">Unlimited Global Access Active</p>
            </div>
            <button className="text-[10px] font-black text-gray-400 border border-gray-700 px-4 py-2 rounded-full uppercase tracking-widest">Manage</button>
          </div>
        )}

        {/* Global Coin Shop */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Coin Shop</h4>
            <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-[9px] text-blue-600 font-black uppercase">Live Regional Pricing</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {COIN_PACKS.map((pack) => (
              <button 
                key={pack.amount}
                onClick={() => handleOpenCheckout(pack)}
                className={`p-4 rounded-2xl border flex flex-col items-center text-center gap-2 transition-all active:scale-95 relative ${pack.popular ? 'border-amber-400 bg-amber-50 shadow-lg shadow-amber-500/10' : 'border-gray-100 bg-gray-50'}`}
              >
                <i className={`fa-solid ${pack.icon} text-amber-500 text-xl mb-1`}></i>
                <span className="text-sm font-black text-gray-900">{pack.amount} Coins</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{pack.price}</span>
                {pack.popular && (
                  <span className="absolute -top-2 bg-amber-500 text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase shadow-sm">
                    Best Value
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-gray-400 text-center italic mt-2 flex items-center justify-center gap-2">
            <i className="fa-solid fa-shield-halved text-gray-300"></i>
            Supports Mobile Money (MTN, Airtel, M-Pesa), Cards, & Pay Apps.
          </p>
        </div>

        {/* Account Settings */}
        <div className="space-y-2">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Account Settings</h4>
          {[
            { icon: 'fa-user-pen', label: 'Edit Profile' },
            { icon: 'fa-bell', label: 'Notifications' },
            { icon: 'fa-lock', label: 'Privacy & Safety' },
            { icon: 'fa-credit-card', label: 'Purchase History' },
            { icon: 'fa-circle-question', label: 'Help Center' }
          ].map((item, idx) => (
            <button key={idx} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl active:bg-gray-100 transition-colors">
              <div className="flex items-center gap-4 text-gray-700">
                <i className={`fa-solid ${item.icon} text-sm text-gray-400 w-5 text-center`}></i>
                <span className="text-sm font-semibold">{item.label}</span>
              </div>
              <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
            </button>
          ))}
        </div>

        <button className="w-full py-4 text-red-500 font-bold text-sm border-2 border-red-50 border-dashed rounded-2xl active:bg-red-50 transition-colors mt-8">
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default ProfileSettings;
