import mongoose from 'mongoose';

const landingPageSettingsSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: 'default',
      unique: true,
      index: true
    },
    // Hero/Banner Section
    bannerImages: [
      {
        imageUrl: String,
        title: String,
        description: String,
        order: Number
      }
    ],
    // About Section Images
    aboutImages: [
      {
        imageUrl: String,
        caption: String,
        order: Number
      }
    ],
    // Members/Profiles Section
    memberImages: [
      {
        imageUrl: String,
        name: String,
        title: String,
        order: Number
      }
    ],
    // Work/Gallery Section
    workImages: [
      {
        imageUrl: String,
        title: String,
        category: String,
        order: Number
      }
    ],
    // Community/Meet Section
    meetImages: [
      {
        imageUrl: String,
        caption: String,
        order: Number
      }
    ],
    // Stories Section
    storyImages: [
      {
        imageUrl: String,
        title: String,
        author: String,
        order: Number
      }
    ],
    // Footer/Background Images
    footerImages: [
      {
        imageUrl: String,
        type: String, // 'activity', 'feature', 'bg'
        order: Number
      }
    ],
    // General Settings
    isLiveEnabled: {
      type: Boolean,
      default: true
    },
    hideUnverifiedProfiles: {
      type: Boolean,
      default: false
    },
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    maintenanceMessage: {
      type: String,
      default: 'Site is under maintenance. We\'ll be back soon!'
    },
    // Hero Section Text
    heroTitle: {
      type: String,
      default: 'Find Your Perfect Match'
    },
    heroSubtitle: {
      type: String,
      default: 'Connect with amazing people and build meaningful relationships'
    },
    heroCtaText: {
      type: String,
      default: 'Get Started'
    },
    // Custom CSS/Theme
    primaryColor: {
      type: String,
      default: '#FF1493'
    },
    secondaryColor: {
      type: String,
      default: '#FF69B4'
    },
    // Hero Video Background
    heroVideoUrl: {
      type: String,
      default: '' // YouTube video URL or video embed URL
    },
    heroVideoOpacity: {
      type: Number,
      default: 0.5, // 0 to 1
      min: 0,
      max: 1
    },
    heroVideoTransparency: {
      type: Number,
      default: 0.3, // 0 to 1 (inverse of opacity for overlay)
      min: 0,
      max: 1
    },
    // Featured Members
    featuredMemberIds: [String],
    // Analytics
    lastModifiedBy: String,
    lastModifiedAt: {
      type: Date,
      default: Date.now
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { collection: 'landingPageSettings' }
);

// Update the updatedAt timestamp before saving
landingPageSettingsSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const LandingPageSettings = mongoose.model('LandingPageSettings', landingPageSettingsSchema);
export default LandingPageSettings;
