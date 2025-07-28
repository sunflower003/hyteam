import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Set a timeout for requests
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => {
    console.log('API response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.config?.url, error.response?.data);

    // Only auto-logout for auth-related endpoints or when token is clearly invalid
    if (error.response?.status === 401) {
      const url = error.config?.url;
      
      // Don't auto-logout for profile-related operations - let component handle it
      if (url?.includes('/api/profile') || url?.includes('/api/auth/profile')) {
        console.log('Profile operation failed with 401, not auto-logging out');
        return Promise.reject(error);
      }
      
      console.log('Token expired, logging out ...');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
