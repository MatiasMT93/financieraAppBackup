import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPost } from '../../shared/api/client.ts';
import { useAuthStore } from '../../shared/store/auth-store.ts';
import { PullToRefresh } from '../../shared/components/PullToRefresh.tsx';
import { BrandMark } from '../../shared/components/BrandMark.tsx';
import { WavePattern } from '../../shared/components/WavePattern.tsx';
import type { OwnerSummary, CurrencySummary } from '@cambioapp/shared-types';
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

const CURRENCY_NAMES: Record<string, string> = {
  ARS: 'Pesos — ARS',
  USD: 'Dolares — USD',
  EUR: 'Euros — EUR',
  BRL: 'Reales — BRL',
  USDT: 'Tether — USDT',
};

function MapIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="m7 12 11-5 12 5 11-5v29l-11 5-12-5-11 5V12Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M18 7v29M30 12v29" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="10" y="9" width="28" height="34" rx="4" stroke="currentColor" strokeWidth="2.2" />
      <rect x="17" y="5" width="14" height="9" rx="3" stroke="currentColor" strokeWidth="2.2" />
      <path d="M17 23h14M17 31h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="15" cy="23" r="1" fill="currentColor" />
      <circle cx="15" cy="31" r="1" fill="currentColor" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="m11 6 10 10-10 10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
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

function TrendIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.7" />
      <path d="m9 20 5-5 4 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 11h4v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M30 14c-1.6-2-4-3-7-3-4.4 0-8 2.4-8 6s3.2 5.2 8 6c4.8.8 8 2.4 8 6s-3.6 7-8.5 7c-3.3 0-6.2-1.2-8.2-3.5M23 6v36" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg className={open ? 'is-open' : ''} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="m8 12 8 8 8-8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CurrencyCard({ cs }: { cs: CurrencySummary }) {
  const [expanded, setExpanded] = useState(cs.currency === 'USD');
  const sym = CURRENCY_SYMBOLS[cs.currency] ?? cs.currency;

  return (
    <div className={`currency-card ${expanded ? 'is-open' : ''}`}>
      <button
        className="currency-card__summary"
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="currency-icon"><CurrencyIcon /></span>
        <span className="currency-copy">
          <strong>{sym} {CURRENCY_NAMES[cs.currency] ?? cs.currency}</strong>
          <small>Total movido: {sym} {Number(cs.totalMoved).toLocaleString('es-AR')} · {cs.totalOps} ops.</small>
        </span>
        <span className="currency-chevron"><ChevronDownIcon open={expanded} /></span>
      </button>
      <div className="currency-details" aria-hidden={!expanded}>
        <div><span>Comprados</span><strong>{sym} {Number(cs.comprado).toLocaleString('es-AR')}</strong></div>
        <div><span>Vendidos</span><strong>{sym} {Number(cs.vendido).toLocaleString('es-AR')}</strong></div>
        <div><span>Total</span><strong>{sym} {Number(cs.totalMoved).toLocaleString('es-AR')}</strong></div>
      </div>
    </div>
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
    }
  }

  const periods: Period[] = ['today', 'week', 'month'];

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div className="dashboard-header__network" aria-hidden="true">
          <WavePattern />
        </div>
        <div className="dashboard-brand">
          <BrandMark size={72} />
          <span>CambioApp</span>
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
            <span aria-hidden="true" />
          </div>

          <div className="role-grid">
            <button className="role-card role-card--coordinator" type="button" onClick={() => navigate('/dueno/coord')}>
              <WavePattern className="role-card__wave" />
              <span className="role-icon"><MapIcon /></span>
              <span className="role-copy">
                <strong>Coordinador</strong>
                <small>Asignar cadetes y seguir las entregas en tiempo real</small>
              </span>
              <span className="role-arrow"><ChevronRightIcon /></span>
            </button>

            <button className="role-card role-card--administrator" type="button" onClick={() => navigate('/dueno/admin')}>
              <WavePattern className="role-card__wave" />
              <span className="role-icon"><ClipboardIcon /></span>
              <span className="role-copy">
                <strong>Administrador</strong>
                <small>Cargar y gestionar las operaciones del día</small>
              </span>
              <span className="role-arrow"><ChevronRightIcon /></span>
            </button>
          </div>
        </section>

        <section className="summary-section" aria-labelledby="summary-heading">
          <div className="section-heading section-heading--compact">
            <h2 id="summary-heading">Resumen</h2>
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
            <article className="operations-card">
              <WavePattern className="operations-card__wave operations-card__wave--left" />
              <WavePattern className="operations-card__wave operations-card__wave--right" />
              <strong>{data?.totalOperations ?? 0}</strong>
              <p>operaciones realizadas {PERIOD_LABELS[period].toLowerCase()}</p>
            </article>
          )}
        </section>

        {!isLoading && data && (
          <section className="money-section" aria-labelledby="money-heading">
            <div className="section-heading section-heading--compact">
              <h2 id="money-heading">Dinero movido por moneda</h2>
            </div>

            {data.byCurrency.filter((c) => c.totalOps > 0).length === 0 && (
              <div className="empty-state">
                <TrendIcon />
                <p>Sin movimientos en este período</p>
              </div>
            )}

            <div className="currency-list">
              {data.byCurrency.map((cs) => (
                <CurrencyCard key={cs.currency} cs={cs} />
              ))}
            </div>
          </section>
        )}
      </PullToRefresh>
    </main>
  );
}
