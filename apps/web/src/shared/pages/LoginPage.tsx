import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../api/client.ts';
import { useAuthStore } from '../store/auth-store.ts';
import type { LoginResponse } from '@cambioapp/shared-types';

export default function LoginPage() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiPost<LoginResponse>('/auth/login', { usuario, password });
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <img
        src="/Fondo/Fondo1.png"
        alt="Fondo del panel"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 hero-overlay"></div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">
        <div className="max-w-3xl">
          <h1 className="anim-1 text-5xl sm:text-7xl font-black tracking-tight text-white drop-shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
            FinancieraApp
          </h1>
          <p className="anim-2 mt-4 text-sm uppercase tracking-[0.35em] text-slate-200">
            Panel Gerencial
          </p>
        </div>

        <div className="anim-3 mt-10 w-full max-w-md rounded-[36px] border border-white/10 bg-white/90 p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-[0.15em] mb-2">
                Usuario
              </label>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-administrativo focus:ring-2 focus:ring-administrativo/20"
                placeholder="Tu nombre de usuario"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-[0.15em] mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-administrativo focus:ring-2 focus:ring-administrativo/20"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="rounded-3xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-administrativo px-6 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-administrativo/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Ingresando...' : 'Ingresar al Panel'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
