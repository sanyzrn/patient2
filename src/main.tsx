import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/vazirmatn/300.css';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/700.css';
import '@fontsource/vazirmatn/900.css';
import './index.css';
import App from './App';

// PWA service worker registration
// @ts-ignore - virtual module provided by vite-plugin-pwa at build time
import('virtual:pwa-register').then(({ registerSW }) => {
  let triggerUpdate: ((reloadPage?: boolean) => void) | undefined;
  const updateSW = registerSW({
    onNeedRefresh() {
      window.dispatchEvent(
        new CustomEvent('nafas-sw-update', { detail: { update: () => triggerUpdate?.(true) } })
      );
    },
    onOfflineReady() {},
  });
  triggerUpdate = updateSW;
}).catch(() => {
  // PWA not available in development
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
