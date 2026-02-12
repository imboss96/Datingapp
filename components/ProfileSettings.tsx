
import React, { useState } from 'react';
import { UserProfile, VerificationStatus } from '../types';
import VerificationModal from './VerificationModal';

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

interface PurchaseRecord {
  id: string;
  amount: number;
  price: string;
  date: string;
  method: string;
  status: 'completed' | 'pending' | 'failed';
}

interface ExtendedProfile extends UserProfile {
  height?: string;
  bodyType?: string;
  ethnicity?: string;
  religion?: string;
  relationshipGoal?: string;
  education?: string;
  job?: string;
  lookingFor?: string[];
  smoking?: string;
  drinking?: string;
  drugs?: string;
  verified?: boolean;
  pets?: string[];
  languages?: string[];
  travelLust?: string;
  musicTaste?: string[];
  passions?: string[];
}

const COIN_PACKS: CoinPack[] = [
  { amount: 50, price: '$4.99', icon: 'fa-box' },
  { amount: 200, price: '$14.99', icon: 'fa-boxes-stacked', popular: true },
  { amount: 500, price: '$29.99', icon: 'fa-vault' },
  { amount: 1200, price: '$59.99', icon: 'fa-gem' }
];

const PAYMENT_METHODS = [
  { id: 'paypal', name: 'PayPal', icon: 'fa-brands fa-paypal', providers: ['Global'], preferred: true, regions: ['GLOBAL'] },
  { id: 'card', name: 'Credit/Debit Card', icon: 'fa-credit-card', providers: ['Visa', 'Mastercard'], regions: ['GLOBAL', 'NA', 'EU', 'ASIA'] },
  { id: 'momo', name: 'Mobile Money', icon: 'fa-mobile-screen', providers: ['MTN', 'Airtel', 'M-Pesa'], regions: ['AFRICA', 'ASIA'] },
  { id: 'apple', name: 'Apple Pay', icon: 'fa-brands fa-apple', providers: [], regions: ['NA', 'EU', 'ASIA', 'OCEANIA'] },
  { id: 'google', name: 'Google Pay', icon: 'fa-brands fa-google-pay', providers: [], regions: ['GLOBAL'] },
];

