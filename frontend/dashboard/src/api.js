import axios from "axios";

// Helper function to get backend URL
const getBackendUrl = () => {
    // 1. Check for environment variable first (highest priority)
    if (import.meta.env.VITE_API_URL) {
        const url = import.meta.env.VITE_API_URL.replace(/\/$/, '');
        const isSelfReferential = url.includes(window.location.host) && !url.includes('localhost');

        if (!isSelfReferential) {
            return url.endsWith('/api') ? url : `${url}/api`;
        }
        console.warn('VITE_API_URL appears to point to the frontend host. Falling back...');
    }

    // 2. Development mode - check common dev ports
    // Also check if we are on localhost even without these ports
    const isLocal = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.port === '3000' ||
        window.location.port === '5173';

    if (isLocal) {
        const savedPort = localStorage.getItem('backend_port');
        const port = savedPort || '5000';
        return 'http://localhost:5001/api';
    }

    // 3. Force correct backend for custom domain (socialhac.com)
    // Only if not explicitly on a local dev setup
    if (window.location.hostname.includes('socialhac.com')) {
        return 'https://haca-social-x-backend.onrender.com/api';
    }

    // 4. Production fallback
    const fallbackUrl = 'https://haca-social-x-backend.onrender.com/api';
    console.log('⚠️ using fallback URL (Axios):', fallbackUrl);
    return fallbackUrl;
};

const api = axios.create({
    baseURL: getBackendUrl(),
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("auth_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Prevent infinite loop if refresh token itself is expired
            if (originalRequest.url.includes('/auth/refresh-token')) {
                localStorage.removeItem("auth_token");
                localStorage.removeItem("refresh_token");
                localStorage.removeItem("user_info");
                window.location.href = "/login";
                return Promise.reject(error);
            }

            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');

            if (refreshToken) {
                try {
                    // Use api instance to respect baseURL, but handle the specific endpoint fail via the check above
                    const response = await api.post('/auth/refresh-token', {
                        refreshToken: refreshToken
                    });

                    if (response.data.token) {
                        localStorage.setItem('auth_token', response.data.token);
                        if (response.data.refreshToken) {
                            localStorage.setItem('refresh_token', response.data.refreshToken);
                        }

                        // Update header and retry original request
                        originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
                        return api(originalRequest);
                    }
                } catch (refreshError) {
                    console.error("Token refresh failed:", refreshError);
                    // If refresh failed, LOGOUT
                    localStorage.removeItem("auth_token");
                    localStorage.removeItem("refresh_token");
                    localStorage.removeItem("user_info");
                    window.location.href = "/login";
                    return Promise.reject(refreshError);
                }
            } else {
                // No refresh token available, logout
                localStorage.removeItem("auth_token");
                localStorage.removeItem("refresh_token");
                localStorage.removeItem("user_info");
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default api;
