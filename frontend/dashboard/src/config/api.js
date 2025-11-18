/**
 * Centralized API configuration
 * 
 * Backend URL configuration:
 * - Development: Uses localhost:5000 (or saved port from localStorage)
 * - Production: Uses VITE_BACKEND_URL environment variable or defaults to Render URL
 * 
 * To configure the backend URL:
 * 1. Create a .env file in frontend/dashboard/ with: VITE_BACKEND_URL=https://saas-by-haca-backend.onrender.com
 * 2. Or set it in your deployment platform's environment variables
 */

/**
 * Get the backend API URL based on the current environment
 * @returns {string} The backend URL
 */
export const getBackendUrl = () => {
  // If accessing via ngrok, always use localhost:5000 for backend
  if (window.location.hostname.includes('ngrok')) {
    const savedPort = localStorage.getItem('backend_port');
    if (savedPort) {
      return `http://localhost:${savedPort}`;
    }
    return 'http://localhost:5000';
  }
  
  // In development, try to detect the backend port
  if (window.location.port === '3000' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Vite dev server - try backend ports 5000 (standard) or 5001 (fallback)
    // Check localStorage for saved port, otherwise default to 5000
    const savedPort = localStorage.getItem('backend_port');
    if (savedPort) {
      return `http://localhost:${savedPort}`;
    }
    // Default to 5000 (backend standard port)
    return 'http://localhost:5000';
  }
  
  // Production: use environment variable if set, otherwise use Render URL, fallback to same origin
  const envBackendUrl = import.meta.env.VITE_BACKEND_URL;
  if (envBackendUrl) {
    return envBackendUrl;
  }
  
  // Default production backend URL (Render)
  return 'https://saas-by-haca-backend.onrender.com';
};

