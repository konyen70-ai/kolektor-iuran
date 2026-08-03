import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register and update PWA service worker with detailed logs
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA SW] New content available, please refresh.');
  },
  onOfflineReady() {
    console.log('[PWA SW] App is ready to work offline.');
  },
  onRegistered(r) {
    console.log('[PWA SW] Service Worker registered successfully:', r);
  },
  onRegisterError(error) {
    console.error('[PWA SW] Service Worker registration failed:', error);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
