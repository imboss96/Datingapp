import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import apiClient from '../services/apiClient';
import PasswordResetModal from './PasswordResetModal';
import PhotoVerificationModal from './PhotoVerificationModal';
import EditProfileModal from './EditProfileModal';

const spinnerStyles = `
  @keyframes spin { to { transform: rotate(360deg); } }
  .profile-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 6px;
    vertical-align: middle;
  }
`;

interface Props {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  onClose: () => void;
}

interface CoinPack {
  id?: string;             // optional: backend uses numeric id, we use coins_XX format
  coins: number;           // amount of coins
  price: number;           // price in dollars
  icon?: string;           // optional icon for display
  popular?: boolean;       // optional popular badge
}

// Default coin packs (fallback if backend fetch fails)
const DEFAULT_COIN_PACKS: CoinPack[] = [
  { id: 'coins_50', coins: 50, price: 4.99, icon: 'fa-box' },
  { id: 'coins_150', coins: 150, price: 12.99, icon: 'fa-boxes-stacked', popular: true },
  { id: 'coins_350', coins: 350, price: 24.99, icon: 'fa-vault' },
  { id: 'coins_1000', coins: 1000, price: 59.99, icon: 'fa-gem' }
];

const PAYMENT_METHODS = [
  { id: 'card', name: 'Credit/Debit Card', icon: 'fa-credit-card', providers: ['Visa', 'Mastercard'] },
  { id: 'momo', name: 'Mobile Money', icon: 'fa-mobile-screen', providers: ['MTN', 'Airtel', 'M-Pesa'] },
  { id: 'apple', name: 'Apple Pay', icon: 'fa-brands fa-apple', providers: [] },
  { id: 'google', name: 'Google Pay', icon: 'fa-brands fa-google-pay', providers: [] },
];

