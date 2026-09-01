import React, { useEffect, useState } from 'react';

// ADDITIVE: In-app "Install App" button for PWA-capable browsers.
// Listens for beforeinstallprompt; only renders when installation is available
// (Chrome/Edge/Android). Hides after the app is installed or on unsupported
// browsers. Does not affect any existing UI.
export default function InstallAppButton({ className = '', style }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    let active = true;
    function onBeforeInstall(e) {
      e.preventDefault();
      if (active) setDeferredPrompt(e);
    }
    function onInstalled() {
      if (active) { setInstalled(true); setDeferredPrompt(null); }
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      active = false;
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(() => ({}));
    if (choice && choice.outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  }

  if (installed || !deferredPrompt) return null;

  return (
    <button
      type="button"
      className={`mychess-install-btn ${className}`.trim()}
      style={style}
      onClick={handleInstall}
      title="Install MYCHESS as an app"
    >
      ⤓ Install
    </button>
  );
}
