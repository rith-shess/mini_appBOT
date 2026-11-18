import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { TranslationProvider } from './hooks/useTranslation';
import { CartProvider } from './hooks/useCart';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TranslationProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </TranslationProvider>
  </React.StrictMode>
);
