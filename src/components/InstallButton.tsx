import React, { useEffect, useState } from 'react';

const InstallButton: React.FC = () => {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const check = () => {
      const inst = (window as any).__deferredPWAInstallPrompt;
      setAvailable(!!inst);
    };

    check();
    const listener = () => check();
    window.addEventListener('beforeinstallprompt', listener as EventListener);
    window.addEventListener('appinstalled', listener as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', listener as EventListener);
      window.removeEventListener('appinstalled', listener as EventListener);
    };
  }, []);

  const handleClick = async () => {
    const evt = (window as any).__deferredPWAInstallPrompt;
    if (!evt) return;
    try {
      evt.prompt();
      const choice = await evt.userChoice;
      console.log('[PWA] install choice', choice);
      // clear global
      (window as any).__deferredPWAInstallPrompt = null;
      setAvailable(false);
    } catch (err) {
      console.warn('[PWA] install failed', err);
    }
  };

  if (!available) return null;

  return (
    <button onClick={handleClick} title="Install app" className="fixed top-4 right-4 z-50 bg-amber-500 text-white px-3 py-2 rounded-md shadow-lg hidden md:block">
      Install
    </button>
  );
};

export default InstallButton;
