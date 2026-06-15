import React from 'react';
import ReactDOM from 'react-dom/client';
import MobileApp from './MobileApp.jsx';
import './mobile.css';

ReactDOM.createRoot(document.getElementById('mobile-root')).render(
  <React.StrictMode>
    <MobileApp />
  </React.StrictMode>
);
