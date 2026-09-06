import { apiFetch } from '../api/client';

export interface AuthCredentials {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}

export const authService = {
  async login(credentials: AuthCredentials) {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.data));
    }
    return data;
  },

  async register(credentials: AuthCredentials) {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    return data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
};