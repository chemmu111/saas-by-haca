import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
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
