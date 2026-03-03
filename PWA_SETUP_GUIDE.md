# lunesa PWA Setup - Complete Guide

## Overview
lunesa is now a full Progressive Web App (PWA) with offline support, native app-like experience, and installation capabilities on all devices.

## What's New 🎉

### 1. **Installation On Any Device**
- Users can install lunesa like a native app on:
  - ✅ Android phones (Chrome, Edge, Firefox, Samsung Internet)
  - ✅ iPhones & iPads (iOS 15+)
  - ✅ Windows, macOS, Linux (Edge, Chrome)
  - ✅ Tablets (Android & iPad)

### 2. **Offline Functionality**
- The app works offline with cached data
- API requests retry automatically when connection returns
- Images and assets load from cache when offline
- Offline indicator shows current status

### 3. **Smart Caching Strategy**
- **Static Assets**: Cached indefinitely (HTML, JS, CSS)
- **Images**: Cached for 30 days
- **API Calls**: Cached for 5 minutes with network-first strategy
- **Fonts**: Cached for 1 year

## How It Works

### Service Worker
Located at `/public/service-worker.js`
- Handles offline requests
- Manages cache lifecycle
- Supports push notifications
- Background sync for messages

### Installation Prompt
Located at `/components/PWAInstallPrompt.tsx`
- Appears after 3 seconds on first visit
- Can be dismissed with "Later" button
- Shows installation status
- Material Design UI

### Manifest
Located at `/public/manifest.json`
- Defines app name, icons, colors
- Shortcuts for quick access (Matches, Chats, Discover)
- PWA display modes (standalone, minimal-ui, fullscreen)
- Screenshots for app stores

## Installation Methods

### Android
1. Open https://lunesalove.com on Chrome/Edge/Firefox
2. Click the "Install app" prompt at bottom
3. Select "Install" 
4. App appears on home screen instantly
5. Opens fullscreen without browser UI

### iPhone/iPad (iOS 15+)
1. Open https://lunesalove.com in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. Enter app name and tap "Add"
5. Tap the app icon to launch

### Desktop (Windows/Mac/Linux)
1. Open https://lunesalove.com in Chrome/Edge
2. Click install icon in address bar (right side)
3. Click "Install"
4. App opens in window without browser UI

## Features

### ✅ Installable
```
Command: Add to home screen / Install app
Result: Standalone window, icon on home screen
```

### ✅ Offline Support
```
API requests automatically cache and retry
Images serve from cache when offline
Smooth offline experience
```

### ✅ Native-like
```
Fullscreen immersive experience
No browser bars or address bar
Status bar integrated with app theme
Smooth animations and transitions
```

### ✅ Fast Loading
```
Service worker pre-caches assets on first visit
Static assets load instantly from cache
API responses cached for optimal performance
```

### ✅ Push Notifications
```
Real-time match notifications
Chat message alerts
System integration on all platforms
```

## Configuration Files

### vite.config.ts
```typescript
// PWA Plugin Configuration
VitePWA({
  registerType: 'autoUpdate',
  manifest: {...},
  workbox: {...}
})
```

### package.json
```json
{
  "devDependencies": {
    "vite-plugin-pwa": "^x.x.x"
  }
}
```

### public/manifest.json
Defines app metadata, icons, and shortcuts

## Building for Production

```bash
# Build PWA
npm run build

# Output includes:
# - dist/index.html (main app)
# - dist/manifest.json (auto-generated)
# - dist/sw.js (service worker)

# Deploy to server
# The PWA is ready to install!
```

## Testing Locally

To test PWA features locally:

1. **Enable PWA in development**:
   Edit `vite.config.ts`:
   ```typescript
   VitePWA({
     devOptions: {
       enabled: true  // Enable in dev
     }
   })
   ```

2. **Build for testing**:
   ```bash
   npm run build
   npm run preview
   ```

3. **Testing checklist**:
   - [ ] Service worker registers in DevTools > Application > Service Workers
   - [ ] Manifest displays in DevTools > Application > Manifest
   - [ ] Install prompt appears after 3 seconds
   - [ ] Offline mode works (disconnect internet)
   - [ ] Images load from cache
   - [ ] API calls retry when online

## Browser Support

| Platform | Support | Method |
|----------|---------|--------|
| Android | ✅ Full | Chrome install prompt |
| iOS 15+ | ✅ Full | Safari "Add to Home Screen" |
| Windows | ✅ Full | Chrome/Edge install prompt |
| macOS | ✅ Full | Chrome/Edge install prompt |
| Linux | ✅ Full | Chrome install prompt |
| Desktop Web | ✅ Full | Browser installation |

## Performance Optimizations

### Cache Sizes
- Static cache: Unlimited (CSS, JS, HTML)
- API cache: 50 entries max
- Image cache: 100 entries max (30 day expiry)
- Font cache: 30 entries max (1 year expiry)

### Network Strategies
1. **API Requests**: Network First (try network, fallback to cache)
2. **Images**: Cache First (serve from cache, update in background)
3. **Static Assets**: Cache First (instant load)
4. **HTML Documents**: Network First (latest content)

## Troubleshooting

### Install prompt not showing?
- Check browser is updated to latest version
- Ensure HTTPS is used (PWA requires HTTPS)
- Visit site from new incognito/private window
- Check DevTools > Application > Install Prompt Events

### App not updating?
- Service worker has auto-update enabled
- Force refresh with Ctrl+Shift+R / Cmd+Shift+R
- Old app versions persist, new visits get fresh cache

### Offline not working?
- Check service worker in DevTools
- Verify cache storage in DevTools > Application > Cache Storage
- Check network strategy in service-worker.js

### Icons not showing?
- Verify `/src/assets/images/logo/logo.png` exists
- Check manifest.json icon paths
- Use PNG format for best compatibility

## Uninstalling PWA

### Android
- Long press app icon
- Select "Uninstall app"
- Or: Settings > Apps > lunesa > Uninstall

### iOS
- Long press app icon
- Select "Remove App"
- Select "Remove from Home Screen"

### Desktop
- Right-click app window
- Select "Uninstall"

## Future Enhancements

- [ ] Periodic background sync for messages
- [ ] Share target for direct messaging
- [ ] File handling for photo uploads
- [ ] Shortcuts for user actions
- [ ] Badge notifications for message count
- [ ] Share to Twitter/Instagram from matches

## Resources

- [**MDN PWA Guide**](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [**Google PWA Checklist**](https://web.dev/pwa-checklist/)
- [**Vite PWA Plugin**](https://vite-pwa-org.netlify.app/)
- [**Web.dev Performance**](https://web.dev/performance/)

## Deployment Checklist

- [ ] HTTPS enabled on production domain
- [ ] Service worker accessible at `/service-worker.js`
- [ ] Manifest accessible at `/manifest.json`
- [ ] Icons in place at `/src/assets/images/logo/logo.png`
- [ ] Offline page at `/offline.html`
- [ ] Public folder served correctly
- [ ] Cache headers configured (immutable for assets)
- [ ] CSP headers allow service worker
- [ ] Build includes PWA plugin (vite.config.ts)
- [ ] Test installation on real devices

## Support

For issues with PWA functionality:
1. Check browser console for errors
2. Verify service worker in DevTools
3. Check cache storage in DevTools
4. Clear site data and reinstall
5. Test on different browser if needed

---
**Last Updated**: March 2026
**Status**: ✅ Production Ready
