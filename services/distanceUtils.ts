/**
 * Distance calculation utilities for location-based filtering
 * Uses Haversine formula to calculate distance between two geographic points
 */

import { Coordinates } from '../types';

/**
 * Calculate distance in kilometers between two coordinates using Haversine formula
 * @param coord1 - First coordinate (user's location)
 * @param coord2 - Second coordinate (other user's location)
 * @returns Distance in kilometers
 */
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const EARTH_RADIUS_KM = 6371; // Earth's radius in kilometers
  
  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;
  const deltaLatRad = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLngRad = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLngRad / 2) *
      Math.sin(deltaLngRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

/**
 * Convert kilometers to miles
 */
export const kmToMiles = (km: number): number => km * 0.621371;

/**
 * Convert miles to kilometers
 */
export const milesToKm = (miles: number): number => miles / 0.621371;

/**
 * Get distance label with both km and miles
 */
export const getDistanceLabel = (distanceKm: number): string => {
  const miles = kmToMiles(distanceKm);
  return `${distanceKm.toFixed(1)} km (${miles.toFixed(1)} mi)`;
};

/**
 * Check if a coordinate is within distance range
 */
export const isWithinDistance = (
  userCoord: Coordinates | undefined,
  otherCoord: Coordinates | undefined,
  maxDistanceKm: number
): boolean => {
  if (!userCoord || !otherCoord) return false;
  const distance = calculateDistance(userCoord, otherCoord);
  return distance <= maxDistanceKm;
};

/**
 * Distance range presets for swipe filtering (in kilometers)
 */
export const DISTANCE_RANGES = {
  ONE_KM: 1,
  FIVE_KM: 5,
  TEN_KM: 10,
  FIFTY_KM: 50,
  HUNDRED_KM: 100,
  FIVE_HUNDRED_KM: 500,
  THOUSAND_KM: 1000,
  WORLDWIDE: 40000, // Approximate max distance on Earth
} as const;

/**
 * Get distance range label
 */
export const getDistanceRangeLabel = (distanceKm: number): string => {
  if (distanceKm >= DISTANCE_RANGES.WORLDWIDE) return 'Worldwide';
  if (distanceKm >= DISTANCE_RANGES.THOUSAND_KM) return 'Up to 1000 km';
  if (distanceKm >= DISTANCE_RANGES.FIVE_HUNDRED_KM) return 'Up to 500 km';
  if (distanceKm >= DISTANCE_RANGES.HUNDRED_KM) return 'Up to 100 km';
  if (distanceKm >= DISTANCE_RANGES.FIFTY_KM) return 'Up to 50 km';
  if (distanceKm >= DISTANCE_RANGES.TEN_KM) return 'Up to 10 km';
  if (distanceKm >= DISTANCE_RANGES.FIVE_KM) return 'Up to 5 km';
  return 'Up to 1 km';
};
