const API_URL = import.meta.env.VITE_API_URL || 'https://cbfsoko-backend.onrender.com/api';

export async function apiFetch(endpoint: string, options: RequestInit = {}, retries = 3, delay = 2000): Promise<any> {
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {
    ...(token && { 'Authorization': 'Bearer ' + token }),
    ...(options.headers as Record<string, string> || {}),
  };

  // Ne pas forcer application/json si on envoie un FormData (multipart)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // Désactiver les retries automatiques si le corps est un FormData pour éviter l'épuisement du flux binaire
  const isFormData = options.body instanceof FormData;
  const currentRetries = isFormData ? 0 : retries;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok && [502, 503, 504].includes(response.status) && currentRetries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiFetch(endpoint, options, currentRetries - 1, delay * 2);
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      throw new Error(typeof data === 'object' && (data.message || data.error) ? (data.message || data.error) : 'Une erreur est survenue sur le serveur.');
    }

    return data;
  } catch (error: any) {
    if (currentRetries > 0 && (error.name === 'TypeError' || error.message?.includes('Failed to fetch') || error.message?.includes('protocol') || error.message?.includes('NetworkError'))) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiFetch(endpoint, options, currentRetries - 1, delay * 2);
    }
    throw error;
  }
}