const ProfileSettings: React.FC<Props> = ({ user, setUser, onClose }) => {
  const navigate = useNavigate();
  const [selectedPack, setSelectedPack] = useState<CoinPack | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'SELECT_METHOD' | 'PROCESSING' | 'SUCCESS'>('SELECT_METHOD');
  const [selectedMethod, setSelectedMethod] = useState<string>('card');
  const [momoNumber, setMomoNumber] = useState<string>('');  // mobile money phone number
  const [lipanaMessage, setLipanaMessage] = useState<string | null>(null);  // feedback from initiate
  const [coinEmailSent, setCoinEmailSent] = useState<boolean | null>(null);
  const [coinEmailError, setCoinEmailError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    bio: user.bio || '',
    age: user.age.toString(),
    location: user.location || '',
    interests: user.interests || [],
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

  // Coin packages state
  const [coinPackages, setCoinPackages] = useState<CoinPack[]>(DEFAULT_COIN_PACKS);
  const [loadingCoinPackages, setLoadingCoinPackages] = useState(false);

  // Premium packages state
  const [premiumPackages, setPremiumPackages] = useState<any[]>([]);
  const [loadingPremiumPackages, setLoadingPremiumPackages] = useState(false);
  const [selectedPremiumPackage, setSelectedPremiumPackage] = useState<any | null>(null);
  const [premiumPaymentStep, setPremiumPaymentStep] = useState<'SELECT_METHOD' | 'PROCESSING' | 'SUCCESS'>('SELECT_METHOD');
  const [premiumSelectedMethod, setPremiumSelectedMethod] = useState<string>('card');
  const [premiumMomoNumber, setPremiumMomoNumber] = useState<string>('');
  const [premiumEmailSent, setPremiumEmailSent] = useState<boolean | null>(null);
  const [premiumEmailError, setPremiumEmailError] = useState<string | null>(null);

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
    setMomoNumber(''); // reset mobile money number when opening
    setCoinEmailSent(null);
    setCoinEmailError(null);
  };

  const handleConfirmPayment = async () => {
    console.log('[DEBUG ProfileSettings] confirm payment clicked', { selectedMethod, momoNumber, selectedPack });
    setError(null);
    setIsProcessing(true);
    setPaymentStep('PROCESSING');

    try {
      if (!selectedPack) {
        setPaymentStep('SELECT_METHOD');
        setIsProcessing(false);
        return;
      }

      console.log('[ProfileSettings] Processing coin purchase:', {
        coins: selectedPack.coins,
        price: selectedPack.price,
        userEmail: user.email,
        method: selectedMethod,
        packageId: selectedPack.id
      });

      setLipanaMessage(null);
      const resp: any = await apiClient.post('/transactions/purchase', {
        userId: user.id,
        packageId: selectedPack.id,
        method: selectedMethod,
        phoneNumber: selectedMethod === 'momo' ? momoNumber : undefined,
      });
      setCoinEmailSent(resp.emailSent === true);
      setCoinEmailError(resp.emailSent === true ? null : (resp.emailError || 'Confirmation email could not be delivered.'));
      console.log('[ProfileSettings] Payment successful:', {
        transactionId: resp.transactionId || resp.id,
        coins: selectedPack.coins,
        userEmail: user.email,
        method: selectedMethod,
        emailSent: resp.emailSent
      });

      try {
        const refreshedUser = await apiClient.refreshUserProfile();
        console.log('[ProfileSettings] User profile refreshed:', { coins: refreshedUser.coins, isPremium: refreshedUser.isPremium });
        setUser(refreshedUser);
      } catch (refreshErr) {
        console.error('[ProfileSettings] Failed to refresh user profile, using local state:', refreshErr);
        const updatedUser = {
          ...user,
          coins: resp.coins ?? user.coins,
          isPremium: resp.isPremium ?? user.isPremium,
        };
        setUser(updatedUser);
      }

      setPaymentStep('SUCCESS');
      setIsProcessing(false);
      return;

      if (selectedMethod === 'momo') {
        // start Lipana mobile‑money flow; backend requires packageId rather than raw amount
        console.log('[DEBUG ProfileSettings] Starting momo flow with:', { phone: momoNumber, packageId: selectedPack.id });
        const init = await apiClient.lipanaInitiate(user.id, momoNumber, selectedPack.id);
        if (!init || !init.transactionId) {
          throw new Error('Failed to initiate mobile money prompt');
        }
        const txId = init.transactionId;
        setLipanaMessage(init.message || null);
        console.log('[DEBUG ProfileSettings] Lipana prompt sent, txId=', txId, 'message=', init.message);

        // poll the status until webhook updates the backend
        const poll = setInterval(async () => {
          try {
            const status = await apiClient.lipanaStatus(txId);
            const s = status.status?.toLowerCase();
            
            if (s === 'success') {
              clearInterval(poll);
              console.log('[DEBUG ProfileSettings] Payment SUCCESS - Email confirmation being sent');
              
              // Refresh user profile from server to get updated coins
              try {
                const refreshedUser = await apiClient.refreshUserProfile();
                console.log('[ProfileSettings] User profile refreshed:', { coins: refreshedUser.coins, isPremium: refreshedUser.isPremium });
                setUser(refreshedUser);
              } catch (refreshErr) {
                console.error('[ProfileSettings] Failed to refresh user profile, using local state:', refreshErr);
                // Fallback to local state update
                const updatedUser = {
                  ...user,
                  coins: status.coins ?? user.coins,
                  isPremium: status.isPremium ?? user.isPremium,
                };
                setUser(updatedUser);
              }
              
              console.log('[ProfileSettings] Lipana payment successful:', {
                transactionId: txId,
                coins: selectedPack.coins,
                userEmail: user.email,
                status: 'COMPLETED',
                emailSent: true
              });
              setPaymentStep('SUCCESS');
              setIsProcessing(false);
            } else if (s === 'failed') {
              clearInterval(poll);
              console.log('[DEBUG ProfileSettings] Payment FAILED');
              setError(status.message || 'Mobile money payment failed');
              setPaymentStep('SELECT_METHOD');
              setIsProcessing(false);
            } else if (s === 'cancelled') {
              clearInterval(poll);
              console.log('[DEBUG ProfileSettings] Payment CANCELLED');
              setError('Payment cancelled. Please try again.');
              setPaymentStep('SELECT_METHOD');
              setIsProcessing(false);
            } else {
              console.log('[DEBUG ProfileSettings] Poll status:', s);
            }
          } catch (pollErr) {
            console.error('[ERROR ProfileSettings] polling lipana status failed:', pollErr);
            clearInterval(poll);
            setError('Error checking payment status. Please refresh.');
            setPaymentStep('SELECT_METHOD');
            setIsProcessing(false);
          }
        }, 2000);  // Poll every 2 seconds instead of 5 for faster response

        // keep function returning; poll handles completion
        return;
      } else {
        // non-mobile money route uses the dummy purchase endpoint
        console.log('[DEBUG ProfileSettings] processing non-momo purchase', { method: selectedMethod, packageId: selectedPack.id });
        const resp: any = await apiClient.post('/transactions/purchase', {
          userId: user.id,
          packageId: selectedPack.id,
          method: selectedMethod,
        });
        console.log('[ProfileSettings] Payment successful:', {
          transactionId: resp.transactionId || resp.id,
          coins: selectedPack.coins,
          userEmail: user.email,
          method: selectedMethod,
          emailSent: true
        });
        
        // Refresh user profile from server to get updated coins
        try {
          const refreshedUser = await apiClient.refreshUserProfile();
          console.log('[ProfileSettings] User profile refreshed:', { coins: refreshedUser.coins, isPremium: refreshedUser.isPremium });
          setUser(refreshedUser);
        } catch (refreshErr) {
          console.error('[ProfileSettings] Failed to refresh user profile, using local state:', refreshErr);
          // Fallback to local state update
          const updatedUser = {
            ...user,
            coins: resp.coins ?? user.coins,
            isPremium: resp.isPremium ?? user.isPremium,
          };
          setUser(updatedUser);
        }
        
        setPaymentStep('SUCCESS');
        setIsProcessing(false);
        return;
      }
    } catch (err: any) {
      console.error('[ERROR ProfileSettings] Payment processing failed:', err);
      const errorMsg = err?.response?.data?.error 
        || err?.response?.error 
        || err?.message 
        || String(err) 
        || 'Payment failed. Please try again.';
      setError(errorMsg);
      setPaymentStep('SELECT_METHOD');
      setIsProcessing(false);
    } finally {
      // setIsProcessing already handled in catch, but keep finally for non-error paths
    }
  };

  const closeCheckout = () => {
    if (!isProcessing) {
      setSelectedPack(null);
      setPaymentStep('SELECT_METHOD');
      setMomoNumber('');
      setLipanaMessage(null);
      setCoinEmailSent(null);
      setCoinEmailError(null);
      setError(null);
    }
  };

  const handleOpenPremiumCheckout = (pkg: any) => {
    setSelectedPremiumPackage(pkg);
    setPremiumPaymentStep('SELECT_METHOD');
    setPremiumMomoNumber('');
    setPremiumEmailSent(null);
    setPremiumEmailError(null);
  };

  const closePremiumCheckout = () => {
    if (!isProcessing) {
      setSelectedPremiumPackage(null);
      setPremiumPaymentStep('SELECT_METHOD');
      setPremiumMomoNumber('');
      setPremiumEmailSent(null);
      setPremiumEmailError(null);
      setError(null);
    }
  };

  const handleConfirmPremiumPayment = async () => {
    console.log('[DEBUG ProfileSettings] Premium payment clicked', { selectedMethod: premiumSelectedMethod, selectedPremiumPackage });
    setError(null);
    setIsProcessing(true);
    setPremiumPaymentStep('PROCESSING');

    try {
      if (!selectedPremiumPackage) {
        setPremiumPaymentStep('SELECT_METHOD');
        setIsProcessing(false);
        return;
      }

      console.log('[ProfileSettings] Processing premium purchase:', {
        packageId: selectedPremiumPackage._id || selectedPremiumPackage.id,
        price: selectedPremiumPackage.price,
        plan: selectedPremiumPackage.plan,
        userEmail: user.email,
        method: premiumSelectedMethod
      });

      const resp: any = await apiClient.post('/transactions/purchase-premium', {
        userId: user.id,
        packageId: selectedPremiumPackage._id || selectedPremiumPackage.id,
        method: premiumSelectedMethod,
        phoneNumber: premiumSelectedMethod === 'momo' ? premiumMomoNumber : undefined,
      });
      setPremiumEmailSent(resp.emailSent === true);
      setPremiumEmailError(resp.emailSent === true ? null : (resp.emailError || 'Confirmation email could not be delivered.'));
      
      console.log('[ProfileSettings] Premium payment successful:', {
        packageId: selectedPremiumPackage._id,
        plan: selectedPremiumPackage.plan,
        userEmail: user.email,
        method: premiumSelectedMethod,
        emailSent: resp.emailSent
      });
      
      try {
        const refreshedUser = await apiClient.refreshUserProfile();
        console.log('[ProfileSettings] User profile refreshed after premium:', { isPremium: refreshedUser.isPremium, premiumExpiresAt: refreshedUser.premiumExpiresAt });
        setUser(refreshedUser);
      } catch (refreshErr) {
        console.error('[ProfileSettings] Failed to refresh user profile:', refreshErr);
      }
      
      setPremiumPaymentStep('SUCCESS');
      setIsProcessing(false);
      return;

      if (premiumSelectedMethod === 'momo') {
        // Initiate mobile money for premium  
        console.log('[DEBUG ProfileSettings] Starting momo flow for premium with:', { phone: premiumMomoNumber });
        const init = await apiClient.post('/transactions/initiate-premium', {
          userId: user.id,
          packageId: selectedPremiumPackage._id || selectedPremiumPackage.id,
          phoneNumber: premiumMomoNumber
        });
        
        if (!init || !init.transactionId) {
          throw new Error('Failed to initiate mobile money prompt');
        }
        
        const txId = init.transactionId;
        console.log('[DEBUG ProfileSettings] Premium Lipana prompt sent, txId=', txId);

        // Poll status
        const poll = setInterval(async () => {
          try {
            const status = await apiClient.lipanaStatus(txId);
            const s = status.status?.toLowerCase();
            
            if (s === 'success') {
              clearInterval(poll);
              console.log('[DEBUG ProfileSettings] Premium payment SUCCESS');
              
              // Refresh user profile to get updated premium status
              try {
                const refreshedUser = await apiClient.refreshUserProfile();
                console.log('[ProfileSettings] User profile refreshed after premium:', { isPremium: refreshedUser.isPremium, premiumExpiresAt: refreshedUser.premiumExpiresAt });
                setUser(refreshedUser);
              } catch (refreshErr) {
                console.error('[ProfileSettings] Failed to refresh user profile:', refreshErr);
              }
              
              setPremiumPaymentStep('SUCCESS');
              setIsProcessing(false);
            } else if (s === 'failed' || s === 'cancelled') {
              clearInterval(poll);
              setError('Premium payment failed or cancelled');
              setPremiumPaymentStep('SELECT_METHOD');
              setIsProcessing(false);
            }
          } catch (pollErr) {
            console.error('[ERROR ProfileSettings] polling premium payment status failed:', pollErr);
            clearInterval(poll);
            setError('Error checking payment status');
            setPremiumPaymentStep('SELECT_METHOD');
            setIsProcessing(false);
          }
        }, 2000);
        
        return;
      } else {
        // Card payment for premium
        const resp: any = await apiClient.post('/transactions/purchase-premium', {
          userId: user.id,
          packageId: selectedPremiumPackage._id || selectedPremiumPackage.id,
          method: premiumSelectedMethod,
        });
        
        console.log('[ProfileSettings] Premium payment successful:', {
          packageId: selectedPremiumPackage._id,
          plan: selectedPremiumPackage.plan,
          userEmail: user.email
        });
        
        // Refresh user profile to get updated premium status
        try {
          const refreshedUser = await apiClient.refreshUserProfile();
          console.log('[ProfileSettings] User profile refreshed after premium:', { isPremium: refreshedUser.isPremium });
          setUser(refreshedUser);
        } catch (refreshErr) {
          console.error('[ProfileSettings] Failed to refresh user profile:', refreshErr);
        }
        
        setPremiumPaymentStep('SUCCESS');
        setIsProcessing(false);
        return;
      }
    } catch (err: any) {
      console.error('[ERROR ProfileSettings] Premium payment processing failed:', err);
      const errorMsg = err?.response?.data?.error || err?.message || 'Premium purchase failed. Please try again.';
      setError(errorMsg);
      setPremiumPaymentStep('SELECT_METHOD');
      setIsProcessing(false);
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

  React.useEffect(() => {
    if (openModal === 'purchases' && transactions.length === 0 && !loadingTransactions) {
      loadTransactions();
    }
  }, [openModal]);

  // Fetch public coin packages for end users.
  React.useEffect(() => {
    const fetchCoinPackages = async () => {
      try {
        setLoadingCoinPackages(true);
        const response = await apiClient.getPublicCoinPackages();
        const rawPackages = Array.isArray(response?.packages) ? response.packages : [];

        if (rawPackages.length > 0) {
          const formatted: CoinPack[] = rawPackages.map((pkg: any, index: number) => ({
            id: String(pkg.id ?? pkg._id ?? `coins_${pkg.coins}`),
            coins: Number(pkg.coins ?? 0),
            price: Number(pkg.price ?? 0),
            icon: pkg.icon || DEFAULT_COIN_PACKS[index % DEFAULT_COIN_PACKS.length]?.icon || 'fa-coins',
            popular: Boolean(pkg.popular),
          })).filter((pkg) => Number.isFinite(pkg.coins) && pkg.coins > 0 && Number.isFinite(pkg.price) && pkg.price > 0);

          setCoinPackages(formatted.length > 0 ? formatted : DEFAULT_COIN_PACKS);
        } else {
          setCoinPackages(DEFAULT_COIN_PACKS);
        }
      } catch (error) {
        console.error('[ERROR] Failed to fetch coin packages:', error);
        setCoinPackages(DEFAULT_COIN_PACKS);
      } finally {
        setLoadingCoinPackages(false);
      }
    };
    
    fetchCoinPackages();
  }, []);

  // Fetch premium packages on component mount
  React.useEffect(() => {
    const fetchPremiumPackages = async () => {
      try {
        setLoadingPremiumPackages(true);
        const response = await apiClient.getPremiumPackages();
        if (response.success && Array.isArray(response.packages)) {
          setPremiumPackages(response.packages);
        } else if (response.premium_packages && Array.isArray(response.premium_packages)) {
          setPremiumPackages(response.premium_packages);
        }
      } catch (error) {
        console.error('[ERROR] Failed to fetch premium packages:', error);
      } finally {
        setLoadingPremiumPackages(false);
      }
    };
    
    fetchPremiumPackages();
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
    <>
      <style>{spinnerStyles}</style>
      <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.4)',
        zIndex: 999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          width: '100%',
          height: '100%',
          position: 'fixed',
          right: 0,
          top: 0,
          overflowY: 'auto',
          boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full bg-white flex flex-col relative">
          {/* Checkout Overlay */}
          {selectedPack && (
            <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeCheckout}></div>
              
              <div className="relative w-full md:max-w-md bg-white rounded-t-[2.5rem] md:rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                <div className="p-6 md:p-8">
                  {paymentStep === 'SELECT_METHOD' && (
                    <>
                      {error && (
                        <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-lg">
                          <p className="text-xs text-rose-700 font-medium">{error}</p>
                        </div>
                      )}
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
                            <p className="font-black text-gray-900">{selectedPack.coins} Spark Coins</p>
                            <p className="text-xs text-gray-500">Spark Global Virtual Currency</p>
                          </div>
                        </div>
                        <p className="text-lg font-black text-gray-900">${selectedPack.price.toFixed(2)}</p>
                      </div>

                      <div className="space-y-3 mb-8">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Method</p>
                        {PAYMENT_METHODS.map((method) => (
                          <button
                            key={method.id}
                            onClick={() => setSelectedMethod(method.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                              selectedMethod === method.id
                                ? 'border-rose-500 bg-rose-50/30'
                                : 'border-gray-100 hover:border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${selectedMethod === method.id ? 'text-rose-500' : 'text-gray-400'}`}>
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
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === method.id ? 'border-rose-500' : 'border-gray-200'}`}>
                              {selectedMethod === method.id && <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>}
                            </div>
                          </button>
                        ))}
                      </div>

                      {selectedMethod === 'momo' && (
                        <div className="mb-4">
                          <label className="block text-xs font-bold text-gray-700 mb-2">Mobile Money Number</label>
                          <input
                            type="tel"
                            value={momoNumber}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9]/g, '');
                              setMomoNumber(v);
                              if (v && selectedMethod !== 'momo') setSelectedMethod('momo');
                            }}
                            placeholder="e.g., 233501234567"
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                          />
                        </div>
                      )}

                      <button 
                        onClick={handleConfirmPayment}
                        disabled={isProcessing || (selectedMethod === 'momo' && !/^[0-9]{7,15}$/.test(momoNumber))}
                        className="w-full py-4 spark-gradient text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-transform flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="fa-solid fa-lock text-xs opacity-70"></i>
                        Pay ${selectedPack.price.toFixed(2)}
                      </button>
                      <p className="text-[10px] text-gray-400 text-center mt-4">
                        Your payment is encrypted and secure. By paying, you agree to our Terms of Service.
                      </p>
                    </>
                  )}

                  {paymentStep === 'PROCESSING' && (
                    <div className="py-20 flex flex-col items-center text-center">
                      {lipanaMessage && (
                        <p className="text-sm text-gray-700 max-w-[240px] mb-4">{lipanaMessage}</p>
                      )}
                      <div className="relative w-20 h-20 mb-6">
                        <div className="absolute inset-0 border-4 border-rose-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-rose-500 rounded-full border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-rose-500">
                          <i className="fa-solid fa-shield-halved text-2xl"></i>
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 mb-2">Processing Transaction</h3>
                      <p className="text-sm text-gray-500 max-w-[240px]">
                        Processing your {selectedMethod === 'momo' ? 'mobile money' : 'payment'} checkout in test mode. Please wait a moment.
                      </p>
                      <p className="text-xs text-gray-400 mt-4 max-w-[240px]">
                        <i className="fa-solid fa-envelope text-gray-400 mr-1"></i>
                        Confirmation email will be sent to your inbox
                      </p>
                    </div>
                  )}

                  {paymentStep === 'SUCCESS' && (
                    <div className="py-12 flex flex-col items-center text-center">
                      <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500 text-4xl mb-6 animate-bounce">
                        <i className="fa-solid fa-circle-check"></i>
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 mb-2">Purchase Successful!</h3>
                      <p className="text-sm text-gray-500 mb-2">
                        We've added <span className="font-bold text-gray-900">{selectedPack.coins} Spark Coins</span> to your wallet.
                      </p>
                      {coinEmailSent ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mx-4 mb-8">
                          <p className="text-xs text-blue-700 flex items-center justify-center gap-2">
                            <i className="fa-solid fa-envelope text-blue-600"></i>
                            <span>Confirmation email sent to <strong>{user.email}</strong></span>
                          </p>
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-4 mb-8">
                          <p className="text-xs text-amber-800 flex items-center justify-center gap-2">
                            <i className="fa-solid fa-triangle-exclamation text-amber-600"></i>
                            <span>Purchase completed, but confirmation email was not delivered.</span>
                          </p>
                          {coinEmailError && (
                            <p className="text-[11px] text-amber-700 mt-2 text-center">{coinEmailError}</p>
                          )}
                        </div>
                      )}
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

          {/* Premium Checkout Overlay */}
          {selectedPremiumPackage && (
            <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closePremiumCheckout}></div>
              
              <div className="relative w-full md:max-w-md bg-white rounded-t-[2.5rem] md:rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                <div className="p-6 md:p-8">
                  {premiumPaymentStep === 'SELECT_METHOD' && (
                    <>
                      {error && (
                        <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-lg">
                          <p className="text-xs text-rose-700 font-medium">{error}</p>
                        </div>
                      )}
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-gray-900">Premium Checkout</h3>
                        <button onClick={closePremiumCheckout} className="text-gray-400 hover:text-gray-600">
                          <i className="fa-solid fa-xmark text-xl"></i>
                        </button>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 mb-6 flex items-center justify-between border border-purple-200">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white shadow-lg">
                            <i className="fa-solid fa-crown text-xl"></i>
                          </div>
                          <div>
                            <p className="font-black text-gray-900">{selectedPremiumPackage.name}</p>
                            <p className="text-xs text-gray-500">{selectedPremiumPackage.duration} Days Premium Access</p>
                          </div>
                        </div>
                        <p className="text-lg font-black text-gray-900">${selectedPremiumPackage.price.toFixed(2)}</p>
                      </div>

                      <div className="space-y-3 mb-8">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Method</p>
                        {PAYMENT_METHODS.map((method) => (
                          <button
                            key={method.id}
                            onClick={() => setPremiumSelectedMethod(method.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                              premiumSelectedMethod === method.id
                                ? 'border-purple-500 bg-purple-50/30'
                                : 'border-gray-100 hover:border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${premiumSelectedMethod === method.id ? 'text-purple-500' : 'text-gray-400'}`}>
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
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${premiumSelectedMethod === method.id ? 'border-purple-500' : 'border-gray-200'}`}>
                              {premiumSelectedMethod === method.id && <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>}
                            </div>
                          </button>
                        ))}
                      </div>

                      {premiumSelectedMethod === 'momo' && (
                        <div className="mb-4">
                          <label className="block text-xs font-bold text-gray-700 mb-2">Mobile Money Number</label>
                          <input
                            type="tel"
                            value={premiumMomoNumber}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9]/g, '');
                              setPremiumMomoNumber(v);
                              if (v && premiumSelectedMethod !== 'momo') setPremiumSelectedMethod('momo');
                            }}
                            placeholder="e.g., 233501234567"
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        </div>
                      )}

                      <button 
                        onClick={handleConfirmPremiumPayment}
                        disabled={isProcessing || (premiumSelectedMethod === 'momo' && !/^[0-9]{7,15}$/.test(premiumMomoNumber))}
                        className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-purple-500/20 active:scale-95 transition-transform flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="fa-solid fa-lock text-xs opacity-70"></i>
                        Get Premium ${selectedPremiumPackage.price.toFixed(2)}
                      </button>
                      <p className="text-[10px] text-gray-400 text-center mt-4">
                        Your payment is encrypted and secure. By paying, you agree to our Terms of Service.
                      </p>
                    </>
                  )}

                  {premiumPaymentStep === 'PROCESSING' && (
                    <div className="py-20 flex flex-col items-center text-center">
                      <div className="relative w-20 h-20 mb-6">
                        <div className="absolute inset-0 border-4 border-purple-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-purple-500">
                          <i className="fa-solid fa-crown text-2xl"></i>
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 mb-2">Processing Premium Purchase</h3>
                      <p className="text-sm text-gray-500 max-w-[240px]">
                        Processing your {premiumSelectedMethod === 'momo' ? 'mobile money' : 'payment'} checkout in test mode. Please wait a moment.
                      </p>
                      <p className="text-xs text-gray-400 mt-4 max-w-[240px]">
                        <i className="fa-solid fa-envelope text-gray-400 mr-1"></i>
                        Confirmation email will be sent to your inbox
                      </p>
                    </div>
                  )}

                  {premiumPaymentStep === 'SUCCESS' && (
                    <div className="py-12 flex flex-col items-center text-center">
                      <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center text-purple-500 text-4xl mb-6 animate-bounce">
                        <i className="fa-solid fa-crown"></i>
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 mb-2">Welcome to Premium!</h3>
                      <p className="text-sm text-gray-500 mb-2">
                        You now have <span className="font-bold text-gray-900">{selectedPremiumPackage.duration} days</span> of unlimited access.
                      </p>
                      <div className="text-xs text-gray-600 space-y-1 mb-6 text-left bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2"><i className="fa-solid fa-check text-purple-500"></i> Unlimited Rewinds</div>
                        <div className="flex items-center gap-2"><i className="fa-solid fa-check text-purple-500"></i> Unlimited Super Likes</div>
                        <div className="flex items-center gap-2"><i className="fa-solid fa-check text-purple-500"></i> No Coin Costs</div>
                      </div>
                      {premiumEmailSent ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mx-4 mb-8">
                          <p className="text-xs text-blue-700 flex items-center justify-center gap-2">
                            <i className="fa-solid fa-envelope text-blue-600"></i>
                            <span>Confirmation email sent to <strong>{user.email}</strong></span>
                          </p>
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-4 mb-8">
                          <p className="text-xs text-amber-800 flex items-center justify-center gap-2">
                            <i className="fa-solid fa-triangle-exclamation text-amber-600"></i>
                            <span>Premium activated, but confirmation email was not delivered.</span>
                          </p>
                          {premiumEmailError && (
                            <p className="text-[11px] text-amber-700 mt-2 text-center">{premiumEmailError}</p>
                          )}
                        </div>
                      )}
                      <button 
                        onClick={closePremiumCheckout}
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
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all active:scale-95"
              title="Close profile"
              aria-label="Close profile"
            >
              <i className="fa-solid fa-xmark text-2xl"></i>
            </button>
            <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center">
              <div className="relative">
                <img src={user.images[0]} className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-xl" alt="Me" />
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center text-rose-500 shadow-md hover:scale-110 transition-transform">
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
                  onClick={() => handleOpenCheckout(coinPackages[coinPackages.length - 1])}
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
                {coinPackages.map((pack) => (
                  <button 
                    key={`${pack.coins}-${pack.price}`}
                    onClick={() => handleOpenCheckout(pack)}
                    className={`p-4 rounded-2xl border flex flex-col items-center text-center gap-2 transition-all active:scale-95 relative ${pack.popular ? 'border-amber-400 bg-amber-50 shadow-lg shadow-amber-500/10' : 'border-gray-100 bg-gray-50'}`}
                  >
                    <i className={`fa-solid ${pack.icon || 'fa-coins'} text-amber-500 text-xl mb-1`}></i>
                    <span className="text-sm font-black text-gray-900">{pack.coins} Coins</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">${pack.price.toFixed(2)}</span>
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

            {/* Premium Membership Shop */}
            {premiumPackages.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Premium Membership</h4>
                  <div className="flex items-center gap-1.5 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                    <i className="fa-solid fa-crown text-purple-500 text-xs"></i>
                    <span className="text-[9px] text-purple-600 font-black uppercase">Unlimited</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {premiumPackages.map((pkg) => (
                    <button
                      key={pkg._id || pkg.id}
                      onClick={() => handleOpenPremiumCheckout(pkg)}
                      className="p-4 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 flex flex-col gap-2 text-left transition-all active:scale-95"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-sm font-black text-gray-900">{pkg.name}</span>
                          <span className="text-[9px] text-purple-600 font-bold block">{pkg.plan.replace(/_/g, ' ').toUpperCase()}</span>
                        </div>
                        <span className="text-lg font-black text-purple-600">${pkg.price.toFixed(2)}</span>
                      </div>
                      <div className="text-[9px] text-gray-600 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <i className="fa-solid fa-check text-purple-500"></i>
                          <span>Unlimited Rewinds</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <i className="fa-solid fa-check text-purple-500"></i>
                          <span>Unlimited Super Likes</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <i className="fa-solid fa-check text-purple-500"></i>
                          <span>No Coin Costs</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Account Settings */}
            <div className="space-y-3 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Account Settings</h4>
                  <p className="mt-1 text-sm text-slate-500">Profile, billing, notifications, and trust controls.</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                  Managed tools
                </span>
              </div>
              
              {/* Edit Profile Button */}
              <button 
                onClick={() => { setError(null); setOpenModal('profile'); }}
                className="group w-full flex items-center justify-between p-4 bg-slate-50 rounded-[1.5rem] hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all"
              >
                <div className="flex items-center gap-4 text-gray-700">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                    <i className="fa-solid fa-user-pen text-sm w-5 text-center"></i>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">Edit Profile</span>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Identity</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Update photos, bio, username, and profile details.</p>
                  </div>
                </div>
                <i className="fa-solid fa-arrow-up-right-from-square text-[11px] text-slate-300 group-hover:text-blue-500"></i>
              </button>

              {/* Notifications Button */}
              <button 
                onClick={() => { setError(null); setOpenModal('notifications'); }}
                className="group w-full flex items-center justify-between p-4 bg-slate-50 rounded-[1.5rem] hover:bg-amber-50 border border-slate-200 hover:border-amber-200 transition-all"
              >
                <div className="flex items-center gap-4 text-gray-700">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <i className="fa-solid fa-bell text-sm w-5 text-center"></i>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">Notifications</span>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        {Object.values(notificationSettings).filter(Boolean).length}/4 active
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Control matches, messages, activity, and promotional alerts.</p>
                  </div>
                </div>
                <i className="fa-solid fa-arrow-up-right-from-square text-[11px] text-slate-300 group-hover:text-amber-500"></i>
              </button>

              {/* Desktop / PWA Push Toggle */}
              {pushSupported && (
                <div className="mt-3">
                  <button
                    onClick={pushEnabled ? handleDisablePush : handleEnablePush}
                    disabled={pushProcessing}
                    className={`w-full flex items-center justify-between p-4 rounded-[1.5rem] border transition-all ${pushEnabled ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200' : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200'}`}
                  >
                    <div className="flex items-center gap-4 text-gray-700">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${pushEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        <i className={`fa-solid ${pushEnabled ? 'fa-bell' : 'fa-bell-slash'} text-sm w-5 text-center`}></i>
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">Desktop & PWA Notifications</span>
                          <span className={`rounded-full border bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${pushEnabled ? 'border-emerald-200 text-emerald-700' : 'border-indigo-200 text-indigo-700'}`}>
                            {pushEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{pushEnabled ? 'This device receives instant browser alerts.' : 'Enable browser push for immediate account updates.'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pushProcessing && <i className="fa-solid fa-spinner fa-spin text-gray-400"></i>}
                      <i className={`fa-solid fa-chevron-right text-[10px] ${pushEnabled ? 'text-emerald-400' : 'text-indigo-400'}`}></i>
                    </div>
                  </button>
                  {pushEndpoint && (
                    <p className="text-[10px] text-gray-400 mt-2 truncate">Endpoint: {pushEndpoint}</p>
                  )}
                </div>
              )}

              {/* Purchase History Button */}
              <button 
                onClick={() => { 
                  setError(null); 
                  setOpenModal('purchases');
                  // Load transactions when opening the modal
                  setTimeout(() => loadTransactions(), 100);
                }}
                className="group w-full flex items-center justify-between p-4 bg-slate-50 rounded-[1.5rem] hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 transition-all"
              >
                <div className="flex items-center gap-4 text-gray-700">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <i className="fa-solid fa-credit-card text-sm w-5 text-center"></i>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">Purchase History</span>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Billing</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Review completed transactions, premium upgrades, and wallet purchases.</p>
                  </div>
                </div>
                <i className="fa-solid fa-arrow-up-right-from-square text-[11px] text-slate-300 group-hover:text-emerald-500"></i>
              </button>

              {/* Photo Verification Button */}
              <button 
                onClick={() => { setError(null); setShowPhotoVerification(true); }}
                className={`group w-full flex items-center justify-between p-4 rounded-[1.5rem] border transition-all ${
                  user.isPhotoVerified 
                    ? 'bg-green-50 hover:bg-green-100 border-green-200' 
                    : 'bg-purple-50 hover:bg-purple-100 border-purple-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                    user.isPhotoVerified ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    <i className="fa-solid fa-camera text-sm w-5 text-center"></i>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-black ${
                        user.isPhotoVerified ? 'text-green-900' : 'text-purple-900'
                      }`}>Photo Verification</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        user.isPhotoVerified
                          ? 'border-green-200 bg-white/80 text-green-700'
                          : 'border-purple-200 bg-white/70 text-purple-700'
                      }`}>
                        {user.isPhotoVerified ? 'Verified' : 'Recommended'}
                      </span>
                    </div>
                    <p className="hidden">
                      {user.isPhotoVerified ? '✓ Verified' : 'Get verified badge'}
                    </p>
                    <p className={`mt-1 text-xs ${
                      user.isPhotoVerified ? 'text-green-800/80' : 'text-purple-800/80'
                    }`}>
                      {user.isPhotoVerified
                        ? 'Your profile carries a visible trust badge that improves credibility.'
                        : 'Submit a guided selfie review to unlock a trust badge for your profile.'}
                    </p>
                  </div>
                </div>
                <i className={`fa-solid fa-arrow-up-right-from-square text-[11px] ${
                  user.isPhotoVerified ? 'text-green-300 group-hover:text-green-600' : 'text-purple-300 group-hover:text-purple-600'
                }`}></i>
              </button>
            </div>

            {/* Password Management Section */}
            <div className="mt-8 border-t border-slate-100 pt-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Security</h4>
                  <p className="mt-2 text-sm text-slate-500">Access control and credential recovery.</p>
                </div>
                <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                  Protected
                </span>
              </div>
              <button 
                onClick={() => setShowPasswordResetModal('change')}
                className="group w-full flex items-center justify-between rounded-[1.5rem] border border-blue-200 bg-gradient-to-r from-blue-50 to-white p-4 transition-all hover:border-blue-300 hover:from-blue-100 hover:to-blue-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                    <i className="fa-solid fa-lock text-sm w-5 text-center"></i>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">Change Password</span>
                      <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                        Credentials
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Update your sign-in password and keep unauthorized access out.</p>
                  </div>
                </div>
                <i className="fa-solid fa-arrow-up-right-from-square text-[11px] text-blue-300 group-hover:text-blue-600"></i>
              </button>
            </div>

            {/* Logout Section */}
            <div className="mt-8 border-t border-slate-100 pt-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Session</h4>
                  <p className="mt-2 text-sm text-slate-500">End this device session safely when you are done.</p>
                </div>
                <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-rose-700">
                  Sensitive
                </span>
              </div>
              <button 
                onClick={() => setShowLogoutConfirm(true)}
                className="group w-full flex items-center justify-between rounded-[1.5rem] border border-rose-200 bg-gradient-to-r from-rose-50 to-white p-4 transition-all hover:border-rose-300 hover:from-rose-100 hover:to-rose-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                    <i className="fa-solid fa-door-open text-sm w-5 text-center"></i>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">Logout</span>
                      <span className="rounded-full border border-rose-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">
                        Session end
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Sign out from this device and return to the authentication screen.</p>
                  </div>
                </div>
                <i className="fa-solid fa-arrow-up-right-from-square text-[11px] text-rose-300 group-hover:text-rose-600"></i>
              </button>
            </div>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
              <div className="fixed inset-0 backdrop-blur-md flex items-end md:items-center justify-center z-50 p-4">
                <div className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md">
                  <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Logout</h2>
                    <button onClick={() => setShowLogoutConfirm(false)} className="text-gray-500 hover:text-gray-700">
                      <i className="fa-solid fa-times text-lg"></i>
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-door-open text-3xl text-rose-500"></i>
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
                        className="flex-1 px-4 py-3 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 active:bg-rose-700 transition-colors text-sm"
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
              <EditProfileModal
                user={user}
                onClose={() => setOpenModal(null)}
                onSave={(updated) => {
                  setUser(prev => ({ ...prev, ...updated }));
                  setOpenModal(null);
                }}
              />
)}

            {/* Notifications Modal */}
            {openModal === 'notifications' && (
              <div className="fixed inset-0 backdrop-blur-md flex items-end md:items-center justify-center z-50 p-4">
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
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                        <p className="text-xs text-rose-700 font-medium">{error}</p>
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

            {/* Purchase History Modal */}
            {openModal === 'purchases' && (
              <div className="fixed inset-0 backdrop-blur-md flex items-end md:items-center justify-center z-50 p-4">
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
                                  <i className={`fa-solid ${transaction.type === 'PREMIUM_UPGRADE' ? 'fa-crown text-amber-500' : 'fa-coins text-rose-500'}`}></i>
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

            {/* Password Reset Modal */}
            {showPasswordResetModal && (
              <PasswordResetModal
                isOpen={showPasswordResetModal === 'change'}
                onClose={() => setShowPasswordResetModal(null)}
                mode="change"
                userEmail={user.email || ''}
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
      </div>
    </>
  );
};

export default ProfileSettings;
