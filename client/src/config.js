// src/config.js
export const getServerUrl = () => {
  // If running on localhost, use localhost:4000
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:4000';
  }
  // Otherwise use the same origin (works with ngrok)
  return window.location.origin;
};

export const SERVER_URL = getServerUrl();
export const API_BASE = `${SERVER_URL}/api`;
export const TOKEN_KEY = 'mychess_token';