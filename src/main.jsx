import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '@shopify/polaris/build/esm/styles.css';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
