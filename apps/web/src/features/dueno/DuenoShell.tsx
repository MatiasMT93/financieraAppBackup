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

function CurrencyTableRow({ cs, onSelect }: { cs: CurrencySummary; onSelect: (currency: string) => void }) {
  const sym = CURRENCY_SYMBOLS[cs.currency] ?? cs.currency;

  return (
    <tr className="currency-row" onClick={() => onSelect(cs.currency)}>
      <td className="currency-name">
        <span className="currency-badge">{cs.currency}</span>
        <span className="currency-label">{CURRENCY_NAMES[cs.currency] ?? cs.currency}</span>
      </td>
      <td className="currency-data">
        <span className="data-label">Total Movido</span>
        <span className="data-value">{sym} {Number(cs.totalMoved).toLocaleString('es-AR')}</span>
      </td>
      <td className="currency-data">
        <span className="data-label">Comprados</span>
        <span className="data-value">{sym} {Number(cs.comprado).toLocaleString('es-AR')}</span>
      </td>
      <td className="currency-data">
        <span className="data-label">Vendidos</span>
        <span className="data-value">{sym} {Number(cs.vendido).toLocaleString('es-AR')}</span>
      </td>
      <td className="currency-ops">{cs.totalOps} ops</td>
    </tr>
  );
}

export default function DuenoShell() {
  const [period, setPeriod] = useState<Period>('today');
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
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
          <span>Fiber Plaza App</span>
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

              {/* NUEVO: Resumen de Contabilidad */}
              {data?.accounting && Object.keys(data.accounting).length > 0 && (
                <div className="accounting-grid">
                  {Object.entries(data.accounting).map(([currency, acc]) => (
                    <div key={currency} className="accounting-card">
                      <small className="accounting-card-label">{currency}</small>
                      <div className="accounting-card-item">
                        <span>Balance</span>
                        <strong style={{ color: acc.balance >= 0 ? '#10b981' : '#ef4444' }}>
                          {CURRENCY_SYMBOLS[currency]} {acc.balance.toLocaleString('es-AR')}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', gap: '0.5rem' }}>
                        <span>↓ {CURRENCY_SYMBOLS[currency]} {acc.salidas.toLocaleString('es-AR')}</span>
                        <span>↑ {CURRENCY_SYMBOLS[currency]} {acc.entradas.toLocaleString('es-AR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
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

            {data.byCurrency.some((c) => c.totalOps > 0) && (
              <div className="currency-table-wrapper">
                <table className="currency-table">
                  <thead>
                    <tr>
                      <th>Moneda</th>
                      <th>Total Movido</th>
                      <th>Comprados</th>
                      <th>Vendidos</th>
                      <th>Operaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCurrency
                      .filter((c) => c.totalOps > 0)
                      .map((cs) => (
                        <CurrencyTableRow
                          key={cs.currency}
                          cs={cs}
                          onSelect={setSelectedCurrency}
                        />
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedCurrency && (
              <div className="currency-detail-modal-overlay" onClick={() => setSelectedCurrency(null)}>
                <div className="currency-detail-modal" onClick={(e) => e.stopPropagation()}>
                  <button className="modal-close" onClick={() => setSelectedCurrency(null)}>✕</button>
                  {data.byCurrency
                    .filter((c) => c.currency === selectedCurrency)
                    .map((cs) => {
                      const sym = CURRENCY_SYMBOLS[cs.currency] ?? cs.currency;
                      const totalMoved = cs.totalMoved;
                      const ratio = cs.comprado > 0 ? (cs.vendido / cs.comprado) : 0;
                      const accounting = data.accounting?.[cs.currency];
                      const balance = accounting?.balance ?? 0;
                      const promedioDiario = accounting?.promedioDiario ?? 0;
                      const ratioEntradaSalida = accounting?.ratioEntradaSalida ?? 0;
                      const dias = accounting?.dias ?? 0;
                      const velocidadMovimiento = dias > 0 ? totalMoved / dias : 0;
                      const balanceStatus = balance >= 0 ? 'positive' : 'negative';
                      
                      return (
                        <div key={cs.currency} className="modal-content">
                          <div className="modal-header">
                            <span className="badge">{cs.currency}</span>
                            <h3>{CURRENCY_NAMES[cs.currency] ?? cs.currency}</h3>
                          </div>
                          <div className="modal-stats">
                            <div className="stat-row">
                              <span className="stat-label">Balance Total</span>
                              <span className={`stat-value large ${balanceStatus}`}>
                                {sym} {Math.abs(balance).toLocaleString('es-AR')}
                              </span>
                            </div>
                            <div className="stat-row">
                              <span className="stat-label">Total Movido</span>
                              <span className="stat-value large">{sym} {totalMoved.toLocaleString('es-AR')}</span>
                            </div>
                            <div className="stat-grid">
                              <div className="stat-card">
                                <span className="stat-label">Comprados</span>
                                <span className="stat-value buy">{sym} {cs.comprado.toLocaleString('es-AR')}</span>
                              </div>
                              <div className="stat-card">
                                <span className="stat-label">Vendidos</span>
                                <span className="stat-value sell">{sym} {cs.vendido.toLocaleString('es-AR')}</span>
                              </div>
                              <div className="stat-card">
                                <span className="stat-label">Operaciones</span>
                                <span className="stat-value">{cs.totalOps}</span>
                              </div>
                              <div className="stat-card">
                                <span className="stat-label">Ratio V/C</span>
                                <span className="stat-value">{ratio.toFixed(2)}x</span>
                              </div>
                              <div className="stat-card">
                                <span className="stat-label">Promedio Diario</span>
                                <span className="stat-value">{sym} {promedioDiario.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                              </div>
                              <div className="stat-card">
                                <span className="stat-label">Velocidad Movimiento</span>
                                <span className="stat-value">{sym} {velocidadMovimiento.toLocaleString('es-AR', { maximumFractionDigits: 0 })}/día</span>
                              </div>
                              <div className="stat-card">
                                <span className="stat-label">Ratio Entrada/Salida</span>
                                <span className="stat-value">{ratioEntradaSalida.toFixed(2)}x</span>
                              </div>
                              <div className="stat-card">
                                <span className="stat-label">Período</span>
                                <span className="stat-value">{dias} {dias === 1 ? 'día' : 'días'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </section>
        )}
      </PullToRefresh>
    </main>
  );
}
