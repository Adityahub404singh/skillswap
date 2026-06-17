import { useEffect, useState } from 'react';

export const InstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      setDeferredPrompt(null);
    }
  };

  if (!deferredPrompt) return null;

  return (
    <button 
      onClick={handleInstall} 
      className="fixed bottom-20 right-5 z-50 bg-purple-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold"
    >
      Install App 📲
    </button>
  );
};
