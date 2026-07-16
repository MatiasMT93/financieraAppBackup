import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost, clearSession } from '../services/api';
import type { LoginResponse, User } from '@cambioapp/shared-types';

interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    loadStoredSession();
  }, []);

  async function loadStoredSession() {
    try {
      const stored = await AsyncStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        // Opcional: si el usuario almacenado no es cadete, lo sacamos
        if (user.role !== 'cadete') {
          await clearSession();
          setState({ user: null, loading: false });
          return;
        }
        setState({ user, loading: false });
      } else {
        setState({ user: null, loading: false });
      }
    } catch {
      setState({ user: null, loading: false });
    }
  }

  async function login(usuario: string, password: string): Promise<void> {
    const data = await apiPost<LoginResponse>('/auth/login', { usuario, password });

    // Validar que el usuario sea cadete
    if (data.user.role !== 'cadete') {
      throw new Error('Esta app es solo para cadetes. Usá la web si sos administrativo o coordinador.');
    }

    await AsyncStorage.multiSet([
      ['accessToken', data.accessToken],
      ['refreshToken', data.refreshToken],
      ['user', JSON.stringify(data.user)],
    ]);
    setState({ user: data.user, loading: false });
  }

  async function register(usuario: string, nombre: string, apellido: string, celular: string, password: string): Promise<void> {
  await apiPost('/auth/register', { usuario, nombre, apellido, celular, password });
}

  async function logout(): Promise<void> {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    try {
      if (refreshToken) await apiPost('/auth/logout', { refreshToken });
    } catch {}
    await clearSession();
    setState({ user: null, loading: false });
  }

  return {
    ...state,
    login,
    register,  // ← ¡AHORA SÍ SE EXPONE!
    logout,
  };
}