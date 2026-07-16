import axios from 'axios';
import { useAuthStore } from '../store/auth-store.ts';
import { updateSocketToken } from './socket.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Un único refresh compartido. Si varias requests reciben 401 a la vez (típico
// al abrir la app con varias queries en paralelo), todas esperan el MISMO
// refresh en vez de disparar uno cada una. El backend rota el refresh token en
// cada uso, así que un segundo refresh con el token viejo fallaría y desloguearía
// al usuario de forma intermitente.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken });
  const newToken: string = data.data.accessToken;
  const newRefresh: string = data.data.refreshToken ?? refreshToken;
  const user = useAuthStore.getState().user;
  if (!user) throw new Error('Sesión inconsistente: falta el usuario');
  useAuthStore.getState().setAuth(user, newToken, newRefresh);
  // El socket debe usar el token nuevo en el próximo handshake.
  updateSocketToken(newToken);
  return newToken;
}

function forceLogout() {
  useAuthStore.getState().clearAuth();
  window.location.href = '/login';
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const { refreshToken } = useAuthStore.getState();
      if (!refreshToken) {
        forceLogout();
        return Promise.reject(error);
      }
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken(refreshToken).finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch (e) {
        forceLogout();
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  },
);

export async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const res = await apiClient.get(path, { params });
  return res.data.data as T;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiClient.post(path, body);
  return res.data.data as T;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiClient.patch(path, body);
  return res.data.data as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await apiClient.delete(path);
  return res.data.data as T;
}
