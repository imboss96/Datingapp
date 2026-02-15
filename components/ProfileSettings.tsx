
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import apiClient from '../services/apiClient';
import PasswordResetModal from './PasswordResetModal';
import PhotoVerificationModal from './PhotoVerificationModal';

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
  const navigate = useNavigate();
  const [selectedPack, setSelectedPack] = useState<CoinPack | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'SELECT_METHOD' | 'PROCESSING' | 'SUCCESS'>('SELECT_METHOD');
  const [selectedMethod, setSelectedMethod] = useState<string>('card');
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    bio: user.bio,
    age: user.age.toString(),
    location: user.location,
    interests: user.interests,
    images: user.images || [],
    username: user.username || '',
  });
  const [notificationSettings, setNotificationSettings] = useState({
    newMatches: true,
    newMessages: true,
    activityUpdates: true,
    promotions: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState<'change' | null>(null);
  const [showPhotoVerification, setShowPhotoVerification] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'checking' | 'available' | 'taken' | null>(null);
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushEndpoint, setPushEndpoint] = useState<string | null>(null);
  const [pushProcessing, setPushProcessing] = useState(false);

  const interestsList = [
    'Travel', 'Fitness', 'Music', 'Art', 'Food', 'Gaming', 'Reading',
    'Sports', 'Cooking', 'Photography', 'Dance', 'Hiking', 'Movies',
    'Yoga', 'Fashion', 'Technology', 'Pets', 'Volunteering'
  ];

  const toggleInterest = (interest: string) => {
    if (editData.interests.includes(interest)) {
      setEditData({...editData, interests: editData.interests.filter(i => i !== interest)});
    } else {
      setEditData({...editData, interests: [...editData.interests, interest]});
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const fileArray = Array.from(files);
      const uploadPromises = fileArray.map((file, index) =>
        (async () => {
          try {
            const result = await apiClient.uploadImage(file);
            setUploadProgress((prev) => Math.min(prev + Math.floor(100 / fileArray.length), 90));
            return result.imageUrl;
          } catch (err) {
            console.error(`Error uploading file ${index}:`, err);
            throw err;
          }
        })()
      );

      const uploadedUrls = await Promise.all(uploadPromises);
      
      setEditData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }));
      
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 500);
      console.log('[DEBUG ProfileSettings] Images uploaded:', uploadedUrls);
    } catch (err: any) {
      setError(err.message || 'Failed to upload images');
      console.error('[ERROR ProfileSettings] Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setEditData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSignOut = async () => {
    try {
      // Call logout endpoint to clear server-side cookie
      await apiClient.logout();
    } catch (err) {
      console.error('[ERROR ProfileSettings] Logout API call failed:', err);
    }
    
    // Clear client-side user data
    setUser(null as any);
    window.location.hash = '#/';
  };

  const handleOpenCheckout = (pack: CoinPack) => {
    setSelectedPack(pack);
    setPaymentStep('SELECT_METHOD');
  };

  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    setPaymentStep('PROCESSING');
    
    try {
      if (!selectedPack) {
        setPaymentStep('SELECT_METHOD');
        setIsProcessing(false);
        return;
      }

      const isPremium = selectedPack.amount > 1000;
      
      // Call backend to process purchase and save to database
      const result = await apiClient.processPurchase(
        user.id,
        selectedPack.amount,
        selectedPack.price,
        selectedMethod,
        isPremium
      );

      console.log('[DEBUG ProfileSettings] Payment processed:', result);

      // Update local user state with the response from backend
      const updatedUser = {
        ...user,
        coins: result.user.coins,
        isPremium: result.user.isPremium,
      };

      setUser(updatedUser);
      // backend is authoritative; no localStorage write
      
      setPaymentStep('SUCCESS');
    } catch (err: any) {
      console.error('[ERROR ProfileSettings] Payment processing failed:', err);
      setError(err.message || 'Payment failed. Please try again.');
      setPaymentStep('SELECT_METHOD');
    } finally {
      setIsProcessing(false);
    }
  };

  const closeCheckout = () => {
    if (!isProcessing) {
      setSelectedPack(null);
      setPaymentStep('SELECT_METHOD');
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      console.log('[DEBUG ProfileSettings] Saving profile with:', editData);
      const updatedUser = await apiClient.updateProfile(user.id, {
        bio: editData.bio,
        age: parseInt(editData.age),
        location: editData.location,
        interests: editData.interests,
        images: editData.images,
        username: editData.username.trim().toLowerCase() || undefined,
      });
      
      // Use backend response data if available, otherwise use local editData
      const updatedUserData = {
        ...user,
        ...updatedUser,
        bio: updatedUser?.bio || editData.bio,
        age: updatedUser?.age || parseInt(editData.age),
        location: updatedUser?.location || editData.location,
        interests: updatedUser?.interests || editData.interests,
        images: updatedUser?.images || editData.images,
        username: updatedUser?.username || editData.username.trim().toLowerCase() || undefined,
      };
      
      setUser(updatedUserData);
      // backend is authoritative; no localStorage write
      console.log('[DEBUG ProfileSettings] Profile saved successfully:', updatedUserData);
      console.log('[DEBUG ProfileSettings] Updated images:', updatedUserData.images.length, 'images');
      
      // Show success message
      setSuccessMessage(`✓ Profile updated successfully${updatedUserData.images.length > 0 ? ` with ${updatedUserData.images.length} photo(s)` : ''}!`);
      
      // Close modal after a brief delay
      setTimeout(() => {
        setOpenModal(null);
        setSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
      console.error('[ERROR ProfileSettings] Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus(null);
      return;
    }

    // Clear previous timeout
    if (usernameCheckTimeout) {
      clearTimeout(usernameCheckTimeout);
    }

    // Debounce the check
    const timeout = setTimeout(async () => {
      try {
        setUsernameStatus('checking');
        const result = await apiClient.checkUsernameAvailable(username.toLowerCase(), user.id);
        setUsernameStatus(result.available ? 'available' : 'taken');
      } catch (err) {
        setUsernameStatus(null);
        console.error('Error checking username:', err);
      }
    }, 500); // 500ms debounce

    setUsernameCheckTimeout(timeout);
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    setError(null);
    try {
      console.log('[DEBUG ProfileSettings] Saving notifications:', notificationSettings);
      await apiClient.updateNotificationSettings(user.id, notificationSettings);
      console.log('[DEBUG ProfileSettings] Notifications saved successfully');
      setOpenModal(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save notification settings');
      console.error('[ERROR ProfileSettings] Failed to save notifications:', err);
    } finally {
      setSaving(false);
    }
  };

  // Push helpers
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const registerForPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setError('Push notifications are not supported in this browser');
      return;
    }

    try {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setError('Notifications permission denied');
          return;
        }
      } else if (Notification.permission !== 'granted') {
        setError('Notifications permission denied');
        return;
      }

      const reg = await navigator.serviceWorker.register('/service-worker.js');
      const vapidResp: any = await apiClient.getVapidPublicKey();
      const publicKey = vapidResp?.publicKey;
      if (!publicKey) {
        setError('Server does not provide VAPID key');
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      await apiClient.subscribePush(sub);
      setPushEnabled(true);
      setPushEndpoint(sub.endpoint || null);
      setSuccessMessage('Push subscription enabled');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('[ProfileSettings] registerForPush error:', err);
      setError(err.message || 'Failed to register for push');
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await apiClient.unsubscribePush(endpoint);
        setPushEnabled(false);
        setPushEndpoint(null);
        setSuccessMessage('Unsubscribed from push notifications');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      console.error('[ProfileSettings] unsubscribeFromPush error:', err);
      setError(err.message || 'Failed to unsubscribe from push');
    }
  };

  React.useEffect(() => {
    setPushSupported(('serviceWorker' in navigator) && ('PushManager' in window));
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          setPushEnabled(true);
          setPushEndpoint(sub.endpoint || null);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const handleEnablePush = async () => {
    setPushProcessing(true);
    setError(null);
    try {
      await registerForPush();
    } finally {
      setPushProcessing(false);
    }
  };

  const handleDisablePush = async () => {
    setPushProcessing(true);
    setError(null);
    try {
      await unsubscribeFromPush();
    } finally {
      setPushProcessing(false);
    }
  };

  const loadTransactions = async () => {
    setLoadingTransactions(true);
    try {
      console.log('[DEBUG ProfileSettings] Loading transactions for user:', user.id);
      const result = await apiClient.getTransactionHistory(user.id);
      console.log('[DEBUG ProfileSettings] Transactions loaded:', result);
      setTransactions(Array.isArray(result) ? result : []);
    } catch (err: any) {
      console.error('[ERROR ProfileSettings] Failed to load transactions:', err);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
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
          <h2 className="text-white text-xl font-bold mt-3 tracking-tight">{user.username || user.name}, {user.age}</h2>
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
          
          {/* Edit Profile Button */}
          <button 
            onClick={() => { setError(null); setOpenModal('profile'); }}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 active:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-4 text-gray-700">
              <i className="fa-solid fa-user-pen text-sm text-gray-400 w-5 text-center"></i>
              <span className="text-sm font-semibold">Edit Profile</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>

          {/* Notifications Button */}
          <button 
            onClick={() => { setError(null); setOpenModal('notifications'); }}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 active:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-4 text-gray-700">
              <i className="fa-solid fa-bell text-sm text-gray-400 w-5 text-center"></i>
              <span className="text-sm font-semibold">Notifications</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>

          {/* Desktop / PWA Push Toggle */}
          {pushSupported && (
            <div className="mt-3">
              <button
                onClick={pushEnabled ? handleDisablePush : handleEnablePush}
                disabled={pushProcessing}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-colors ${pushEnabled ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-indigo-50 hover:bg-indigo-100'}`}
              >
                <div className="flex items-center gap-4 text-gray-700">
                  <i className={`fa-solid ${pushEnabled ? 'fa-bell' : 'fa-bell-slash'} text-sm text-gray-400 w-5 text-center`}></i>
                  <div className="text-left">
                    <span className="text-sm font-semibold">Desktop & PWA Notifications</span>
                    <div className="text-xs text-gray-500">{pushEnabled ? 'Enabled' : 'Disabled'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pushProcessing && <i className="fa-solid fa-spinner fa-spin text-gray-400"></i>}
                  <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
                </div>
              </button>
              {pushEndpoint && (
                <p className="text-[10px] text-gray-400 mt-2 truncate">Endpoint: {pushEndpoint}</p>
              )}
            </div>
          )}

          {/* Privacy & Safety Button */}
          <button 
            onClick={() => { setError(null); setOpenModal('privacy'); }}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 active:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-4 text-gray-700">
              <i className="fa-solid fa-shield-check text-sm text-gray-400 w-5 text-center"></i>
              <span className="text-sm font-semibold">Privacy & Safety</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>

          {/* Purchase History Button */}
          <button 
            onClick={() => { 
              setError(null); 
              setOpenModal('purchases');
              // Load transactions when opening the modal
              setTimeout(() => loadTransactions(), 100);
            }}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 active:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-4 text-gray-700">
              <i className="fa-solid fa-credit-card text-sm text-gray-400 w-5 text-center"></i>
              <span className="text-sm font-semibold">Purchase History</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>

          {/* Help Center Button */}
          <button 
            onClick={() => { setError(null); setOpenModal('help'); }}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 active:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-4 text-gray-700">
              <i className="fa-solid fa-circle-question text-sm text-gray-400 w-5 text-center"></i>
              <span className="text-sm font-semibold">Help Center</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>

          {/* Photo Verification Button */}
          <button 
            onClick={() => { setError(null); setShowPhotoVerification(true); }}
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-colors ${
              user.isPhotoVerified 
                ? 'bg-green-50 hover:bg-green-100' 
                : 'bg-purple-50 hover:bg-purple-100'
            }`}
          >
            <div className="flex items-center gap-4">
              <i className={`fa-solid fa-camera text-sm w-5 text-center ${
                user.isPhotoVerified ? 'text-green-600' : 'text-purple-600'
              }`}></i>
              <div className="text-left">
                <span className={`text-sm font-semibold block ${
                  user.isPhotoVerified ? 'text-green-700' : 'text-purple-700'
                }`}>Photo Verification</span>
                <span className="text-xs opacity-75">
                  {user.isPhotoVerified ? '✓ Verified' : 'Get verified badge'}
                </span>
              </div>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>
        </div>

        {/* Password Management Section */}
        <div className="mt-8 pt-8 border-t-2 border-gray-100">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Security</h4>
          <button 
            onClick={() => setShowPasswordResetModal('change')}
            className="w-full flex items-center justify-between p-4 bg-blue-50 rounded-2xl hover:bg-blue-100 active:bg-blue-100 transition-colors border border-blue-200"
          >
            <div className="flex items-center gap-4 text-blue-700">
              <i className="fa-solid fa-lock text-sm text-blue-500 w-5 text-center"></i>
              <span className="text-sm font-semibold">Change Password</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-blue-400"></i>
          </button>
        </div>

        {/* Logout Section */}
        <div className="mt-8 pt-8 border-t-2 border-gray-100">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Logout</h4>
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-between p-4 bg-red-50 rounded-2xl hover:bg-red-100 active:bg-red-100 transition-colors border border-red-200"
          >
            <div className="flex items-center gap-4 text-red-700">
              <i className="fa-solid fa-door-open text-sm text-red-500 w-5 text-center"></i>
              <span className="text-sm font-semibold">Logout</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-red-400"></i>
          </button>
        </div>

        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Logout</h2>
                <button onClick={() => setShowLogoutConfirm(false)} className="text-gray-500 hover:text-gray-700">
                  <i className="fa-solid fa-times text-lg"></i>
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-door-open text-3xl text-red-500"></i>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Sign Out?</h3>
                  <p className="text-sm text-gray-600 mb-6">You'll need to login again to access your account. Are you sure you want to logout?</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 active:bg-red-700 transition-colors text-sm"
                  >
                    Yes, Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Profile Modal */}
        {openModal === 'profile' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-gray-900">Edit Profile</h2>
                <button onClick={() => setOpenModal(null)} className="text-gray-500 hover:text-gray-700">
                  <i className="fa-solid fa-times text-lg"></i>
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Industry Recommendation */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-800"><strong>Pro Tip:</strong> Profiles with clear bio + verified photos get 3x more matches!</p>
                </div>

                {/* Profile Photos */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Profile Photos</label>
                  
                  {/* Upload File Input */}
                  <div className="mb-3">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-rose-500 transition-colors focus:outline-none bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Drop photos (JPG, PNG) • Max 5 per upload</p>
                    
                    {/* Upload Progress */}
                    {uploading && uploadProgress > 0 && (
                      <div className="mt-2">
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-1 text-center font-medium">{uploadProgress}% Uploading...</p>
                      </div>
                    )}
                  </div>

                  {/* Image Previews */}
                  {editData.images.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-700 font-semibold mb-2">Photos ({editData.images.length})</p>
                      <div className="grid grid-cols-3 gap-2">
                        {editData.images.map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={img}
                              alt={`Photo ${idx + 1}`}
                              className="w-full h-16 rounded-lg object-cover border-2 border-rose-200"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <i className="fa-solid fa-times text-xs"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Username Field */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Username (Unique identifier)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editData.username}
                      onChange={(e) => {
                        const newUsername = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
                        setEditData({...editData, username: newUsername});
                        checkUsernameAvailability(newUsername);
                      }}
                      placeholder="Choose a unique username (3+ chars, a-z, 0-9, _)"
                      minLength={3}
                      maxLength={20}
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 pr-10"
                    />
                    {/* Status indicator */}
                    <div className="absolute right-3 top-3.5 flex items-center">
                      {usernameStatus === 'checking' && (
                        <i className="fa-solid fa-spinner fa-spin text-gray-400 text-sm"></i>
                      )}
                      {usernameStatus === 'available' && (
                        <i className="fa-solid fa-check text-green-500 text-sm"></i>
                      )}
                      {usernameStatus === 'taken' && (
                        <i className="fa-solid fa-times text-red-500 text-sm"></i>
                      )}
                    </div>
                  </div>
                  <p className={`text-xs mt-1 ${
                    usernameStatus === 'available' ? 'text-green-600' :
                    usernameStatus === 'taken' ? 'text-red-600' :
                    'text-gray-500'
                  }`}>
                    {usernameStatus === 'available' && '✓ Username available'}
                    {usernameStatus === 'taken' && '✗ Username already taken'}
                    {!usernameStatus && editData.username.length > 0 && editData.username.length < 3 && 'Minimum 3 characters required'}
                    {!usernameStatus && editData.username.length === 0 && 'Optional: Leave empty for no username'}
                  </p>
                </div>

                {/* Bio Field */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Bio (Tell your story)</label>
                  <textarea
                    value={editData.bio}
                    onChange={(e) => setEditData({...editData, bio: e.target.value})}
                    placeholder="What makes you unique? (50-500 chars)"
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">{editData.bio.length}/500 characters</p>
                </div>

                {/* Age Field */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Age</label>
                  <input
                    type="number"
                    min="18"
                    max="120"
                    value={editData.age}
                    onChange={(e) => setEditData({...editData, age: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>

                {/* Location Field */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Location</label>
                  <input
                    type="text"
                    value={editData.location}
                    onChange={(e) => setEditData({...editData, location: e.target.value})}
                    placeholder="e.g., San Francisco, CA"
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>

                {/* Interests Field */}
                <div>
                <label className="block text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Interests (Select at least 1)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {interestsList.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`px-3 py-2 rounded-full font-medium text-xs transition ${
                        editData.interests.includes(interest)
                          ? 'bg-rose-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">{editData.interests.length} selected</p>
                </div>

                {/* Success Message */}
                {successMessage && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-700 font-medium">{successMessage}</p>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700 font-medium">{error}</p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setOpenModal(null)}
                    disabled={saving || uploading}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving || uploading}
                    className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 active:bg-rose-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : uploading ? 'Uploading...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Modal */}
        {openModal === 'notifications' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
                <button onClick={() => setOpenModal(null)} className="text-gray-500 hover:text-gray-700">
                  <i className="fa-solid fa-times text-lg"></i>
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* New Matches Toggle */}
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">New Matches</span>
                  <label className="relative inline-flex cursor-pointer">
                    <input type="checkbox" checked={notificationSettings.newMatches} onChange={(e) => setNotificationSettings({...notificationSettings, newMatches: e.target.checked})} className="sr-only peer" />
                    <div className="w-10 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>

                {/* New Messages Toggle */}
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">New Messages</span>
                  <label className="relative inline-flex cursor-pointer">
                    <input type="checkbox" checked={notificationSettings.newMessages} onChange={(e) => setNotificationSettings({...notificationSettings, newMessages: e.target.checked})} className="sr-only peer" />
                    <div className="w-10 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>

                {/* Activity Updates Toggle */}
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">Activity Updates</span>
                  <label className="relative inline-flex cursor-pointer">
                    <input type="checkbox" checked={notificationSettings.activityUpdates} onChange={(e) => setNotificationSettings({...notificationSettings, activityUpdates: e.target.checked})} className="sr-only peer" />
                    <div className="w-10 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>

                {/* Promotions Toggle */}
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">Promotional Emails</span>
                  <label className="relative inline-flex cursor-pointer">
                    <input type="checkbox" checked={notificationSettings.promotions} onChange={(e) => setNotificationSettings({...notificationSettings, promotions: e.target.checked})} className="sr-only peer" />
                    <div className="w-10 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700 font-medium">{error}</p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setOpenModal(null)}
                    disabled={saving}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNotifications}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 active:bg-rose-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Privacy & Safety Modal */}
        {openModal === 'privacy' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-gray-900">Privacy & Safety</h2>
                <button onClick={() => setOpenModal(null)} className="text-gray-500 hover:text-gray-700">
                  <i className="fa-solid fa-times text-lg"></i>
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-yellow-800"><strong>Safety Tip:</strong> Never share personal info or links in messages.</p>
                </div>

                {/* Profile Visibility */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Profile Visibility</label>
                  <div className="space-y-2">
                    <label className="flex items-center p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type="radio" name="visibility" defaultChecked className="w-4 h-4 text-rose-500" />
                      <span className="ml-2 text-sm text-gray-900">Public - Visible to everyone</span>
                    </label>
                    <label className="flex items-center p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type="radio" name="visibility" className="w-4 h-4 text-rose-500" />
                      <span className="ml-2 text-sm text-gray-900">Private - Only visible to matches</span>
                    </label>
                  </div>
                </div>

                {/* Report & Block */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Account Safety</p>
                  <button className="w-full px-4 py-2 text-xs border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-medium">
                    View Blocked Users (0)
                  </button>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setOpenModal(null)}
                    className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors text-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Purchase History Modal */}
        {openModal === 'purchases' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-gray-900">Purchase History</h2>
                <button 
                  onClick={() => {
                    setOpenModal(null);
                    setTransactions([]);
                  }} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="fa-solid fa-times text-lg"></i>
                </button>
              </div>
              
              <div className="p-6">
                {loadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin"></div>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fa-solid fa-shopping-bag text-gray-300 text-3xl mb-3"></i>
                    <p className="text-gray-600 font-medium text-sm">No purchases yet</p>
                    <p className="text-xs text-gray-500 mt-1">Your coin purchases will appear here</p>
                    <button 
                      onClick={loadTransactions}
                      className="mt-4 text-xs text-rose-500 font-semibold hover:underline"
                    >
                      Refresh
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                              <i className={`fa-solid ${
                                transaction.type === 'PREMIUM_UPGRADE' ? 'fa-crown text-amber-500' : 'fa-coins text-rose-500'
                              }`}></i>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {transaction.isPremiumUpgrade ? 'Premium Upgrade' : `${transaction.amount} Coins`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {transaction.method === 'card' && '💳 Card'}
                                {transaction.method === 'momo' && '📱 Mobile Money'}
                                {transaction.method === 'apple' && '🍎 Apple Pay'}
                                {transaction.method === 'google' && '🔵 Google Pay'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">{transaction.price}</p>
                            <p className="text-[10px] text-green-600 font-medium">✓ Completed</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-400">
                          {new Date(transaction.createdAt).toLocaleDateString()} at {new Date(transaction.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Help Center Modal */}
        {openModal === 'help' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-gray-900">Help Center</h2>
                <button onClick={() => setOpenModal(null)} className="text-gray-500 hover:text-gray-700">
                  <i className="fa-solid fa-times text-lg"></i>
                </button>
              </div>
              
              <div className="p-6 space-y-3">
                <a href="#" className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <p className="text-sm font-medium text-gray-900">How do I verify my profile?</p>
                </a>
                <a href="#" className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <p className="text-sm font-medium text-gray-900">How do coins work?</p>
                </a>
                <a href="#" className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <p className="text-sm font-medium text-gray-900">How do I report someone?</p>
                </a>
                <a href="#" className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <p className="text-sm font-medium text-gray-900">Contact Support</p>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Password Reset Modal */}
        {showPasswordResetModal && (
          <PasswordResetModal
            isOpen={showPasswordResetModal === 'change'}
            onClose={() => setShowPasswordResetModal(null)}
            mode="change"
            userEmail={user.email}
          />
        )}

        {/* Photo Verification Modal */}
        <PhotoVerificationModal
          isOpen={showPhotoVerification}
          onClose={() => setShowPhotoVerification(false)}
          userId={user.id}
            onSubmit={async (photoData) => {
            try {
              const response = await apiClient.post('/verification/upload-photo', {
                photoData,
                userId: user.id
              });
              
              // Update user state with verification pending status
              setUser(prev => ({
                ...prev,
                photoVerificationStatus: 'pending',
                photoVerificationSubmittedAt: new Date().toISOString()
              }));
              
              setShowPhotoVerification(false);
            } catch (err) {
              console.error('Photo upload failed:', err);
              setError('Failed to upload verification photo. Please try again.');
            }
          }}
        />

      </div>
    </div>
  );
};

export default ProfileSettings;
