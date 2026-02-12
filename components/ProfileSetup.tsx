import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../services/apiClient';

interface ProfileSetupProps {
  userId: string;
  name: string;
  email: string;
  profilePicture?: string;
  onComplete: (userData: any) => void;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ userId, name, email, profilePicture, onComplete }) => {
  const navigate = useNavigate();
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [interests, setInterests] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState(profilePicture || '');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!age || !bio || !location) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      if (selectedInterests.length === 0) {
        setError('Please select at least one interest');
        setLoading(false);
        return;
      }

      // Update user profile in MongoDB
      const updatedUser = await apiClient.updateProfile(userId, {
        name,
        age: parseInt(age),
        bio,
        location,
        interests: selectedInterests,
        images: imageUrl ? [imageUrl] : [],
        profilePicture: imageUrl || profilePicture
      });

      onComplete(updatedUser);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">Help us find your perfect match</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture */}
          <div className="bg-gray-50 rounded-2xl p-6">
            <label className="block text-sm font-bold text-gray-900 mb-3">Profile Photo URL</label>
            <div className="flex gap-4 items-start">
              {(imageUrl || profilePicture) && (
                <img
                  src={imageUrl || profilePicture}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-red-200"
                />
              )}
              <input
                type="url"
                placeholder="Paste your profile photo URL here"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Use Unsplash (images.unsplash.com) or upload your own</p>
          </div>

          {/* Name (readonly) */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Name</label>
            <input
              type="text"
              value={name}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          {/* Age & Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Age *</label>
              <input
                type="number"
                min="18"
                max="100"
                placeholder="Age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Location *</label>
              <input
                type="text"
                placeholder="City, Country"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Bio *</label>
            <textarea
              placeholder="Tell us about yourself. What makes you unique?"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{bio.length}/500 characters</p>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3">Interests (Select at least 1) *</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {interestsList.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`px-4 py-2 rounded-full font-medium transition ${
                    selectedInterests.includes(interest)
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition text-lg"
          >
            {loading ? 'Saving Profile...' : 'Complete Profile & Start Swiping'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          Your profile is stored securely and used to match you with compatible people.
        </p>
      </div>
    </div>
  );
};

export default ProfileSetup;
