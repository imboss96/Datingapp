import { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

interface ImageItem {
  imageUrl: string;
  title?: string;
  description?: string;
  caption?: string;
  name?: string;
  author?: string;
  category?: string;
  type?: string;
  order: number;
}

export interface LandingPageSettings {
  id: string;
  bannerImages: ImageItem[];
  aboutImages: ImageItem[];
  memberImages: ImageItem[];
  workImages: ImageItem[];
  meetImages: ImageItem[];
  storyImages: ImageItem[];
  footerImages: ImageItem[];
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  primaryColor: string;
  secondaryColor: string;
  heroVideoUrl?: string;
  heroVideoOpacity?: number;
  heroVideoTransparency?: number;
  hideUnverifiedProfiles: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  isLiveEnabled: boolean;
}

const DEFAULT_SETTINGS: LandingPageSettings = {
  id: 'default',
  bannerImages: [],
  aboutImages: [],
  memberImages: [],
  workImages: [],
  meetImages: [],
  storyImages: [],
  footerImages: [],
  heroTitle: 'Find Your Perfect Match',
  heroSubtitle: 'Connect with amazing people and build meaningful relationships',
  heroCtaText: 'Get Started',
  primaryColor: '#FF1493',
  secondaryColor: '#FF69B4',
  heroVideoUrl: '',
  heroVideoOpacity: 0.5,
  heroVideoTransparency: 0.3,
  hideUnverifiedProfiles: false,
  maintenanceMode: false,
  maintenanceMessage: 'Site is under maintenance. We\'ll be back soon!',
  isLiveEnabled: true
};

export const useLandingPageSettings = () => {
  const [settings, setSettings] = useState<LandingPageSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/public/landing-page-settings');
        setSettings(response || DEFAULT_SETTINGS);
        setError(null);
      } catch (err) {
        console.warn('[WARN] Failed to fetch landing page settings, using defaults:', err);
        setSettings(DEFAULT_SETTINGS);
        setError(null); // Don't fail the page if settings can't be fetched
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading, error };
};

export default useLandingPageSettings;
