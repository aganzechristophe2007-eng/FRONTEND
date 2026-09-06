import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext'; // 1. Importe le contexte
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider> {/* 2. Enveloppe App pour que tout le site sache qui est connecté */}
      <App />
    </AuthProvider>
  </React.StrictMode>
);