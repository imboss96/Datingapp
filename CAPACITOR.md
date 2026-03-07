# Capacitor Setup

This project is now wired for Capacitor with Android and iOS platforms.

## Added

- `capacitor.config.ts`
- `android/` platform
- `ios/` platform
- NPM scripts:
  - `npm run mobile:sync`
  - `npm run android:open`
  - `npm run ios:open`
  - `npm run android:run`
  - `npm run ios:run`

## Daily Workflow

1. Build and sync web assets:

```bash
npm run mobile:sync
```

2. Open native project:

```bash
npm run android:open
npm run ios:open
```

3. Run from Android Studio / Xcode.

## API/WS URL for Device Testing

If your backend runs on your laptop, `localhost` inside phone/emulator will not reach it.

- Android emulator: use `10.0.2.2` instead of `localhost`
- iOS simulator: `localhost` usually works
- Real phone: use your computer LAN IP, e.g. `192.168.x.x`

Example `.env` for Android emulator:

```env
VITE_API_URL=http://10.0.2.2:5000/api
VITE_WS_URL=ws://10.0.2.2:5000/ws
```

Then run `npm run mobile:sync` again.

