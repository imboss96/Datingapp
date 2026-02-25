/**
 * Custom hook for managing user location
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Coordinates } from '../types';
import {
  getCurrentLocation,
  watchLocationChanges,
  stopWatchingLocation,
  getLocationName,
  LocationResult,
} from '../services/locationService';
import apiClient from '../services/apiClient';

interface UseLocationOptions {
  autoCapture?: boolean; // Auto-capture on mount
  watchChanges?: boolean; // Watch for location changes
  distanceThreshold?: number; // Distance threshold in meters for updates
}

export const useLocation = (options: UseLocationOptions = {}) => {
  const {
    autoCapture = false,
    watchChanges = false,
    distanceThreshold = 500,
  } = options;

  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const watcherIdRef = useRef<number | null>(null);

  /**
   * Capture current location
   */
  const captureLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[useLocation] Capturing current location...');

      const result = await getCurrentLocation();
      setCoordinates(result.coordinates);
      setAccuracy(result.accuracy);

      // Get location name
      try {
        const name = await getLocationName(result.coordinates);
        setLocationName(name);
        console.log('[useLocation] Location name:', name);
      } catch (err) {
        console.warn('[useLocation] Could not get location name:', err);
      }

      return result.coordinates;
    } catch (err: any) {
      const message = err.message || 'Failed to get location';
      setError(message);
      console.error('[useLocation] Capture error:', message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Start watching location changes
   */
  const startWatching = useCallback(() => {
    if (watcherIdRef.current !== null) return; // Already watching

    console.log('[useLocation] Starting location watch with', distanceThreshold, 'm threshold');

    watcherIdRef.current = watchLocationChanges(
      async (location) => {
        setCoordinates(location.coordinates);
        setAccuracy(location.accuracy);

        // Get location name
        try {
          const name = await getLocationName(location.coordinates);
          setLocationName(name);
        } catch (err) {
          console.warn('[useLocation] Could not get location name:', err);
        }

        // Update profile with new location
        try {
          console.log('[useLocation] Updating profile with new location:', {
            coordinates: location.coordinates,
            locationName: locationName,
          });
          await apiClient.updateUserProfile({
            coordinates: location.coordinates,
            location: locationName || 'Updated Location',
          });
        } catch (err) {
          console.error('[useLocation] Failed to update profile location:', err);
        }
      },
      distanceThreshold
    );
  }, [distanceThreshold, locationName]);

  /**
   * Stop watching location changes
   */
  const stopWatching = useCallback(() => {
    if (watcherIdRef.current !== null) {
      console.log('[useLocation] Stopping location watch');
      stopWatchingLocation(watcherIdRef.current);
      watcherIdRef.current = null;
    }
  }, []);

  // Auto-capture on mount if enabled
  useEffect(() => {
    if (autoCapture) {
      captureLocation();
    }
  }, [autoCapture, captureLocation]);

  // Auto-watch location changes if enabled
  useEffect(() => {
    if (watchChanges) {
      startWatching();
      return () => {
        stopWatching();
      };
    }
  }, [watchChanges, startWatching, stopWatching]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watcherIdRef.current !== null) {
        stopWatchingLocation(watcherIdRef.current);
      }
    };
  }, []);

  return {
    coordinates,
    locationName,
    loading,
    error,
    accuracy,
    captureLocation,
    startWatching,
    stopWatching,
    isWatching: watcherIdRef.current !== null,
  };
};
