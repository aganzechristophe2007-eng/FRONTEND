const API_URL = import.meta.env.VITE_API_URL || 'https://cbfsoko-backend.onrender.com/api';

// Méthodes considérées "sûres à rejouer" en cas d'erreur réseau/serveur temporaire (502/503/504).
// On ne retry JAMAIS un POST/PATCH par défaut : rejouer un POST /cart ou /orders pourrait
// dupliquer une action (ajout au panier en double, commande en double, etc.).
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'PUT', 'DELETE']);

// Délai max avant d'abandonner une requête bloquée (le backend Render peut être lent au cold start,
// mais on évite qu'une requête reste "pending" indéfiniment côté client).
const DEFAULT_TIMEOUT_MS = 20000;

interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
}

class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Extrait un message d'erreur lisible depuis le corps de réponse du backend,
 * quel que soit le format utilisé ({ error: { message } } ou { message }).
 * Ne fait JAMAIS confiance à un champ qui ne serait pas une string (évite "[object Object]").
 */
function extractErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === 'string' && data.trim()) {
    return data;
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, any>;
    if (typeof obj.error === 'object' && obj.error !== null && typeof obj.error.message === 'string') {
      return obj.error.message;
    }
    if (typeof obj.message === 'string') {
      return obj.message;
    }
    if (typeof obj.error === 'string') {
      return obj.error;
    }
  }
  return fallback;
}

function buildUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_URL}${cleanEndpoint}`;
}

export async function apiFetch(
  endpoint: string,
  options: ApiFetchOptions = {},
  retries = 3,
  delay = 2000
): Promise<any> {
  const token = localStorage.getItem('token');
  const method = (options.method || 'GET').toUpperCase();
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...((options.headers as Record<string, string>) || {}),
  };

  // Ne jamais forcer application/json sur un FormData (multipart) : ça casse le boundary.
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = buildUrl(endpoint);

  // On ne retry jamais un FormData (flux binaire déjà consommé) ni une méthode non-idempotente
  // (POST/PATCH), pour éviter les doublons d'action (double ajout panier, double commande, etc.).
  const canRetry = !isFormData && IDEMPOTENT_METHODS.has(method);
  const currentRetries = canRetry ? retries : 0;

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok && [502, 503, 504].includes(response.status) && currentRetries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return apiFetch(endpoint, options, currentRetries - 1, delay * 2);
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    let data: unknown;
    try {
      data = contentType.includes('application/json')
        ? await response.json()
        : await response.text();
    } catch {
      // Réponse illisible/corrompue : on ne casse pas silencieusement, mais on ne
      // fait pas confiance à un corps qu'on n'a pas réussi à parser.
      data = null;
    }

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('offline_avatar');
        // Évite une boucle de redirection si on est déjà sur /login.
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }

      const message = extractErrorMessage(data, 'Une erreur est survenue sur le serveur.');
      const code = data && typeof data === 'object' ? (data as any)?.error?.code ?? (data as any)?.code : undefined;
      throw new ApiError(message, response.status, code);
    }

    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error?.name === 'AbortError') {
      throw new ApiError('La requête a expiré, réessayez.', 0, 'TIMEOUT');
    }

    const isNetworkError =
      error?.name === 'TypeError' ||
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('NetworkError');

    if (currentRetries > 0 && isNetworkError) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return apiFetch(endpoint, options, currentRetries - 1, delay * 2);
    }

    throw error;
  }
}

export { ApiError };