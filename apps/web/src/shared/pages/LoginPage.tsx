import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../api/client.ts';
import { useAuthStore } from '../store/auth-store.ts';
import { BrandMark } from '../components/login/BrandMark.tsx';
import { FeatureIcon } from '../components/login/FeatureIcon.tsx';
import { FlowNetwork } from '../components/login/FlowNetwork.tsx';
import type { LoginResponse } from '@cambioapp/shared-types';
import './LoginPage.css';

const features = [
  {
    icon: 'trace' as const,
    title: 'Trazabilidad',
    description: 'Seguimiento completo de cada movimiento.',
  },
  {
    icon: 'shield' as const,
    title: 'Seguridad operativa',
    description: 'Protocolos avanzados y datos protegidos.',
  },
  {
    icon: 'realtime' as const,
    title: 'Control en tiempo real',
    description: 'Información actualizada para decisiones rápidas.',
  },
];

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 14.5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.5" />
      {crossed && <path d="M4 4 20 20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />}
    </svg>
  );
}

function ShieldCheck() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M24 5 39 11v11c0 10-6.4 17-15 21-8.6-4-15-11-15-21V11l15-6Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="m17.5 23.5 4.5 4.5 8.5-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
    <div className="login-page">
      <div className="ambient ambient--top" aria-hidden="true" />
      <div className="ambient ambient--bottom" aria-hidden="true" />

      <section className="hero-panel" aria-labelledby="hero-title">
        <FlowNetwork />
        <div className="hero-vignette" aria-hidden="true" />

        <div className="hero-content">
          <header className="brand-lockup">
            <BrandMark size={102} />
            <span>Plaza App</span>
          </header>

          <div className="hero-copy">
            <span className="hero-divider" aria-hidden="true" />
            <h2 id="hero-title">
              Control total de los<br />
              movimientos <em>financieros</em>
            </h2>
            <p>
              Monitoreá, gestioná y controlá cada operación
              <br className="desktop-break" /> de la empresa con seguridad y precisión.
            </p>
          </div>

          <div className="feature-row" aria-label="Beneficios principales">
            {features.map((feature) => (
              <article className="feature-item" key={feature.title}>
                <FeatureIcon type={feature.icon} />
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="login-stage" aria-labelledby="login-title">
        <div className="rear-panel rear-panel--one" aria-hidden="true" />
        <div className="rear-panel rear-panel--two" aria-hidden="true" />

        <div className="login-panel">
          <div className="login-panel__cutline" aria-hidden="true" />

          <header className="login-header">
            <BrandMark size={62} className="login-brand-mark" />
            <p className="login-brand-name">Plaza App</p>
            <h1 id="login-title">Iniciar sesión</h1>
            <span className="title-ornament" aria-hidden="true" />
            <p className="login-subtitle">Accedé al panel de control</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="field-group">
              <label htmlFor={userId}>Usuario</label>
              <div className="field-shell">
                <span className="field-icon"><UserIcon /></span>
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

            <div className="field-group">
              <label htmlFor={passwordId}>Contraseña</label>
              <div className="field-shell">
                <span className="field-icon"><LockIcon /></span>
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
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <EyeIcon crossed={showPassword} />
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-option">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                <span className="custom-check" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none"><path d="m3.5 8 3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                Recordarme
              </label>
              <a href="#recuperar">¿Olvidaste tu contraseña?</a>
            </div>

            {error && <p id="login-error" className="form-message form-message--error" role="alert">{error}</p>}

            <button className="submit-button" type="submit" disabled={loading}>
              <span>{loading ? 'Validando…' : 'Ingresar'}</span>
              <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <path d="M4 14h18M16 7l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>

          <footer className="secure-note">
            <span className="secure-note__icon"><ShieldCheck /></span>
            <p>Tu información está protegida mediante encriptación.</p>
          </footer>
        </div>
      </section>
    </div>
  );
}
