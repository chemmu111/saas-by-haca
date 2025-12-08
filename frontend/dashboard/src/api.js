import axios from "axios";

// Helper function to get backend URL
const getBackendUrl = () => {
    // Check for environment variable first (production)
    if (import.meta.env.VITE_API_URL) {
        const url = import.meta.env.VITE_API_URL;
        return url.endsWith('/api') ? url : `${url}/api`;
    }
    // Development mode
    if (window.location.port === '3000') {
        const savedPort = localStorage.getItem('backend_port');
        return savedPort ? `http://localhost:${savedPort}/api` : 'http://localhost:5000/api';
    }
    // Fallback to same origin
    return '/api';
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
    (error) => {
        if (error.response?.status === 401 && error.response?.data?.code === "TOKEN_EXPIRED") {
            // Token expired or invalid
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user_info");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export default api;
