import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPost } from '../../shared/api/client.ts';
import { useAuthStore } from '../../shared/store/auth-store.ts';
import { PullToRefresh } from '../../shared/components/PullToRefresh.tsx';
import { BrandMark } from '../../shared/components/BrandMark.tsx';
import { WavePattern } from '../../shared/components/WavePattern.tsx';
import type { OwnerSummary } from '@cambioapp/shared-types';
import './DuenoShell.css';

type Period = 'today' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  week: 'Semana',
  month: 'Mes',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  ARS: '$', USD: 'U$', EUR: '€', BRL: 'R$', USDT: '₮',
};

function CoordinatorIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M10 8h28v32H10z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M24 8v32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 14h8M16 20h8M16 26h8M32 14h4M32 20h4M32 26h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function AdministratorIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="12" y="10" width="24" height="28" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="17" y="6" width="14" height="8" rx="1" stroke="currentColor" strokeWidth="2" />
      <path d="M18 20h12M18 28h12M18 36h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="25" cy="20" r="1.5" fill="currentColor" />
      <circle cx="25" cy="28" r="1.5" fill="currentColor" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M13 6H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 10l6 6-6 6M11 16h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2" />
      <path d="M16 10v6M16 20v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M12 8l8 8-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DuenoShell() {
  const [period, setPeriod] = useState<Period>('today');
  const { clearAuth, refreshToken } = useAuthStore();
  const navigate = useNavigate();

  const dateLabel = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: '2-digit', month: 'long',
  }).format(new Date()).replace(/^./, (letter) => letter.toLowerCase());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['owner-summary', period],
    queryFn: () => apiGet<OwnerSummary>(`/owner/summary?period=${period}`),
    refetchInterval: 60_000,
  });

  async function handleLogout() {
    try {
      if (refreshToken) await apiPost('/auth/logout', { refreshToken });
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
    }
  }

  const periods: Period[] = ['today', 'week', 'month'];

  // Datos de alertas (simulados, puedes reemplazar con datos reales del backend)
  // Si el endpoint no los provee, usamos valores por defecto 0
  const alertasActivas = 0;
  const alertasResueltas = 0;
  const hayIncidencias = alertasActivas > 0;

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div className="dashboard-header__network" aria-hidden="true">
          <WavePattern />
        </div>
        <div className="dashboard-brand">
          <BrandMark size={72} />
          <span>Plaza App</span>
          <span className="dashboard-brand__divider" aria-hidden="true" />
          <time dateTime={new Date().toISOString().slice(0, 10)}>{dateLabel}</time>
        </div>
        <div className="dashboard-actions">
          <button className="icon-button" type="button" onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogoutIcon />
          </button>
        </div>
      </header>

      <PullToRefresh className="dashboard-content" onRefresh={async () => { await refetch(); }}>
        <section aria-labelledby="role-heading">
          <div className="section-heading">
            <h1 id="role-heading">Cubrir un rol hoy</h1>
          </div>

          <div className="role-grid">
            <button 
              className="role-card role-card--coordinator" 
              type="button" 
              onClick={() => navigate('/dueno/coord')}
            >
              <span className="role-icon"><CoordinatorIcon /></span>
              <div>
                <strong>Coordinador</strong>
                <small>Asignar cadetes y seguir entregas</small>
              </div>
              <span className="role-arrow">→</span>
            </button>

            <button 
              className="role-card role-card--administrator" 
              type="button" 
              onClick={() => navigate('/dueno/admin')}
            >
              <span className="role-icon"><AdministratorIcon /></span>
              <div>
                <strong>Administrador</strong>
                <small>Cargar y gestionar operaciones</small>
              </div>
              <span className="role-arrow">→</span>
            </button>
          </div>
        </section>

        <section className="summary-section" aria-labelledby="summary-heading">
          <div className="section-heading section-heading--compact">
            <h2 id="summary-heading">Resumen del Período</h2>
          </div>

          <div className="period-tabs" role="tablist" aria-label="Período del resumen">
            {periods.map((p) => (
              <button
                key={p}
                className={period === p ? 'is-active' : ''}
                type="button"
                role="tab"
                aria-selected={period === p}
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="loading-state"><p>Cargando…</p></div>
          ) : (
            <>
              <article className="operations-card">
                <WavePattern className="operations-card__wave operations-card__wave--left" />
                <WavePattern className="operations-card__wave operations-card__wave--right" />
                <strong>{data?.totalOperations ?? 0}</strong>
                <p>operaciones realizadas {PERIOD_LABELS[period].toLowerCase()}</p>
              </article>

              {/* CONTABILIDAD (balance, entradas, salidas) */}
              {data?.accounting && Object.keys(data.accounting).length > 0 && (
                <div className="accounting-grid">
                  {Object.entries(data.accounting).map(([currency, acc]) => {
                    const entradasReales = acc.salidas ?? 0;
                    const salidasReales = acc.entradas ?? 0;
                    const balanceNeto = entradasReales - salidasReales;
                    const sym = CURRENCY_SYMBOLS[currency] ?? currency;
                    const balanceColor = balanceNeto >= 0 ? '#10b981' : '#ef4444';
                    const balanceSign = balanceNeto >= 0 ? '+' : '';

                    return (
                      <div key={currency} className="accounting-card">
                        <small className="accounting-card-label">{currency}</small>
                        <div className="accounting-card-item">
                          <span>Balance Neto</span>
                          <strong style={{ color: balanceColor }}>
                            {balanceSign}{sym} {Math.abs(balanceNeto).toLocaleString('es-AR')}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', gap: '0.5rem' }}>
                          <span style={{ color: '#ff8a7a' }}>↓ {sym} {salidasReales.toLocaleString('es-AR')}</span>
                          <span style={{ color: '#4ADE80' }}>↑ {sym} {entradasReales.toLocaleString('es-AR')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ============================================================ */}
              {/* MINI PANEL DE ALERTAS (compacto, integrado) */}
              {/* ============================================================ */}
              {/* ============================================================ */}
              {/* MINI PANEL DE ALERTAS (mejorado visualmente) */}
              {/* ============================================================ */}
              <div className="alertas-mini-card">
                <div className="alertas-mini-header">
                  <div className="alertas-mini-title">
                    <AlertIcon />
                    <h3>Alertas</h3>
                  </div>
                </div>
                
                <div className="alertas-mini-stats">
                  <div className="stat-item active">
                    <span className="stat-number">{alertasActivas}</span>
                    <span className="stat-label">Activas</span>
                  </div>
                  <div className="stat-divider" />
                  <div className="stat-item resolved">
                    <span className="stat-number">{alertasResueltas}</span>
                    <span className="stat-label">Resueltas</span>
                  </div>
                </div>

                <div className={`alertas-mini-status ${hayIncidencias ? 'has-alerts' : 'all-clear'}`}>
                  {hayIncidencias ? (
                    <>
                      <span className="status-icon"></span>
                      <span>Hay incidencias activas que requieren atención</span>
                    </>
                  ) : (
                    <>
                      <span className="status-icon"></span>
                      <span>Sin incidencias activas</span>
                      <span className="status-sub">Todas las operaciones están en orden</span>
                    </>
                  )}
                </div>

                <div className="alertas-mini-footer">
                  <button
                    className="alertas-mini-link"
                    onClick={() => navigate('/dueno/coord/alertas')}
                  >
                    Ir a Coordinador <ChevronRightIcon />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </PullToRefresh>
    </main>
  );
}