const BASE_URL = import.meta.env.VITE_API_URL || '/api'; // Default to '/api' if not set in environment variables

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

