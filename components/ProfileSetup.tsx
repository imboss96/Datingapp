import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../services/apiClient';

interface ProfileSetupProps {
  userId: string;
  name: string;
  email: string;
  profilePicture?: string;
  onComplete: (userData: any) => void;
  onCancel?: () => void;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ userId, name, email, profilePicture, onComplete, onCancel }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [interests, setInterests] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState(profilePicture || '');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Auto-fill location from GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLatitude(latitude);
          setLongitude(longitude);
          // Optionally, reverse geocode to get city/country
          try {
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            if (response.ok) {
              const data = await response.json();
              const locationString = data.city ? `${data.city}, ${data.countryName}` : data.countryName || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
              setLocation(locationString);
            } else {
              setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
            }
          } catch {
            setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Fallback to IP location
          fetch('https://ipapi.co/json/')
            .then(res => res.json())
            .then(data => {
              const locationString = data.city && data.country_name ? `${data.city}, ${data.country_name}` : data.country_name || 'Unknown';
              setLocation(locationString);
            })
            .catch(() => setLocation(''));
        }
      );
    } else {
      // Fallback to IP
      fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => {
          const locationString = data.city && data.country_name ? `${data.city}, ${data.country_name}` : data.country_name || 'Unknown';
          setLocation(locationString);
        })
        .catch(() => setLocation(''));
    }
  }, []);

  const interestsList = [
    'Travel', 'Fitness', 'Music', 'Art', 'Food', 'Gaming', 'Reading',
    'Sports', 'Cooking', 'Photography', 'Dance', 'Hiking', 'Movies',
    'Yoga', 'Fashion', 'Technology', 'Pets', 'Volunteering'
  ];

  const selectedInterests = interests.split(',').filter(i => i.trim());

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setInterests(selectedInterests.filter(i => i !== interest).join(','));
    } else {
      setInterests([...selectedInterests, interest].join(','));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setUploadedImages((prev) => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!username || !age || !bio || !location) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      if (username.length < 3) {
        setError('Username must be at least 3 characters');
        setLoading(false);
        return;
      }

      if (selectedInterests.length === 0) {
        setError('Please select at least one interest');
        setLoading(false);
        return;
      }

      // Update user profile in MongoDB
      console.log('[DEBUG ProfileSetup] Updating profile with:', { userId, username, name, age: parseInt(age), bio, location, interests: selectedInterests });
      const allImages = [...uploadedImages, imageUrl].filter(img => img);
      const updateData: any = {
        username,
        name,
        age: parseInt(age),
        bio,
        location,
        interests: selectedInterests,
        images: allImages,
        profilePicture: allImages[0] || profilePicture
      };
      if (latitude !== null && longitude !== null) {
        updateData.coordinates = [longitude, latitude]; // GeoJSON: [lng, lat]
      }
      const updatedUser = await apiClient.updateProfile(userId, updateData);
      console.log('[DEBUG ProfileSetup] Profile update response:', updatedUser);

      onComplete(updatedUser);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onCancel}
          className="absolute top-6 right-6 sm:top-8 sm:right-8 text-gray-800 dark:text-gray-200 hover:text-gray-600 dark:hover:text-gray-400 text-2xl font-bold transition-colors"
        >
          ✕
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-2">Complete Your Profile</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Help us find your perfect match</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Pictures */}
          <div className="bg-gradient-to-br from-pink-50 to-red-50 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-5 sm:p-6 border border-pink-100 dark:border-gray-600">
            <div className="flex items-center gap-2 mb-4">
              <i className="fa-solid fa-image text-red-500 text-lg"></i>
              <label className="text-sm font-bold text-gray-900 dark:text-white">Profile Photos</label>
            </div>
            
            {/* Upload File Input */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Upload Photos</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-500 rounded-2xl cursor-pointer hover:border-red-500 dark:hover:border-red-400 transition-colors focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Drop up to 5 photos (JPG, PNG) - First photo will be your profile picture</p>
            </div>

            {/* URL Input */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Or Paste Photo URL</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Use Unsplash (images.unsplash.com) or any image URL</p>
            </div>

            {/* Image Previews */}
            {(uploadedImages.length > 0 || imageUrl) && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Preview ({uploadedImages.length + (imageUrl ? 1 : 0)} photos)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img}
                        alt={`Uploaded ${idx + 1}`}
                        className="w-full h-24 sm:h-28 rounded-xl object-cover border-2 border-red-200 dark:border-red-900 shadow-md"
                      />
                      {idx === 0 && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">PRIMARY</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-lg hover:bg-red-600"
                      >
                        <i className="fa-solid fa-times text-xs"></i>
                      </button>
                    </div>
                  ))}
                  {imageUrl && (
                    <div key="url" className="relative">
                      <img
                        src={imageUrl}
                        alt="Profile URL"
                        className="w-full h-24 sm:h-28 rounded-xl object-cover border-2 border-green-200 dark:border-green-900 shadow-md"
                      />
                      {uploadedImages.length === 0 && (
                        <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">PRIMARY</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Name (readonly) */}
          <div>
            <label className="block text-xs font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-widest">Name</label>
            <input
              type="text"
              value={name}
              disabled
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-500 rounded-2xl bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-widest">Username <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="Choose a unique username (min 3 characters)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
            />
            {username && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {username.length < 3 ? '⚠ Minimum 3 characters' : '✓ Username looks good'}
              </p>
            )}
          </div>

          {/* Age & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-widest">Age <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="18"
                max="100"
                placeholder="Enter your age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-widest">Location <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="City, Country"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-widest">Bio <span className="text-red-500">*</span></label>
            <textarea
              placeholder="Tell us about yourself. What makes you unique? Share your passions, hobbies, and personality!"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none transition-colors"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{bio.length}/500 characters</p>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-xs font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-widest">Interests <span className="text-red-500">*</span> (Select at least 1)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {interestsList.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`px-3 sm:px-4 py-2 rounded-full font-medium text-xs sm:text-sm transition-all transform hover:scale-105 ${
                    selectedInterests.includes(interest)
                      ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
            {selectedInterests.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Selected: {selectedInterests.join(', ')}</p>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-2xl text-sm font-medium flex items-start gap-2">
              <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 rounded-2xl transition-all transform hover:scale-105 disabled:hover:scale-100 text-base sm:text-lg shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fa-solid fa-spinner animate-spin"></i>
                Saving Profile...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <i className="fa-solid fa-check"></i>
                Complete Profile & Start Swiping
              </span>
            )}
          </button>
        </form>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-6">
          🔒 Your profile is stored securely and used to match you with compatible people.
        </p>
      </div>
    </div>
  );
};

export default ProfileSetup;
