import React, { useEffect, useState } from 'react';

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent Chrome from showing the mini-infobar
      e.preventDefault();
      // expose globally for other UI components (persistent button)
      (window as any).__deferredPWAInstallPrompt = e;
      setDeferredPrompt(e);
      setVisible(true);
      console.log('[PWA] beforeinstallprompt event captured');
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      console.log('[PWA] userChoice', choiceResult);
      setVisible(false);
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('[PWA] install prompt failed', err);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white shadow-lg rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="font-bold text-sm">Install lunesa</div>
          <div className="text-xs text-gray-500">Add to your home screen for a native-like experience</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setVisible(false); setDeferredPrompt(null); }} className="text-sm text-gray-600 px-3 py-1">Dismiss</button>
          <button onClick={handleInstall} className="bg-amber-500 text-white px-3 py-1 rounded-md text-sm">Install</button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
