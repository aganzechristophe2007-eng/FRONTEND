// src/api/client.ts
const API_URL = import.meta.env.VITE_API_URL || 'https://cbfsoko-backend.onrender.com/api';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(options.headers as Record<string, string> || {}),
  };

  // Ne pas forcer application/json si on envoie un FormData (multipart)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      throw new Error(data.message || data.error || 'Une erreur est survenue sur le serveur.');
    }

    return data;
  } catch (error: any) {
    throw error;
  }
}