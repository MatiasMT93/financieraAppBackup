import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../api/client.ts';
import { useAuthStore } from '../store/auth-store.ts';
import { BrandMark } from '../components/login/BrandMark.tsx';
import type { LoginResponse } from '@cambioapp/shared-types';
import './LoginPage.css';

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4.8 20a7.4 7.4 0 0 1 14.4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.2 10V7.6a3.8 3.8 0 0 1 7.6 0V10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.7" />
      {crossed && <path d="M4 4 20 20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />}
    </svg>
  );
}

export default function LoginPage() {
  const userId = useId();
  const passwordId = useId();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!usuario.trim() || !password) {
      setError('Ingresá tu usuario y contraseña para continuar.');
      return;
    }

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
    <main className="login-page">
      <div className="login-background-glow login-background-glow--left" aria-hidden="true" />
      <div className="login-background-glow login-background-glow--right" aria-hidden="true" />
      <div className="login-background-noise" aria-hidden="true" />
      <div className="login-background-waves" aria-hidden="true" />

      <section className="login-stage" aria-labelledby="login-title">
        <div className="login-card-ghost login-card-ghost--back" aria-hidden="true" />
        <div className="login-card-ghost login-card-ghost--front" aria-hidden="true" />

        <div className="login-card">
          <div className="login-card__frame" aria-hidden="true" />

          <header className="login-card__header">
            <BrandMark size={64} className="login-card__brand-mark" />
            <p className="login-card__brand-name">Fiber Plaza App</p>
            <span className="login-card__ornament" aria-hidden="true" />
            <h1 id="login-title">Iniciar sesión</h1>
            <p className="login-card__subtitle">Accedé al panel de control</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field-group">
              <label htmlFor={userId}>Usuario</label>
              <div className="login-field-shell">
                <span className="login-field-shell__icon"><UserIcon /></span>
                <input
                  id={userId}
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Ingresá tu usuario"
                  value={usuario}
                  onChange={(event) => setUsuario(event.target.value)}
                  aria-describedby={error ? 'login-error' : undefined}
                />
              </div>
            </div>

            <div className="login-field-group">
              <label htmlFor={passwordId}>Contraseña</label>
              <div className="login-field-shell">
                <span className="login-field-shell__icon"><LockIcon /></span>
                <input
                  id={passwordId}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Ingresá tu contraseña"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-describedby={error ? 'login-error' : undefined}
                />
                <button
                  className="login-password-toggle"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <EyeIcon crossed={showPassword} />
                </button>
              </div>
            </div>

            <div className="login-form-options">
              <label className="login-remember-option">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                <span className="login-custom-check" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none">
                    <path d="m3.5 8 3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>Recordarme</span>
              </label>
              <a href="#recuperar">¿Olvidaste tu contraseña?</a>
            </div>

            {error && (
              <p id="login-error" className="login-form-message login-form-message--error" role="alert">
                {error}
              </p>
            )}

            <button className="login-submit-button" type="submit" disabled={loading}>
              <span>{loading ? 'Validando…' : 'Ingresar'}</span>
              <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <path d="M4 14h18M16 7l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
