# Landing Page Settings - Admin Configuration Guide

## Overview

The Landing Page Settings feature allows administrators to dynamically manage images and content displayed on the landing page WITHOUT modifying code. This includes all hero images, gallery sections, team photos, and more.

## Accessing the Admin Settings Panel

1. **Login to Moderation Panel**: Go to admin login at `/moderation-login`
2. **Look for "Landing Page Settings" Menu**: In the hamburger menu (☰) at the top right
3. **Note**: Only users with `ADMIN` role can access this feature

## Settings Tab Categories

### 1. **Banner Images**
- **Purpose**: Hero section banners at the top of the landing page
- **Usage**: Upload multiple banners that rotate or display as a gallery
- **Fields**: Image URL, Title, Description

### 2. **About Images**
- **Purpose**: Images for the About section
- **Usage**: Team photos, company history images
- **Fields**: Image URL, Caption

### 3. **Members Images**
- **Purpose**: Featured member profiles/avatars
- **Usage**: Display featured members or testimonials
- **Fields**: Image URL, Name, Title

### 4. **Work Images**
- **Purpose**: Gallery or portfolio section
- **Usage**: Show success stories, event photos
- **Fields**: Image URL, Title, Category

### 5. **Meet Images**
- **Purpose**: Community/events section
- **Usage**: Event photos, meetup images
- **Fields**: Image URL, Caption

### 6. **Stories Images**
- **Purpose**: User stories/testimonials section
- **Usage**: Member success stories with photos
- **Fields**: Image URL, Title, Author

### 7. **Footer Images**
- **Purpose**: Footer background and accent images
- **Usage**: Background patterns, footer icons
- **Fields**: Image URL, Type (activity/feature/bg)

### 8. **Hero Settings Tab**
- **Hero Title**: Main heading on landing page (e.g., "Find Your Perfect Match")
- **Hero Subtitle**: Subheading description
- **CTA Button Text**: Call-to-action button text (e.g., "Get Started")
- **Primary Color**: Theme primary color (hex format)
- **Secondary Color**: Theme secondary color (hex format)
- **Hide Unverified Profiles**: Toggle to hide users without photo verification

## How to Add Images

1. **Find the Section**: Click on the tab for the image category you want to modify
2. **Enter Image URL**: Paste the URL of the image in the input field
3. **Click "Add Image"**: The image will be added to that section
4. **Edit (Optional)**: Click "Edit" to add title/caption/description
5. **Save Changes**: Changes are saved automatically

## How to Edit Images

1. **Click "Edit"** button on any image
2. **Modify Fields**:
   - Image URL
   - Title/Name
   - Description/Caption
3. **Click "Save Changes"** to commit updates
4. **Click "Cancel"** to discard changes

## How to Delete Images

1. **Click "Delete"** button on any image
2. **Confirm** the deletion when prompted
3. Image is immediately removed from landing page

## How to Reorder Images

Unfortunately, manual drag-and-drop reordering is not yet available. Images are ordered by:
- The order you add them (earliest added = appears first)
- When you delete an image, remaining images automatically renumber

**Tip**: If you need to change order, delete all images in that section and re-add them in the desired order.

## Finding Image URLs

### Option 1: Use Direct URLs
- Free image hosting: [Unsplash](https://unsplash.com), [Pexels](https://pexels.com), [Pixabay](https://pixabay.com)
- Cloudinary: Upload to your account and get direct URLs
- Imgur: Upload and copy direct link
- Your own server: Upload to `/public/images/` and use path like `/images/my-photo.jpg`

### Option 2: Upload First, Get URL Later
If you need to upload new images:
1. Use your hosting provider's upload interface
2. Copy the image URL once uploaded
3. Paste into the settings panel

## Color Customization

### Changing Theme Colors
The hero settings allow you to customize:
- **Primary Color**: Used for buttons, highlights, accents
- **Secondary Color**: Used for hover states, backgrounds, gradients

**Format**: Hex colors (e.g., `#FF1493` for deep pink)

**Color Tools**:
- [Color Picker](https://htmlcolorcodes.com/#FF1493)
- [Material Design Colors](https://material.io/resources/color/)

## API Integration (Developer Reference)

### Fetch Settings (Public - No Auth)
```javascript
GET /api/public/landing-page-settings
Response: { bannerImages: [...], heroTitle: "...", ... }
```

### Update Settings (Admin Only)
```javascript
PUT /api/admin/landing-page-settings
Body: { heroTitle: "...", heroSubtitle: "...", ... }
```

### Add Image to Section (Admin Only)
```javascript
POST /api/admin/landing-page-settings/{section}/image
Body: { imageUrl: "...", title: "...", order: 0 }
```

### Delete Image (Admin Only)
```javascript
DELETE /api/admin/landing-page-settings/{section}/image/{index}
```

## Frontend Integration

The landing page automatically fetches settings using the custom hook:

```typescript
import useLandingPageSettings from '../hooks/useLandingPageSettings';

const LandingPage = () => {
  const { settings, loading } = useLandingPageSettings();
  
  // Use settings.heroTitle, settings.bannerImages, etc.
  // to render dynamic content
};
```

**To integrate specific sections** into LandingPage.tsx:
1. Import the hook
2. Call `useLandingPageSettings()`
3. Replace hardcoded images with `settings.workImages`, `settings.memberImages`, etc.
4. Use colors: `settings.primaryColor`, `settings.secondaryColor`

## Maintenance Mode

**Feature Coming Soon**: Admin will be able to toggle maintenance mode to show a coming-soon page to visitors while maintaining the site.

## Best Practices

1. **Image URLs**: Always use HTTPS URLs for security
2. **Image Size**: Optimize images to under 2MB for faster loading
3. **Descriptions**: Write clear, concise titles and descriptions
4. **Colors**: Test colors on both light and dark backgrounds
5. **Backup**: Keep a record of custom settings in case of issues

## Troubleshooting

### Images Not Showing
- **Issue**: Images appear broken on landing page
- **Solution**: 
  - Verify the image URL is correct and publicly accessible
  - Check that the URL uses HTTPS
  - Try downloading the image and re-uploading

### Settings Not Saving
- **Issue**: Changes disappear after saving
- **Solution**:
  - Refresh page and try again
  - Check browser console for errors
  - Verify you have admin role

### Can't Access Settings Panel
- **Issue**: "Landing Page Settings" button not visible
- **Solution**:
  - Contact system admin to add ADMIN role to your account
  - Log out and log back in
  - Clear browser cache and reload

## Support

For technical issues or feature requests, contact the development team with:
- Step-by-step reproduction steps
- Screenshot of the issue
- Browser and device information
