import React, { useState, useEffect } from 'react';
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

interface LandingPageSettings {
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
  hideUnverifiedProfiles: boolean;
}

interface Props {
  isOpen?: boolean;
  onClose?: () => void;
  embedded?: boolean;
}

const sections = [
  { key: 'bannerImages', label: 'Banner', icon: 'fa-images' },
  { key: 'aboutImages', label: 'About', icon: 'fa-circle-info' },
  { key: 'memberImages', label: 'Members', icon: 'fa-users' },
  { key: 'workImages', label: 'Work', icon: 'fa-briefcase' },
  { key: 'meetImages', label: 'Meet', icon: 'fa-handshake' },
  { key: 'storyImages', label: 'Stories', icon: 'fa-book' },
  { key: 'footerImages', label: 'Footer', icon: 'fa-list' }
];

const LandingPageSettingsPanel: React.FC<Props> = ({ isOpen = true, onClose = () => {}, embedded = false }) => {
  const [settings, setSettings] = useState<LandingPageSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('bannerImages');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedImages, setSelectedImages] = useState<ImageItem[]>([]);
  const [editingImage, setEditingImage] = useState<{ index: number; data: ImageItem } | null>(null);
  const [heroSettings, setHeroSettings] = useState({ heroTitle: '', heroSubtitle: '', heroCtaText: '', primaryColor: '', secondaryColor: '', heroVideoUrl: '', heroVideoOpacity: 0.5, heroVideoTransparency: 0.3, hideUnverifiedProfiles: false });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  useEffect(() => {
    if (settings) {
      const section = activeTab as keyof LandingPageSettings;
      setSelectedImages(Array.isArray(settings[section]) ? settings[section] : []);
      setHeroSettings({
        heroTitle: settings.heroTitle || '',
        heroSubtitle: settings.heroSubtitle || '',
        heroCtaText: settings.heroCtaText || '',
        primaryColor: settings.primaryColor || '#FF1493',
        secondaryColor: settings.secondaryColor || '#FF69B4',
        heroVideoUrl: (settings as any).heroVideoUrl || '',
        heroVideoOpacity: (settings as any).heroVideoOpacity || 0.5,
        heroVideoTransparency: (settings as any).heroVideoTransparency || 0.3,
        hideUnverifiedProfiles: settings.hideUnverifiedProfiles || false
      });
    }
  }, [activeTab, settings]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/landing-page-settings');
      // Ensure we're handling both response and response.data
      const settingsData = response.data || response;
      setSettings(settingsData);
      setMessage(null);
    } catch (error) {
      console.error('[ERROR] Failed to fetch settings:', error);
      setMessage({ type: 'error', text: 'Failed to load landing page settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = async (imageUrl: string) => {
    if (!settings || !imageUrl.trim()) return;

    try {
      setSaving(true);
      const imageData = {
        imageUrl,
        title: '',
        description: '',
        caption: '',
        name: '',
        author: '',
        category: '',
        order: selectedImages.length
      };

      const response = await apiClient.post(`/admin/landing-page-settings/${activeTab}/image`, imageData);
      setSettings(response.data);
      setSelectedImages((response.data[activeTab] as ImageItem[]) || []);
      setMessage({ type: 'success', text: 'Image added successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('[ERROR] Failed to add image:', error);
      setMessage({ type: 'error', text: 'Failed to add image' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImage = async (index: number) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      setSaving(true);
      const response = await apiClient.delete(`/admin/landing-page-settings/${activeTab}/image/${index}`);
      setSettings(response.data);
      setSelectedImages((response.data[activeTab] as ImageItem[]) || []);
      setMessage({ type: 'success', text: 'Image deleted successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('[ERROR] Failed to delete image:', error);
      setMessage({ type: 'error', text: 'Failed to delete image' });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !settings) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('section', activeTab);

      // Upload to backend
      const uploadResponse = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const { imageUrl } = await uploadResponse.json();

      // Add image to settings
      await handleAddImage(imageUrl);
      
      // Reset file input
      event.target.value = '';
      setMessage({ type: 'success', text: 'Image uploaded successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('[ERROR] Failed to upload image:', error);
      setMessage({ type: 'error', text: 'Failed to upload image' });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateImage = async () => {
    if (!editingImage) return;

    try {
      setSaving(true);
      const updatedImages = [...selectedImages];
      updatedImages[editingImage.index] = editingImage.data;

      const response = await apiClient.put(`/admin/landing-page-settings/${activeTab}/reorder`, { images: updatedImages });
      setSettings(response.data);
      setSelectedImages((response.data[activeTab] as ImageItem[]) || []);
      setEditingImage(null);
      setMessage({ type: 'success', text: 'Image updated successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('[ERROR] Failed to update image:', error);
      setMessage({ type: 'error', text: 'Failed to update image' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHeroSettings = async () => {
    try {
      setSaving(true);
      const response = await apiClient.put('/admin/landing-page-settings/hero-settings/update', heroSettings);
      // Ensure we're getting the data property correctly
      const updatedSettings = response.data || response;
      setSettings(updatedSettings);
      // Also update heroSettings to maintain UI state
      setHeroSettings({
        heroTitle: updatedSettings.heroTitle || '',
        heroSubtitle: updatedSettings.heroSubtitle || '',
        heroCtaText: updatedSettings.heroCtaText || '',
        primaryColor: updatedSettings.primaryColor || '#FF1493',
        secondaryColor: updatedSettings.secondaryColor || '#FF69B4',
        heroVideoUrl: updatedSettings.heroVideoUrl || '',
        heroVideoOpacity: updatedSettings.heroVideoOpacity || 0.5,
        heroVideoTransparency: updatedSettings.heroVideoTransparency || 0.3,
        hideUnverifiedProfiles: updatedSettings.hideUnverifiedProfiles || false
      });
      setMessage({ type: 'success', text: 'Hero settings updated successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('[ERROR] Failed to save hero settings:', error);
      setMessage({ type: 'error', text: 'Failed to save hero settings' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Embedded content (for use in ModeratorPanel tabs)
  if (embedded) {
    return (
      <div className="w-full space-y-6">
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 sticky top-0 z-10">
          <div className="flex gap-2 flex-wrap">
            {sections.map(section => (
              <button
                key={section.key}
                onClick={() => setActiveTab(section.key)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                  activeTab === section.key
                    ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <i className={`fa-solid ${section.icon}`}></i>
                {section.label}
              </button>
            ))}
            <button
              onClick={() => setActiveTab('hero')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'hero'
                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <i className="fa-solid fa-wand-magic-sparkles"></i>
              Hero
            </button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            <div className="flex items-center gap-2">
              <i className={`fa-solid ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
              {message.text}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <i className="fa-solid fa-spinner animate-spin text-3xl text-purple-500 mb-2 block"></i>
                <p className="text-gray-600">Loading settings...</p>
              </div>
            </div>
          ) : activeTab === 'hero' ? (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-6">
                <i className="fa-solid fa-wand-magic-sparkles text-purple-500"></i>
                Hero Section Settings
              </h3>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Hero Title</label>
                <input
                  type="text"
                  value={heroSettings.heroTitle}
                  onChange={(e) => setHeroSettings({ ...heroSettings, heroTitle: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="Enter hero title"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Hero Subtitle</label>
                <input
                  type="text"
                  value={heroSettings.heroSubtitle}
                  onChange={(e) => setHeroSettings({ ...heroSettings, heroSubtitle: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="Enter hero subtitle"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">CTA Button Text</label>
                <input
                  type="text"
                  value={heroSettings.heroCtaText}
                  onChange={(e) => setHeroSettings({ ...heroSettings, heroCtaText: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="Enter button text"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Primary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={heroSettings.primaryColor}
                      onChange={(e) => setHeroSettings({ ...heroSettings, primaryColor: e.target.value })}
                      className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={heroSettings.primaryColor}
                      onChange={(e) => setHeroSettings({ ...heroSettings, primaryColor: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 font-mono text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Secondary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={heroSettings.secondaryColor}
                      onChange={(e) => setHeroSettings({ ...heroSettings, secondaryColor: e.target.value })}
                      className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={heroSettings.secondaryColor}
                      onChange={(e) => setHeroSettings({ ...heroSettings, secondaryColor: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-300 pt-6 mt-6">
                <h4 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-video text-purple-500"></i>
                  Hero Video Background
                </h4>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">YouTube Video URL</label>
                  <input
                    type="text"
                    value={heroSettings.heroVideoUrl}
                    onChange={(e) => setHeroSettings({ ...heroSettings, heroVideoUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 font-mono text-sm"
                    placeholder="e.g., https://www.youtube.com/embed/VIDEO_ID"
                  />
                  <p className="text-xs text-gray-500 mt-1">Accepts any YouTube URL format:</p>
                  <ul className="text-xs text-gray-500 mt-1 ml-4 space-y-1">
                    <li>✓ https://www.youtube.com/embed/VIDEO_ID</li>
                    <li>✓ https://www.youtube.com/watch?v=VIDEO_ID</li>
                    <li>✓ https://youtu.be/VIDEO_ID</li>
                    <li>✓ Just the VIDEO_ID alone</li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Video Opacity</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={heroSettings.heroVideoOpacity}
                        onChange={(e) => setHeroSettings({ ...heroSettings, heroVideoOpacity: parseFloat(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="text-sm font-bold text-gray-700 w-12 text-right">{(heroSettings.heroVideoOpacity * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Overlay Transparency</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={heroSettings.heroVideoTransparency}
                        onChange={(e) => setHeroSettings({ ...heroSettings, heroVideoTransparency: parseFloat(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="text-sm font-bold text-gray-700 w-12 text-right">{(heroSettings.heroVideoTransparency * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <i className="fa-solid fa-info-circle mr-2"></i>
                    Opacity controls video visibility (0 = hidden, 1 = fully visible). Transparency controls the dark overlay on top of the video.
                  </p>
                </div>

                {/* VIDEO PREVIEW */}
                {heroSettings.heroVideoUrl && (
                  <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
                    <h5 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <i className="fa-solid fa-eye text-blue-400"></i>
                      Video Preview
                    </h5>
                    <div className="relative bg-black aspect-video rounded-lg overflow-hidden">
                      {(() => {
                        // Extract video ID from various YouTube URL formats
                        let videoId = heroSettings.heroVideoUrl;
                        if (heroSettings.heroVideoUrl.includes('youtube.com/embed/')) {
                          videoId = heroSettings.heroVideoUrl.split('/embed/')[1]?.split('?')[0] || '';
                        } else if (heroSettings.heroVideoUrl.includes('youtube.com/watch?v=')) {
                          videoId = heroSettings.heroVideoUrl.split('v=')[1]?.split('&')[0] || '';
                        } else if (heroSettings.heroVideoUrl.includes('youtu.be/')) {
                          videoId = heroSettings.heroVideoUrl.split('youtu.be/')[1]?.split('?')[0] || '';
                        }
                        const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1&controls=1&modestbranding=1&rel=0`;
                        return (
                          <iframe
                            width="100%"
                            height="100%"
                            src={embedUrl}
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                            style={{
                              opacity: heroSettings.heroVideoOpacity || 0.5,
                              border: 'none'
                            }}
                          />
                        );
                      })()}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          opacity: heroSettings.heroVideoTransparency || 0.3,
                          background: `linear-gradient(135deg, rgba(30,5,9,${(heroSettings.heroVideoTransparency || 0.3) * 0.85}), rgba(17,2,5,${(heroSettings.heroVideoTransparency || 0.3) * 0.9}))`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      <i className="fa-solid fa-circle-info mr-1"></i>
                      This preview shows how the video will appear on your landing page.
                    </p>
                  </div>
                )}

                {heroSettings.heroVideoUrl && (
                  <button
                    onClick={() => setHeroSettings({ ...heroSettings, heroVideoUrl: '', heroVideoOpacity: 0.5, heroVideoTransparency: 0.3 })}
                    className="w-full mt-4 bg-red-500 text-white font-bold py-2 rounded-lg hover:bg-red-600 transition-all"
                  >
                    <i className="fa-solid fa-trash mr-2"></i>
                    Remove Video
                  </button>
                )}
              </div>

              <button
                onClick={handleSaveHeroSettings}
                disabled={saving}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all mt-6"
              >
                {saving ? 'Saving...' : 'Save Hero Settings'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">
                <i className={`fa-solid ${sections.find(s => s.key === activeTab)?.icon || 'fa-images'} mr-2`}></i>
                {sections.find(s => s.key === activeTab)?.label || 'Images'}
              </h3>

              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  id="newImageUrl"
                  placeholder="Enter image URL..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={(e) => {
                    const input = document.getElementById('newImageUrl') as HTMLInputElement;
                    if (input) {
                      handleAddImage(input.value);
                      input.value = '';
                    }
                  }}
                  disabled={saving}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold px-6 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all"
                >
                  <i className="fa-solid fa-plus mr-2"></i>
                  Add Image
                </button>
                <label className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <button
                    onClick={(e) => {
                      const fileInput = (e.currentTarget.previousSibling as HTMLInputElement);
                      fileInput?.click();
                    }}
                    disabled={uploading}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold px-6 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 transition-all"
                  >
                    <i className="fa-solid fa-upload mr-2"></i>
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </button>
                </label>
              </div>

              {selectedImages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <i className="fa-solid fa-image text-4xl mb-2 block opacity-20"></i>
                  <p>No images in this section yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedImages.map((img, idx) => (
                    <div key={idx} className="border border-gray-300 rounded-lg overflow-hidden hover:shadow-lg transition-all">
                      <img
                        src={img.imageUrl}
                        alt={img.title || 'Image'}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" font-size="20" text-anchor="middle" dy=".3em" fill="%23999"%3EImage not found%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      <div className="p-3 bg-gray-50">
                        <p className="text-sm font-semibold text-gray-800 truncate">{img.title || 'Untitled'}</p>
                        <p className="text-xs text-gray-600 truncate">{img.description || img.caption || 'No description'}</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => setEditingImage({ index: idx, data: { ...img } })}
                            className="flex-1 bg-blue-500 text-white font-bold py-1 rounded text-xs hover:bg-blue-600 transition-all"
                          >
                            <i className="fa-solid fa-edit mr-1"></i>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteImage(idx)}
                            disabled={saving}
                            className="flex-1 bg-red-500 text-white font-bold py-1 rounded text-xs hover:bg-red-600 disabled:opacity-50 transition-all"
                          >
                            <i className="fa-solid fa-trash mr-1"></i>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Modal rendering (original behavior)
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 flex items-center justify-between border-b border-gray-200 text-white flex-shrink-0">
          <h2 className="text-2xl font-black flex items-center gap-2">
            <i className="fa-solid fa-sliders text-lg"></i>
            Landing Page Settings
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors text-2xl"
          >
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-gray-50 border-b border-gray-200 overflow-x-auto flex-shrink-0">
          <div className="flex gap-2 px-6 py-3 min-w-min">
            {sections.map(section => (
              <button
                key={section.key}
                onClick={() => setActiveTab(section.key)}
                className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeTab === section.key
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-purple-400 hover:text-purple-600'
                }`}
              >
                <i className={`fa-solid ${section.icon}`}></i>
                {section.label}
              </button>
            ))}
            <button
              onClick={() => setActiveTab('hero')}
              className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'hero'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                  : 'bg-white border border-gray-300 text-gray-700 hover:border-purple-400 hover:text-purple-600'
              }`}
            >
              <i className="fa-solid fa-wand-magic-sparkles"></i>
              Hero
            </button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className={`px-6 py-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border-b border-green-200' : 'bg-red-50 text-red-700 border-b border-red-200'}`}>
            <div className="flex items-center gap-2">
              <i className={`fa-solid ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
              {message.text}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <i className="fa-solid fa-spinner animate-spin text-3xl text-purple-500 mb-2 block"></i>
                <p className="text-gray-600">Loading settings...</p>
              </div>
            </div>
          ) : activeTab === 'hero' ? (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-6">
                <i className="fa-solid fa-wand-magic-sparkles text-purple-500"></i>
                Hero Section Settings
              </h3>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Hero Title</label>
                <input
                  type="text"
                  value={heroSettings.heroTitle}
                  onChange={(e) => setHeroSettings({ ...heroSettings, heroTitle: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="Enter hero title"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Hero Subtitle</label>
                <input
                  type="text"
                  value={heroSettings.heroSubtitle}
                  onChange={(e) => setHeroSettings({ ...heroSettings, heroSubtitle: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="Enter hero subtitle"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">CTA Button Text</label>
                <input
                  type="text"
                  value={heroSettings.heroCtaText}
                  onChange={(e) => setHeroSettings({ ...heroSettings, heroCtaText: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="Enter button text"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Primary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={heroSettings.primaryColor}
                      onChange={(e) => setHeroSettings({ ...heroSettings, primaryColor: e.target.value })}
                      className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={heroSettings.primaryColor}
                      onChange={(e) => setHeroSettings({ ...heroSettings, primaryColor: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 font-mono text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Secondary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={heroSettings.secondaryColor}
                      onChange={(e) => setHeroSettings({ ...heroSettings, secondaryColor: e.target.value })}
                      className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={heroSettings.secondaryColor}
                      onChange={(e) => setHeroSettings({ ...heroSettings, secondaryColor: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hideUnverified"
                  checked={heroSettings.hideUnverifiedProfiles || false}
                  onChange={(e) => setHeroSettings({ ...heroSettings, hideUnverifiedProfiles: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="hideUnverified" className="text-sm font-medium text-gray-700">
                  Hide unverified profiles on landing page
                </label>
              </div>

              <button
                onClick={handleSaveHeroSettings}
                disabled={saving}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all mt-6"
              >
                {saving ? 'Saving...' : 'Save Hero Settings'}
              </button>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-images text-purple-500"></i>
                {sections.find(s => s.key === activeTab)?.label} Images
              </h3>

              {editingImage && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-bold text-blue-900 mb-3">Edit Image</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editingImage.data.imageUrl || ''}
                      onChange={(e) => setEditingImage({ ...editingImage, data: { ...editingImage.data, imageUrl: e.target.value } })}
                      placeholder="Image URL"
                      className="w-full px-3 py-2 border border-blue-300 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={editingImage.data.title || ''}
                      onChange={(e) => setEditingImage({ ...editingImage, data: { ...editingImage.data, title: e.target.value } })}
                      placeholder="Title"
                      className="w-full px-3 py-2 border border-blue-300 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={editingImage.data.description || editingImage.data.caption || ''}
                      onChange={(e) => setEditingImage({ ...editingImage, data: { ...editingImage.data, description: e.target.value, caption: e.target.value } })}
                      placeholder="Description/Caption"
                      className="w-full px-3 py-2 border border-blue-300 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateImage}
                        disabled={saving}
                        className="flex-1 bg-green-500 text-white font-bold py-2 rounded hover:bg-green-600 disabled:opacity-50 transition-all text-sm"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setEditingImage(null)}
                        className="flex-1 bg-gray-400 text-white font-bold py-2 rounded hover:bg-gray-500 transition-all text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  id="newImageUrl"
                  placeholder="Enter image URL..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={(e) => {
                    const input = document.getElementById('newImageUrl') as HTMLInputElement;
                    if (input) {
                      handleAddImage(input.value);
                      input.value = '';
                    }
                  }}
                  disabled={saving}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold px-6 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all"
                >
                  <i className="fa-solid fa-plus mr-2"></i>
                  Add Image
                </button>
                <label className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <button
                    onClick={(e) => {
                      const fileInput = (e.currentTarget.previousSibling as HTMLInputElement);
                      fileInput?.click();
                    }}
                    disabled={uploading}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold px-6 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 transition-all"
                  >
                    <i className="fa-solid fa-upload mr-2"></i>
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </button>
                </label>
              </div>

              {selectedImages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <i className="fa-solid fa-image text-4xl mb-2 block opacity-20"></i>
                  <p>No images in this section yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedImages.map((img, idx) => (
                    <div key={idx} className="border border-gray-300 rounded-lg overflow-hidden hover:shadow-lg transition-all">
                      <img
                        src={img.imageUrl}
                        alt={img.title || 'Image'}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" font-size="20" text-anchor="middle" dy=".3em" fill="%23999"%3EImage not found%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      <div className="p-3 bg-gray-50">
                        <p className="text-sm font-semibold text-gray-800 truncate">{img.title || 'Untitled'}</p>
                        <p className="text-xs text-gray-600 truncate">{img.description || img.caption || 'No description'}</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => setEditingImage({ index: idx, data: { ...img } })}
                            className="flex-1 bg-blue-500 text-white font-bold py-1 rounded text-xs hover:bg-blue-600 transition-all"
                          >
                            <i className="fa-solid fa-edit mr-1"></i>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteImage(idx)}
                            disabled={saving}
                            className="flex-1 bg-red-500 text-white font-bold py-1 rounded text-xs hover:bg-red-600 disabled:opacity-50 transition-all"
                          >
                            <i className="fa-solid fa-trash mr-1"></i>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 flex gap-2 justify-end border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-400 text-white font-bold rounded-lg hover:bg-gray-500 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPageSettingsPanel;
