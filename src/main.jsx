// ── Patch storage BEFORE anything else loads ──
(function patchStorage() {
  const fakeStorage = {
    getItem:      () => null,
    setItem:      () => {},
    removeItem:   () => {},
    clear:        () => {},
    key:          () => null,
    length:       0,
  };
  try { window.sessionStorage; }
  catch {
    Object.defineProperty(window, 'sessionStorage', {
      value: fakeStorage, writable: false, configurable: true,
    });
  }
  try { window.localStorage; }
  catch {
    Object.defineProperty(window, 'localStorage', {
      value: fakeStorage, writable: false, configurable: true,
    });
  }
})();

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Dismiss splash as soon as React has painted the first frame
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    if (typeof window.__dismissSplash === 'function') {
      window.__dismissSplash();
    }
  });
});