import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/admin.css';

// Hydrate the app (client-side rendering after SSR)
const rootElement = document.getElementById('root');

if (rootElement) {
  // Get initial data passed from server
  const initialData = (window as any).__INITIAL_DATA__;

  hydrateRoot(
    rootElement,
    <React.StrictMode>
      <BrowserRouter>
        <App initialData={initialData} />
      </BrowserRouter>
    </React.StrictMode>
  );
}
