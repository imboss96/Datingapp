import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [installationState, setInstallationState] = useState<'ready' | 'installing' | 'installed'>('ready');

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const beforeInstallPromptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(beforeInstallPromptEvent);
      // Show prompt after a delay to not be too intrusive
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    const handleAppInstalled = () => {
      console.log('✅ PWA was successfully installed');
      setShowPrompt(false);
      setInstallationState('installed');
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setInstallationState('installing');
    await deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    if (outcome === 'accepted') {
      setInstallationState('installed');
      console.log('✅ User accepted the install prompt');
    } else {
      console.log('❌ User dismissed the install prompt');
      setInstallationState('ready');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  // Check if running as PWA
  const isRunningAsPWA = () => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true || // iOS
      document.referrer.includes('android-app://')
    );
  };

  // Don't show if already installed or not ready
  if (installationState === 'installed' || !deferredPrompt || !showPrompt || isRunningAsPWA()) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-gradient-to-r from-rose-500 to-pink-600 text-white p-4 rounded-t-3xl shadow-2xl border-t-4 border-rose-400">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-shrink-0">
            <i className="fa-solid fa-download text-white text-lg"></i>
          </div>
          <div className="flex-1">
            <h3 className="font-black text-sm uppercase tracking-wider">Install lunesa</h3>
            <p className="text-xs text-white/80 mt-1">Get the app experience on your device</p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors flex-shrink-0"
          >
            <i className="fa-solid fa-times text-lg"></i>
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleInstallClick}
            disabled={installationState === 'installing'}
            className="flex-1 bg-white text-rose-600 font-black py-3 px-4 rounded-xl hover:bg-rose-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {installationState === 'installing' ? (
              <>
                <span className="inline-block animate-spin">
                  <i className="fa-solid fa-spinner"></i>
                </span>
                Installing...
              </>
            ) : (
              <>
                <i className="fa-solid fa-arrow-down"></i>
                Install App
              </>
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-3 bg-white/20 text-white font-bold rounded-xl hover:bg-white/30 transition-all"
          >
            Later
          </button>
        </div>

        <p className="text-[11px] text-white/70 mt-3 text-center">
          Works offline. No storage needed. Can uninstall anytime.
        </p>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
