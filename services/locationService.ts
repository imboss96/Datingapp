/**
 * Location Service
 * Handles geolocation capture, tracking, and updates
 */

import { Coordinates } from '../types';

export interface LocationResult {
  coordinates: Coordinates;
  accuracy: number;
  timestamp: number;
}

/**
 * Get user's current location using Geolocation API
 */
export const getCurrentLocation = (): Promise<LocationResult> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        resolve({
          coordinates: { latitude, longitude },
          accuracy,
          timestamp: Date.now(),
        });
      },
      (error) => {
        console.error('[LocationService] Geolocation error:', error);
        reject(new Error(`Failed to get location: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Watch user's location and call callback when location changes significantly
 * @param callback Function to call with new location
 * @param distanceThresholdMeters Minimum distance (in meters) to trigger update (default: 500m)
 * @returns Watcher ID to stop watching later
 */
export const watchLocationChanges = (
  callback: (location: LocationResult) => void,
  distanceThresholdMeters: number = 500
): number | null => {
  if (!navigator.geolocation) {
    console.warn('[LocationService] Geolocation not supported');
    return null;
  }

  let lastLocation: LocationResult | null = null;

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      const newLocation: LocationResult = {
        coordinates: { latitude, longitude },
        accuracy,
        timestamp: Date.now(),
      };

      // Check if location has changed significantly
      if (lastLocation === null) {
        // First location capture
        lastLocation = newLocation;
        callback(newLocation);
      } else {
        const distance = calculateHaversineDistance(
          lastLocation.coordinates,
          newLocation.coordinates
        );

        // If user has moved more than threshold, update
        if (distance * 1000 > distanceThresholdMeters) {
          console.log(
            `[LocationService] Location changed by ${(distance * 1000).toFixed(0)}m, updating...`
          );
          lastLocation = newLocation;
          callback(newLocation);
        }
      }
    },
    (error) => {
      console.error('[LocationService] Watch error:', error);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000, // Cache position for 5 seconds
    }
  );

  return watchId;
};

/**
 * Stop watching location changes
 */
export const stopWatchingLocation = (watchId: number): void => {
  if (navigator.geolocation && watchId) {
    navigator.geolocation.clearWatch(watchId);
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
const calculateHaversineDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLng = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.latitude * Math.PI) / 180) *
      Math.cos((coord2.latitude * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Request location permission from user
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    if (!navigator.permissions) {
      console.warn('[LocationService] Permissions API not supported');
      return true; // Assume user will allow when prompted
    }

    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state !== 'denied';
  } catch (error) {
    console.warn('[LocationService] Could not check permission:', error);
    return true;
  }
};

/**
 * Get user's city/area name from coordinates using reverse geocoding
 * (Note: Requires backend implementation or third-party service)
 */
export const getLocationName = async (coordinates: Coordinates): Promise<string> => {
  try {
    // Using OpenStreetMap Nominatim (free reverse geocoding)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.latitude}&lon=${coordinates.longitude}&zoom=10&addressdetails=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'DatingApp', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }

    const data = await response.json();
    // Try to get city, if not available use county or state
    return (
      data.address?.city ||
      data.address?.county ||
      data.address?.state ||
      data.address?.country ||
      'Unknown Location'
    );
  } catch (error) {
    console.warn('[LocationService] Reverse geocoding error:', error);
    return 'Unknown Location';
  }
};

/**
 * Format location coordinates as readable string
 */
export const formatCoordinates = (coordinates: Coordinates): string => {
  return `${coordinates.latitude.toFixed(4)}°, ${coordinates.longitude.toFixed(4)}°`;
};
