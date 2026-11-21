const BASE_URL = import.meta.env.VITE_API_URL || ''; // Default to '/api' if not set in environment variables

export function getTokenExpiration(token) {
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decoded = JSON.parse(atob(padded));
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const expiration = getTokenExpiration(token);
  return expiration === null || Date.now() >= expiration;
}

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMsg = (data && data.error) || response.statusText || 'Request failed';
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;

    if (response.status === 401 && token) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.replace('/login');
    }

    throw error;
  }

  return data;
}

export const api = {
  // Auth
  signup: (email, password) =>
    apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email, password) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // Notes
  getNotes: () => apiRequest('/api/notes', { method: 'GET' }),

  getNote: (id) => apiRequest(`/api/notes/${id}`, { method: 'GET' }),

  createNote: (note) =>
    apiRequest('/api/notes', {
      method: 'POST',
      body: JSON.stringify(note),
    }),

  updateNote: (id, note) =>
    apiRequest(`/api/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(note),
    }),

  deleteNote: (id) =>
    apiRequest(`/api/notes/${id}`, {
      method: 'DELETE',
    }),
};

export default api;

