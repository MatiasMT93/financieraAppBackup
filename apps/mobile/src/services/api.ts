import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        await clearSession();
        return Promise.reject(error);
      }
      try {
        const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken });
        await AsyncStorage.setItem('accessToken', data.data.accessToken);
        if (data.data.refreshToken) await AsyncStorage.setItem('refreshToken', data.data.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return apiClient(original);
      } catch {
        await clearSession();
      }
    }
    return Promise.reject(error);
  },
);

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiClient.post(path, body);
  return res.data.data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiClient.get(path);
  return res.data.data as T;
}
