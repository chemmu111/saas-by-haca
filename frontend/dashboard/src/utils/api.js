/**
 * Get the backend API URL based on environment
 * @returns {string} Backend URL
 */
export const getBackendUrl = () => {
    // Check for environment variable first (production)
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // Development mode - Vite dev server
    if (window.location.port === '3000') {
        // Check localStorage for saved port, otherwise default to 5000
        const savedPort = localStorage.getItem('backend_port');
        if (savedPort) {
            return `http://localhost:${savedPort}`;
        }
        // Default to 5000 (your backend port)
        return 'http://localhost:5000';
    }

    // Fallback to same origin
    return window.location.origin;
};

/**
 * Build a full URL for an API endpoint
 * @param {string} endpoint - API endpoint path (e.g., '/api/posts')
 * @returns {string} Full URL
 */
export const buildApiUrl = (endpoint) => {
    const baseUrl = getBackendUrl();
    // Remove leading slash from endpoint if present to avoid double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
};
