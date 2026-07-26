import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  const registerSW = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registered with scope:', reg.scope);
        reg.update().catch(() => {});
      })
      .catch((err) => {
        console.error('[PWA] Service Worker registration failed:', err);
      });
  };

  if (document.readyState === 'complete') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

