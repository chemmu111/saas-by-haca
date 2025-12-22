/**
 * Get the backend API URL based on environment
 * @returns {string} Backend URL
 */
export const getBackendUrl = () => {
    // 1. Force correct backend for custom domain (socialhac.com)
    if (window.location.hostname.includes('socialhac.com')) {
        return 'https://haca-social-x-backend.onrender.com';
    }

    // 2. Check for environment variable
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL.replace(/\/$/, '');
    }

    // 3. Development mode
    if (window.location.port === '3000' || window.location.port === '5173' || window.location.hostname === 'localhost') {
        const savedPort = localStorage.getItem('backend_port') || '5000';
        return `http://localhost:${savedPort}`;
    }

    // 4. Fallback
    return 'https://haca-social-x-backend.onrender.com';
};

/**
 * Build a full URL for an API endpoint
 * @param {string} endpoint - API endpoint path (e.g., '/api/posts')
 * @returns {string} Full URL
 */
export const buildApiUrl = (endpoint) => {
    const baseUrl = getBackendUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // If we have a baseUrl (production), combine them. 
    // If no baseUrl (local dev proxy), use the cleanEndpoint directly.
    return baseUrl ? `${baseUrl}${cleanEndpoint}` : cleanEndpoint;
};
