import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx'
import './index.css'

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);

try {
  root.render(
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </BrowserRouter>
  );
  console.log('✅ BUILD v9.1 - ErrorBoundary PER ROUTE (Production-Safe Pattern)');
  console.log('React app rendered successfully');
} catch (error) {
  console.error('Error rendering React app:', error);
  rootElement.innerHTML = `
      <div style="padding: 20px; font-family: Arial; background: #fee; border: 2px solid #f00;">
        <h1>Error Loading Application</h1>
        <p>${error.message}</p>
        <pre>${error.stack}</pre>
      </div>
    `;
}
