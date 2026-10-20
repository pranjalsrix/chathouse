
import axios from 'axios';

// Use the deployed backend in production and the Vite proxy locally
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || ''
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('chathouse_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