const ProfileSettings: React.FC<Props> = ({ user, setUser }) => {
  const extendedUser = user as ExtendedProfile;
  
  const [selectedPack, setSelectedPack] = useState<CoinPack | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'SELECT_METHOD' | 'PROCESSING' | 'SUCCESS'>('SELECT_METHOD');
  const [userRegion, setUserRegion] = useState<string>('GLOBAL');
  const [selectedMethod, setSelectedMethod] = useState<string>('paypal');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [editBio, setEditBio] = useState(user.bio);
  const [editInterests, setEditInterests] = useState(user.interests);
  const [uploadedImages, setUploadedImages] = useState<string[]>(user.images);
  const [editHeight, setEditHeight] = useState(extendedUser.height || '');
  const [editBodyType, setEditBodyType] = useState(extendedUser.bodyType || '');
  const [editEthnicity, setEditEthnicity] = useState(extendedUser.ethnicity || '');
  const [editReligion, setEditReligion] = useState(extendedUser.religion || '');
  const [editRelationshipGoal, setEditRelationshipGoal] = useState(extendedUser.relationshipGoal || '');
  const [editEducation, setEditEducation] = useState(extendedUser.education || '');
  const [editJob, setEditJob] = useState(extendedUser.job || '');
  const [editLookingFor, setEditLookingFor] = useState(extendedUser.lookingFor || []);
  const [editSmoking, setEditSmoking] = useState(extendedUser.smoking || 'Never');
  const [editDrinking, setEditDrinking] = useState(extendedUser.drinking || 'Socially');
  const [editDrugs, setEditDrugs] = useState(extendedUser.drugs || 'Never');
  const [editPets, setEditPets] = useState(extendedUser.pets || []);
  const [editLanguages, setEditLanguages] = useState(extendedUser.languages || []);
  const [editTravelLust, setEditTravelLust] = useState(extendedUser.travelLust || '');
  const [editMusicTaste, setEditMusicTaste] = useState(extendedUser.musicTaste || []);
  const [editPassions, setEditPassions] = useState(extendedUser.passions || []);
  const [notificationSettings, setNotificationSettings] = useState({
    likes: true,
    matches: true,
    messages: true,
    offers: false
  });
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseRecord[]>([
    {
      id: '1',
      amount: 200,
      price: '$14.99',
      date: '2026-02-10',
      method: 'Credit Card',
      status: 'completed'
    },
    {
      id: '2',
      amount: 50,
      price: '$4.99',
      date: '2026-02-05',
      method: 'Google Pay',
      status: 'completed'
    },
    {
      id: '3',
      amount: 500,
      price: '$29.99',
      date: '2026-01-28',
      method: 'Credit Card',
      status: 'completed'
    }
  ]);

  // Detect user region on mount
  React.useEffect(() => {
    const detectRegion = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const countryCode = data.country_code;
        
        // Map country codes to regions
        let region = 'GLOBAL';
        const africaCountries = ['ZA', 'KE', 'GH', 'NG', 'EG', 'CM', 'UG', 'TZ', 'RW', 'BN', 'SN'];
        const asiaCountries = ['IN', 'PH', 'KH', 'TH', 'VN', 'ID', 'MY', 'SG', 'BD', 'PK', 'CN', 'JP', 'KR', 'TW', 'HK'];
        const naCountries = ['US', 'CA', 'MX', 'BZ', 'CR', 'SV', 'GT', 'HN', 'NI', 'PA'];
        const euCountries = ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'GR', 'PT'];
        const oceaniaCountries = ['AU', 'NZ', 'FJ'];
        
        if (africaCountries.includes(countryCode)) region = 'AFRICA';
        else if (asiaCountries.includes(countryCode)) region = 'ASIA';
        else if (naCountries.includes(countryCode)) region = 'NA';
        else if (euCountries.includes(countryCode)) region = 'EU';
        else if (oceaniaCountries.includes(countryCode)) region = 'OCEANIA';
        
        setUserRegion(region);
        setSelectedMethod('paypal'); // PayPal is always the preferred global option
      } catch (error) {
        console.log('Location detection failed, using PayPal as default');
        setSelectedMethod('paypal');
      }
    };
    
    detectRegion();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string' && uploadedImages.length < 9) {
            setUploadedImages([...uploadedImages, reader.result]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const moveImageUp = (index: number) => {
    if (index > 0) {
      const newImages = [...uploadedImages];
      [newImages[index], newImages[index - 1]] = [newImages[index - 1], newImages[index]];
      setUploadedImages(newImages);
    }
  };

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
        // Add to purchase history
        const newPurchase: PurchaseRecord = {
          id: Date.now().toString(),
          amount: selectedPack.amount,
          price: selectedPack.price,
          date: new Date().toISOString().split('T')[0],
          method: selectedMethod === 'card' ? 'Credit Card' : 
                  selectedMethod === 'momo' ? 'Mobile Money' :
                  selectedMethod === 'apple' ? 'Apple Pay' : 
                  selectedMethod === 'paypal' ? 'PayPal' : 'Google Pay',
          status: 'completed'
        };
        setPurchaseHistory(prev => [newPurchase, ...prev]);

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

  const handleSaveProfile = () => {
    setUser((prev) => ({
      ...prev,
      bio: editBio,
      interests: editInterests,
      images: uploadedImages,
      height: editHeight,
      bodyType: editBodyType,
      ethnicity: editEthnicity,
      religion: editReligion,
      relationshipGoal: editRelationshipGoal,
      education: editEducation,
      job: editJob,
      lookingFor: editLookingFor,
      smoking: editSmoking,
      drinking: editDrinking,
      drugs: editDrugs,
      pets: editPets,
      languages: editLanguages,
      travelLust: editTravelLust,
      musicTaste: editMusicTaste,
      passions: editPassions,
    } as ExtendedProfile));
    setActiveSection(null);
  };

  const handleNotificationChange = (key: string) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
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
                    <div className="flex items-center justify-between ml-1 mb-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Method</p>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                        <i className="fa-solid fa-location-dot text-xs"></i>
                        Region: {userRegion}
                      </p>
                    </div>
                    {PAYMENT_METHODS.map((method) => {
                      const isAvailable = method.regions.includes(userRegion) || method.regions.includes('GLOBAL');
                      const isPreferred = method.id === 'paypal' || (isAvailable && selectedMethod === method.id);
                      
                      return (
                        <button
                          key={method.id}
                          onClick={() => setSelectedMethod(method.id)}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all relative ${
                            selectedMethod === method.id 
                              ? 'border-red-500 bg-red-50/30 shadow-lg shadow-red-500/10' 
                              : 'border-gray-100 hover:border-gray-200 bg-white'
                          } ${!isAvailable ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          {method.id === 'paypal' && (
                            <div className="absolute -top-2.5 left-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-[8px] px-3 py-1 rounded-full font-black uppercase tracking-wider shadow-md">
                              🌍 Preferred Global
                            </div>
                          )}
                          {isAvailable && method.id !== 'paypal' && selectedMethod === method.id && (
                            <div className="absolute -top-2.5 left-4 bg-emerald-500 text-white text-[8px] px-3 py-1 rounded-full font-black uppercase tracking-wider shadow-md">
                              ✓ Available in {userRegion}
                            </div>
                          )}
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
                      );
                    })}
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
        {/* If a section is active, show only that section */}
        {activeSection ? (
          <>
            {/* Photos Section */}
            {activeSection === 'photos' && (
              <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border-2 border-red-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Manage Photos</h3>
                  <button onClick={() => setActiveSection(null)} className="text-gray-400 hover:text-gray-600">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                <p className="text-sm text-gray-600">Add up to 9 photos. Your first photo will be your profile picture.</p>

                {/* Upload Area */}
                <label className="block border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-red-500 hover:bg-red-50/50 transition-colors">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <i className="fa-solid fa-camera text-4xl text-gray-400 block"></i>
                    <p className="font-bold text-gray-700">Click to upload photos</p>
                    <p className="text-xs text-gray-500">or drag and drop</p>
                  </div>
                </label>

                {/* Photo Grid */}
                {uploadedImages.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-gray-700">Your Photos ({uploadedImages.length}/9)</p>
                    <div className="grid grid-cols-3 gap-3">
                      {uploadedImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img src={image} alt={`Photo ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                          {index === 0 && (
                            <div className="absolute top-1 left-1 bg-red-500 text-white text-[8px] px-2 py-1 rounded-full font-bold">
                              MAIN
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-lg transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                            {index > 0 && (
                              <button
                                onClick={() => moveImageUp(index)}
                                className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-900 hover:bg-red-500 hover:text-white transition-colors"
                                title="Move up"
                              >
                                <i className="fa-solid fa-arrow-up text-xs"></i>
                              </button>
                            )}
                            <button
                              onClick={() => removeImage(index)}
                              className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-900 hover:bg-red-500 hover:text-white transition-colors"
                              title="Delete"
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSaveProfile}
                  className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                >
                  Save Photos
                </button>
              </div>
            )}

            {/* Basic Info Section */}
            {activeSection === 'basic' && (
              <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border-2 border-red-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Basic Information</h3>
                  <button onClick={() => setActiveSection(null)} className="text-gray-400 hover:text-gray-600">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Height</label>
                    <select value={editHeight} onChange={(e) => setEditHeight(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                      <option value="">Select height</option>
                      <option value="5'0">5'0"</option>
                      <option value="5'2">5'2"</option>
                      <option value="5'4">5'4"</option>
                      <option value="5'6">5'6"</option>
                      <option value="5'8">5'8"</option>
                      <option value="5'10">5'10"</option>
                      <option value="6'0">6'0"</option>
                      <option value="6'2">6'2"</option>
                      <option value="6'4">6'4"</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Body Type</label>
                    <select value={editBodyType} onChange={(e) => setEditBodyType(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                      <option value="">Select body type</option>
                      <option value="Slim">Slim</option>
                      <option value="Athletic">Athletic</option>
                      <option value="Average">Average</option>
                      <option value="Curvy">Curvy</option>
                      <option value="Muscular">Muscular</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Ethnicity</label>
                    <select value={editEthnicity} onChange={(e) => setEditEthnicity(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                      <option value="">Select ethnicity</option>
                      <option value="Hispanic">Hispanic</option>
                      <option value="Black">Black</option>
                      <option value="White">White</option>
                      <option value="Asian">Asian</option>
                      <option value="Middle Eastern">Middle Eastern</option>
                      <option value="Indian">Indian</option>
                      <option value="Mixed">Mixed</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Religion</label>
                    <select value={editReligion} onChange={(e) => setEditReligion(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                      <option value="">Select religion</option>
                      <option value="Christian">Christian</option>
                      <option value="Muslim">Muslim</option>
                      <option value="Jewish">Jewish</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Buddhist">Buddhist</option>
                      <option value="Atheist">Atheist</option>
                      <option value="Agnostic">Agnostic</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Education</label>
                  <select value={editEducation} onChange={(e) => setEditEducation(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                    <option value="">Select education level</option>
                    <option value="High School">High School</option>
                    <option value="Bachelor's Degree">Bachelor's Degree</option>
                    <option value="Master's Degree">Master's Degree</option>
                    <option value="PhD">PhD</option>
                    <option value="Trade School">Trade School</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Occupation</label>
                  <input type="text" value={editJob} onChange={(e) => setEditJob(e.target.value)} placeholder="Your job/profession" className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                >
                  Save Basic Info
                </button>
              </div>
            )}

            {/* Preferences Section */}
            {activeSection === 'preferences' && (
              <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border-2 border-red-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Relationship Preferences</h3>
                  <button onClick={() => setActiveSection(null)} className="text-gray-400 hover:text-gray-600">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Looking For</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Dating', 'Relationship', 'Marriage', 'Friends', 'Networking'].map((goal) => (
                      <button
                        key={goal}
                        onClick={() => {
                          if (editLookingFor.includes(goal)) {
                            setEditLookingFor(editLookingFor.filter(g => g !== goal));
                          } else {
                            setEditLookingFor([...editLookingFor, goal]);
                          }
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          editLookingFor.includes(goal)
                            ? 'bg-red-500 text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:border-red-500'
                        }`}
                      >
                        {goal}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Relationship Goal</label>
                  <select value={editRelationshipGoal} onChange={(e) => setEditRelationshipGoal(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                    <option value="">Select relationship goal</option>
                    <option value="Not Sure">Not Sure</option>
                    <option value="Casual">Casual</option>
                    <option value="Serious">Serious Relationship</option>
                    <option value="Long-term">Long-term Partner</option>
                    <option value="Married">Already Married</option>
                  </select>
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                >
                  Save Preferences
                </button>
              </div>
            )}

            {/* Lifestyle Section */}
            {activeSection === 'lifestyle' && (
              <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border-2 border-red-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Lifestyle</h3>
                  <button onClick={() => setActiveSection(null)} className="text-gray-400 hover:text-gray-600">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Smoking</label>
                    <select value={editSmoking} onChange={(e) => setEditSmoking(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                      <option value="Never">Never</option>
                      <option value="Socially">Socially</option>
                      <option value="Regularly">Regularly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Drinking</label>
                    <select value={editDrinking} onChange={(e) => setEditDrinking(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                      <option value="Never">Never</option>
                      <option value="Socially">Socially</option>
                      <option value="Regularly">Regularly</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Drugs</label>
                    <select value={editDrugs} onChange={(e) => setEditDrugs(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                      <option value="Never">Never</option>
                      <option value="Sometimes">Sometimes</option>
                      <option value="Regularly">Regularly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Pets</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Dogs', 'Cats', 'Birds', 'Reptiles', 'Fish', 'None'].map((pet) => (
                      <button
                        key={pet}
                        onClick={() => {
                          if (editPets.includes(pet)) {
                            setEditPets(editPets.filter(p => p !== pet));
                          } else {
                            setEditPets([...editPets, pet]);
                          }
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          editPets.includes(pet)
                            ? 'bg-red-500 text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:border-red-500'
                        }`}
                      >
                        {pet}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Languages</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['English', 'Spanish', 'French', 'German', 'Mandarin', 'Other'].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          if (editLanguages.includes(lang)) {
                            setEditLanguages(editLanguages.filter(l => l !== lang));
                          } else {
                            setEditLanguages([...editLanguages, lang]);
                          }
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          editLanguages.includes(lang)
                            ? 'bg-red-500 text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:border-red-500'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Travel Frequency</label>
                  <select value={editTravelLust} onChange={(e) => setEditTravelLust(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                    <option value="">Select travel frequency</option>
                    <option value="Never">Never</option>
                    <option value="Rarely">Rarely</option>
                    <option value="Sometimes">Sometimes</option>
                    <option value="Often">Often</option>
                    <option value="Very Often">Very Often</option>
                  </select>
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                >
                  Save Lifestyle
                </button>
              </div>
            )}

            {/* Passions & Interests Section */}
            {activeSection === 'passions' && (
              <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border-2 border-red-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Passions & Interests</h3>
                  <button onClick={() => setActiveSection(null)} className="text-gray-400 hover:text-gray-600">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Music Taste</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Pop', 'Rock', 'Hip-Hop', 'Jazz', 'Classical', 'Electronic', 'Country', 'R&B'].map((music) => (
                      <button
                        key={music}
                        onClick={() => {
                          if (editMusicTaste.includes(music)) {
                            setEditMusicTaste(editMusicTaste.filter(m => m !== music));
                          } else {
                            setEditMusicTaste([...editMusicTaste, music]);
                          }
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          editMusicTaste.includes(music)
                            ? 'bg-red-500 text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:border-red-500'
                        }`}
                      >
                        {music}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Interests & Hobbies</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Travel', 'Fitness', 'Art', 'Reading', 'Gaming', 'Sports', 'Cooking', 'Photography', 'Adventure', 'Movies', 'Fashion', 'Volunteering'].map((interest) => (
                      <button
                        key={interest}
                        onClick={() => {
                          if (editInterests.includes(interest)) {
                            setEditInterests(editInterests.filter(i => i !== interest));
                          } else {
                            setEditInterests([...editInterests, interest]);
                          }
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          editInterests.includes(interest)
                            ? 'bg-red-500 text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:border-red-500'
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                >
                  Save Passions
                </button>
              </div>
            )}

            {/* Edit Bio Section */}
            {activeSection === 'edit' && (
              <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border-2 border-red-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Edit Profile</h3>
                  <button onClick={() => setActiveSection(null)} className="text-gray-400 hover:text-gray-600">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Bio</label>
                  <textarea 
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    maxLength={500}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">{editBio.length}/500 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Interests</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Travel', 'Fitness', 'Music', 'Art', 'Food', 'Gaming', 'Reading', 'Sports'].map((interest) => (
                      <button
                        key={interest}
                        onClick={() => {
                          if (editInterests.includes(interest)) {
                            setEditInterests(editInterests.filter(i => i !== interest));
                          } else {
                            setEditInterests([...editInterests, interest]);
                          }
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          editInterests.includes(interest)
                            ? 'bg-red-500 text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:border-red-500'
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border-2 border-red-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
                  <button onClick={() => setActiveSection(null)} className="text-gray-400 hover:text-gray-600">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                {Object.entries(notificationSettings).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                    <div className="flex items-center gap-3">
                      <i className={`fa-solid ${
                        key === 'likes' ? 'fa-heart' :
                        key === 'matches' ? 'fa-fire' :
                        key === 'messages' ? 'fa-message' :
                        'fa-gift'
                      } text-red-500 w-5 text-center`}></i>
                      <span className="font-semibold text-gray-700 capitalize">{key}</span>
                    </div>
                    <button
                      onClick={() => handleNotificationChange(key)}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        value ? 'bg-red-500' : 'bg-gray-300'
                      } flex items-center p-1`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => setActiveSection(null)}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors mt-6"
                >
                  Done
                </button>
              </div>
            )}

            {/* Purchase History Section */}
            {activeSection === 'history' && (
              <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border-2 border-red-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Purchase History</h3>
                  <button onClick={() => setActiveSection(null)} className="text-gray-400 hover:text-gray-600">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                {purchaseHistory.length > 0 ? (
                  <div className="space-y-3">
                    {purchaseHistory.map((purchase) => (
                      <div key={purchase.id} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-red-300 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                              <i className="fa-solid fa-coins text-amber-600"></i>
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{purchase.amount} Spark Coins</p>
                              <p className="text-xs text-gray-500">{purchase.method}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-gray-900">{purchase.price}</p>
                            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 inline-block">
                              {purchase.status === 'completed' ? '✓ Completed' : purchase.status === 'pending' ? 'Pending' : 'Failed'}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">{new Date(purchase.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <i className="fa-solid fa-receipt text-4xl text-gray-300 mb-4"></i>
                    <p className="text-gray-500 font-semibold">No purchases yet</p>
                    <p className="text-xs text-gray-400">Start buying coins to see your purchase history</p>
                  </div>
                )}

                <button
                  onClick={() => setActiveSection(null)}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors mt-6"
                >
                  Done
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Show default menu when no section is active */}
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
          <button onClick={() => setActiveSection(activeSection === 'photos' ? null : 'photos')} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 active:bg-gray-100 transition-colors">
            <div className="flex items-center gap-4 text-gray-700">
              <i className="fa-solid fa-images text-sm text-gray-400 w-5 text-center"></i>
              <span className="text-sm font-semibold">Manage Photos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">{uploadedImages.length}/9</span>
              <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
            </div>
          </button>

          {/* Verification Button */}
          <button onClick={() => setShowVerificationModal(true)} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-50 rounded-2xl hover:from-blue-100 hover:to-blue-100 active:from-blue-100 active:to-blue-100 transition-colors border border-blue-200">
            <div className="flex items-center gap-4 text-blue-700">
              <i className="fa-solid fa-shield-check text-sm text-blue-500 w-5 text-center"></i>
              <div className="text-left">
                <span className="text-sm font-semibold block">ID Verification</span>
                <span className="text-xs text-blue-600 font-bold">
                  {user.verification.status === VerificationStatus.VERIFIED ? '✓ Verified' : user.verification.status === VerificationStatus.PENDING ? 'Pending Review' : 'Start verification'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user.verification.status === VerificationStatus.VERIFIED && (
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">
                  <i className="fa-solid fa-check"></i>
                </div>
              )}
              <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
            </div>
          </button>

          <button onClick={() => setActiveSection(activeSection === 'basic' ? null : 'basic')} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 active:bg-gray-100 transition-colors">
            <div className="flex items-center gap-4 text-gray-700">
              <i className="fa-solid fa-id-card text-sm text-gray-400 w-5 text-center"></i>
              <span className="text-sm font-semibold">Basic Info</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>
          <button onClick={() => setActiveSection(activeSection === 'preferences' ? null : 'preferences')} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 active:bg-gray-100 transition-colors">
            <div className="flex items-center gap-4 text-gray-700">
              <i className="fa-solid fa-heart-pulse text-sm text-gray-400 w-5 text-center"></i>
              <span className="text-sm font-semibold">Preferences</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>
          <button onClick={() => setActiveSection(activeSection === 'lifestyle' ? null : 'lifestyle')} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 active:bg-gray-100 transition-colors">
            <div className="flex items-center gap-4 text-gray-700">
              <i className="fa-solid fa-person-hiking text-sm text-gray-400 w-5 text-center"></i>
              <span className="text-sm font-semibold">Lifestyle</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>
          <button onClick={() => setActiveSection(activeSection === 'passions' ? null : 'passions')} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 active:bg-gray-100 transition-colors">
            <div className="flex items-center gap-4 text-gray-700">
              <i className="fa-solid fa-sparkles text-sm text-gray-400 w-5 text-center"></i>
              <span className="text-sm font-semibold">Passions & Interests</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>
          <button onClick={() => setActiveSection(activeSection === 'edit' ? null : 'edit')} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 active:bg-gray-100 transition-colors">
            <div className="flex items-center gap-4 text-gray-700">
              <i className="fa-solid fa-user-pen text-sm text-gray-400 w-5 text-center"></i>
              <span className="text-sm font-semibold">Edit Bio</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>
          <button onClick={() => setActiveSection(activeSection === 'notifications' ? null : 'notifications')} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 active:bg-gray-100 transition-colors">
            <div className="flex items-center gap-4 text-gray-700">
              <i className="fa-solid fa-bell text-sm text-gray-400 w-5 text-center"></i>
              <span className="text-sm font-semibold">Notifications</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>
          <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 active:bg-gray-100 transition-colors">
            <div className="flex items-center gap-4 text-gray-700">
              <i className="fa-solid fa-lock text-sm text-gray-400 w-5 text-center"></i>
              <span className="text-sm font-semibold">Privacy & Safety</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>
          <button onClick={() => setActiveSection(activeSection === 'history' ? null : 'history')} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 active:bg-gray-100 transition-colors">
            <div className="flex items-center gap-4 text-gray-700">
              <i className="fa-solid fa-credit-card text-sm text-gray-400 w-5 text-center"></i>
              <span className="text-sm font-semibold">Purchase History</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>
          <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 active:bg-gray-100 transition-colors">
            <div className="flex items-center gap-4 text-gray-700">
              <i className="fa-solid fa-circle-question text-sm text-gray-400 w-5 text-center"></i>
              <span className="text-sm font-semibold">Help Center</span>
            </div>
            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
          </button>
        </div>

        {/* Purchase History Section */}
        {activeSection === 'history' && (
          <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border-2 border-red-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Purchase History</h3>
              <button onClick={() => setActiveSection(null)} className="text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {purchaseHistory.length > 0 ? (
              <div className="space-y-3">
                {purchaseHistory.map((purchase) => (
                  <div key={purchase.id} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-red-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                          <i className="fa-solid fa-coins text-amber-600"></i>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{purchase.amount} Spark Coins</p>
                          <p className="text-xs text-gray-500">{purchase.method}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-gray-900">{purchase.price}</p>
                        <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 inline-block">
                          {purchase.status === 'completed' ? '✓ Completed' : purchase.status === 'pending' ? 'Pending' : 'Failed'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">{new Date(purchase.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <i className="fa-solid fa-receipt text-4xl text-gray-300 mb-4"></i>
                <p className="text-gray-500 font-semibold">No purchases yet</p>
                <p className="text-xs text-gray-400">Start buying coins to see your purchase history</p>
              </div>
            )}

            <button
              onClick={() => setActiveSection(null)}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors mt-6"
            >
              Done
            </button>
          </div>
        )}

        {/* Photos Section */}
        {activeSection === 'photos' && (
          <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border-2 border-red-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Manage Photos</h3>
              <button onClick={() => setActiveSection(null)} className="text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <p className="text-sm text-gray-600">Add up to 9 photos. Your first photo will be your profile picture.</p>

            {/* Upload Area */}
            <label className="block border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-red-500 hover:bg-red-50/50 transition-colors">
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="hidden"
              />
              <div className="space-y-2">
                <i className="fa-solid fa-camera text-4xl text-gray-400 block"></i>
                <p className="font-bold text-gray-700">Click to upload photos</p>
                <p className="text-xs text-gray-500">or drag and drop</p>
              </div>
            </label>

            {/* Photo Grid */}
            {uploadedImages.length > 0 && (
              <div className="space-y-4">
                <p className="text-sm font-bold text-gray-700">Your Photos ({uploadedImages.length}/9)</p>
                <div className="grid grid-cols-3 gap-3">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img src={image} alt={`Photo ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                      {index === 0 && (
                        <div className="absolute top-1 left-1 bg-red-500 text-white text-[8px] px-2 py-1 rounded-full font-bold">
                          MAIN
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-lg transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        {index > 0 && (
                          <button
                            onClick={() => moveImageUp(index)}
                            className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-900 hover:bg-red-500 hover:text-white transition-colors"
                            title="Move up"
                          >
                            <i className="fa-solid fa-arrow-up text-xs"></i>
                          </button>
                        )}
                        <button
                          onClick={() => removeImage(index)}
                          className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-900 hover:bg-red-500 hover:text-white transition-colors"
                          title="Delete"
                        >
                          <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleSaveProfile}
              className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
            >
              Save Photos
            </button>
          </div>
        )}

        {/* Basic Info Section */}
        {activeSection === 'basic' && (
          <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border-2 border-red-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Basic Information</h3>
              <button onClick={() => setActiveSection(null)} className="text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Height</label>
                <select value={editHeight} onChange={(e) => setEditHeight(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Select height</option>
                  <option value="5'0">5'0"</option>
                  <option value="5'2">5'2"</option>
                  <option value="5'4">5'4"</option>
                  <option value="5'6">5'6"</option>
                  <option value="5'8">5'8"</option>
                  <option value="5'10">5'10"</option>
                  <option value="6'0">6'0"</option>
                  <option value="6'2">6'2"</option>
                  <option value="6'4">6'4"</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Body Type</label>
                <select value={editBodyType} onChange={(e) => setEditBodyType(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Select body type</option>
                  <option value="Slim">Slim</option>
                  <option value="Athletic">Athletic</option>
                  <option value="Average">Average</option>
                  <option value="Curvy">Curvy</option>
                  <option value="Muscular">Muscular</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Ethnicity</label>
                <select value={editEthnicity} onChange={(e) => setEditEthnicity(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Select ethnicity</option>
                  <option value="Hispanic">Hispanic</option>
                  <option value="Black">Black</option>
                  <option value="White">White</option>
                  <option value="Asian">Asian</option>
                  <option value="Middle Eastern">Middle Eastern</option>
                  <option value="Indian">Indian</option>
                  <option value="Mixed">Mixed</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Religion</label>
                <select value={editReligion} onChange={(e) => setEditReligion(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Select religion</option>
                  <option value="Christian">Christian</option>
                  <option value="Muslim">Muslim</option>
                  <option value="Jewish">Jewish</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddhist">Buddhist</option>
                  <option value="Atheist">Atheist</option>
                  <option value="Agnostic">Agnostic</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Education</label>
              <select value={editEducation} onChange={(e) => setEditEducation(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="">Select education level</option>
                <option value="High School">High School</option>
                <option value="Bachelor's Degree">Bachelor's Degree</option>
                <option value="Master's Degree">Master's Degree</option>
                <option value="PhD">PhD</option>
                <option value="Trade School">Trade School</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Occupation</label>
              <input type="text" value={editJob} onChange={(e) => setEditJob(e.target.value)} placeholder="Your job/profession" className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>

            <button
              onClick={handleSaveProfile}
              className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
            >
              Save Basic Info
            </button>
          </div>
        )}

        {/* Preferences Section */}
        {activeSection === 'preferences' && (
          <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border-2 border-red-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Relationship Preferences</h3>
              <button onClick={() => setActiveSection(null)} className="text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Looking For</label>
              <div className="grid grid-cols-2 gap-2">
                {['Dating', 'Relationship', 'Marriage', 'Friends', 'Networking'].map((goal) => (
                  <button
                    key={goal}
                    onClick={() => {
                      if (editLookingFor.includes(goal)) {
                        setEditLookingFor(editLookingFor.filter(g => g !== goal));
                      } else {
                        setEditLookingFor([...editLookingFor, goal]);
                      }
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      editLookingFor.includes(goal)
                        ? 'bg-red-500 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-red-500'
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Relationship Goal</label>
              <select value={editRelationshipGoal} onChange={(e) => setEditRelationshipGoal(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="">Select relationship goal</option>
                <option value="Not Sure">Not Sure</option>
                <option value="Casual">Casual</option>
                <option value="Serious">Serious Relationship</option>
                <option value="Long-term">Long-term Partner</option>
                <option value="Married">Already Married</option>
              </select>
            </div>

            <button
              onClick={handleSaveProfile}
              className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
            >
              Save Preferences
            </button>
          </div>
        )}

        {/* Lifestyle Section */}
        {activeSection === 'lifestyle' && (
          <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border-2 border-red-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Lifestyle</h3>
              <button onClick={() => setActiveSection(null)} className="text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Smoking</label>
                <select value={editSmoking} onChange={(e) => setEditSmoking(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="Never">Never</option>
                  <option value="Socially">Socially</option>
                  <option value="Regularly">Regularly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Drinking</label>
                <select value={editDrinking} onChange={(e) => setEditDrinking(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="Never">Never</option>
                  <option value="Socially">Socially</option>
                  <option value="Regularly">Regularly</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">Drugs</label>
                <select value={editDrugs} onChange={(e) => setEditDrugs(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="Never">Never</option>
                  <option value="Sometimes">Sometimes</option>
                  <option value="Regularly">Regularly</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Pets</label>
              <div className="grid grid-cols-2 gap-2">
                {['Dogs', 'Cats', 'Birds', 'Reptiles', 'Fish', 'None'].map((pet) => (
                  <button
                    key={pet}
                    onClick={() => {
                      if (editPets.includes(pet)) {
                        setEditPets(editPets.filter(p => p !== pet));
                      } else {
                        setEditPets([...editPets, pet]);
                      }
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      editPets.includes(pet)
                        ? 'bg-red-500 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-red-500'
                    }`}
                  >
                    {pet}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Languages</label>
              <div className="grid grid-cols-2 gap-2">
                {['English', 'Spanish', 'French', 'German', 'Mandarin', 'Other'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      if (editLanguages.includes(lang)) {
                        setEditLanguages(editLanguages.filter(l => l !== lang));
                      } else {
                        setEditLanguages([...editLanguages, lang]);
                      }
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      editLanguages.includes(lang)
                        ? 'bg-red-500 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-red-500'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Travel Frequency</label>
              <select value={editTravelLust} onChange={(e) => setEditTravelLust(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="">Select travel frequency</option>
                <option value="Never">Never</option>
                <option value="Rarely">Rarely</option>
                <option value="Sometimes">Sometimes</option>
                <option value="Often">Often</option>
                <option value="Very Often">Very Often</option>
              </select>
            </div>

            <button
              onClick={handleSaveProfile}
              className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
            >
              Save Lifestyle
            </button>
          </div>
        )}

        {/* Passions & Interests Section */}
        {activeSection === 'passions' && (
          <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border-2 border-red-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Passions & Interests</h3>
              <button onClick={() => setActiveSection(null)} className="text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Music Taste</label>
              <div className="grid grid-cols-2 gap-2">
                {['Pop', 'Rock', 'Hip-Hop', 'Jazz', 'Classical', 'Electronic', 'Country', 'R&B'].map((music) => (
                  <button
                    key={music}
                    onClick={() => {
                      if (editMusicTaste.includes(music)) {
                        setEditMusicTaste(editMusicTaste.filter(m => m !== music));
                      } else {
                        setEditMusicTaste([...editMusicTaste, music]);
                      }
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      editMusicTaste.includes(music)
                        ? 'bg-red-500 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-red-500'
                    }`}
                  >
                    {music}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Interests & Hobbies</label>
              <div className="grid grid-cols-2 gap-2">
                {['Travel', 'Fitness', 'Art', 'Reading', 'Gaming', 'Sports', 'Cooking', 'Photography', 'Adventure', 'Movies', 'Fashion', 'Volunteering'].map((interest) => (
                  <button
                    key={interest}
                    onClick={() => {
                      if (editInterests.includes(interest)) {
                        setEditInterests(editInterests.filter(i => i !== interest));
                      } else {
                        setEditInterests([...editInterests, interest]);
                      }
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      editInterests.includes(interest)
                        ? 'bg-red-500 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-red-500'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
            >
              Save Passions
            </button>
          </div>
        )}

        {/* Edit Profile Section */}
        {activeSection === 'edit' && (
          <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border-2 border-red-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit Profile</h3>
              <button onClick={() => setActiveSection(null)} className="text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Bio</label>
              <textarea 
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={500}
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">{editBio.length}/500 characters</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Interests</label>
              <div className="grid grid-cols-2 gap-2">
                {['Travel', 'Fitness', 'Music', 'Art', 'Food', 'Gaming', 'Reading', 'Sports'].map((interest) => (
                  <button
                    key={interest}
                    onClick={() => {
                      if (editInterests.includes(interest)) {
                        setEditInterests(editInterests.filter(i => i !== interest));
                      } else {
                        setEditInterests([...editInterests, interest]);
                      }
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      editInterests.includes(interest)
                        ? 'bg-red-500 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-red-500'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
            >
              Save Changes
            </button>
          </div>
        )}

        {/* Notifications Section */}
        {activeSection === 'notifications' && (
          <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border-2 border-red-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
              <button onClick={() => setActiveSection(null)} className="text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {Object.entries(notificationSettings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <i className={`fa-solid ${
                    key === 'likes' ? 'fa-heart' :
                    key === 'matches' ? 'fa-fire' :
                    key === 'messages' ? 'fa-message' :
                    'fa-gift'
                  } text-red-500 w-5 text-center`}></i>
                  <span className="font-semibold text-gray-700 capitalize">{key}</span>
                </div>
                <button
                  onClick={() => handleNotificationChange(key)}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    value ? 'bg-red-500' : 'bg-gray-300'
                  } flex items-center p-1`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
              </div>
            ))}

            <button
              onClick={() => setActiveSection(null)}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors mt-6"
            >
              Done
            </button>
          </div>
        )}

        {activeSection && <div className="h-4"></div>}
        {!activeSection && <button className="w-full py-4 text-red-500 font-bold text-sm border-2 border-red-50 border-dashed rounded-2xl hover:bg-red-50 active:bg-red-50 transition-colors mt-8">
              Sign Out
            </button>}
          </>
        )}
      </div>

      {/* Verification Modal */}
      <VerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        verification={user.verification}
        onSubmit={(verification) => {
          setUser(prev => ({
            ...prev,
            verification
          }));
          setShowVerificationModal(false);
        }}
      />
    </div>
  );
};

export default ProfileSettings;
