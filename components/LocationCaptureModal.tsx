/**
 * Location Capture Modal
 * Prompts user to share their location during signup
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from '../hooks/useLocation';

interface LocationCaptureModalProps {
  isOpen: boolean;
  onComplete: (coordinates: any, locationName: string) => void;
  onSkip?: () => void;
}

const LocationCaptureModal: React.FC<LocationCaptureModalProps> = ({
  isOpen,
  onComplete,
  onSkip,
}) => {
  const { coordinates, locationName, loading, error, captureLocation } = useLocation();
  const [attempted, setAttempted] = useState(false);

  if (!isOpen) return null;

  const handleCaptureClick = async () => {
    setAttempted(true);
    const result = await captureLocation();
    if (result) {
      // Wait a moment for location name to be fetched
      setTimeout(() => {
        onComplete(result, locationName || 'Current Location');
      }, 500);
    }
  };

  const handleSkip = () => {
    onSkip?.();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">📍</div>
          <h2 className="text-2xl font-bold text-gray-800">Share Your Location</h2>
          <p className="text-gray-600 mt-2 text-sm">
            Help us show you people nearby for better matches
          </p>
        </div>

        {/* Status Display */}
        {!attempted && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Why location?</span>
              <br />
              We'll show you profiles of people in your area and nearby so you can meet someone
              special close by.
            </p>
          </div>
        )}

        {error && attempted && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-red-800">
              <span className="font-semibold">Location Error:</span>
              <br />
              {error}
            </p>
            <p className="text-xs text-red-700 mt-2">
              Please check your browser location settings and try again.
            </p>
          </div>
        )}

        {coordinates && locationName && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-green-800">
              <span className="font-semibold">✓ Location Found!</span>
              <br />
              <span className="block mt-1 text-green-700">{locationName}</span>
              <span className="text-xs text-green-600 mt-1 block">
                {coordinates.latitude.toFixed(4)}°, {coordinates.longitude.toFixed(4)}°
              </span>
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 border-4 border-red-200 border-t-red-500 rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-gray-600">Getting your location...</p>
            <p className="text-xs text-gray-500 mt-2">This may take a few seconds</p>
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-3 mt-6">
          {!coordinates && (
            <button
              onClick={handleCaptureClick}
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                  Capturing Location...
                </span>
              ) : (
                `${attempted ? 'Try Again' : 'Capture Location'}`
              )}
            </button>
          )}

          {coordinates && (
            <button
              onClick={() => onComplete(coordinates, locationName)}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200"
            >
              Continue with {locationName}
            </button>
          )}

          <button
            onClick={handleSkip}
            disabled={loading}
            className="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
          >
            {coordinates ? 'Use Different Location' : 'Skip For Now'}
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            We respect your privacy. Your location is secure and only visible to people you match with.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationCaptureModal;
