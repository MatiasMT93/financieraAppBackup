import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, ChevronDown, ChevronUp, LogOut, Map, ClipboardList, ChevronRight } from 'lucide-react';
import { apiGet, apiPost } from '../../shared/api/client.ts';
import { useAuthStore } from '../../shared/store/auth-store.ts';
import { PullToRefresh } from '../../shared/components/PullToRefresh.tsx';
import type { OwnerSummary, CurrencySummary } from '@cambioapp/shared-types';

type Period = 'today' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  week: 'Semana',
  month: 'Mes',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  ARS: '$', USD: 'U$', EUR: '€', BRL: 'R$',
};

const CURRENCY_NAMES: Record<string, string> = {
  ARS: 'Pesos — ARS',
  USD: 'Dolares — USD',
  EUR: 'Euros — EUR',
  BRL: 'Reales — BRL',
};

function CurrencyCard({ cs }: { cs: CurrencySummary }) {
  const [expanded, setExpanded] = useState(cs.currency === 'USD');
  const sym = CURRENCY_SYMBOLS[cs.currency] ?? cs.currency;

  return (
    <div className="card">
      <button
        className="w-full flex items-center justify-between"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="text-left">
          <p className="font-semibold text-gray-900">
            {sym} {CURRENCY_NAMES[cs.currency]}
          </p>
          <p className="text-xs text-gray-400">
            Total movido: {sym} {Number(cs.totalMoved).toLocaleString('es-AR')} · {cs.totalOps} ops.
          </p>
        </div>
        {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="mt-3 border-t border-gray-100 pt-3 grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium uppercase">Comprados</p>
            <p className="text-lg font-bold text-gray-800">
              {sym} {Number(cs.comprado).toLocaleString('es-AR')}
            </p>
            <p className="text-xs text-gray-400">{cs.opComprado} ops.</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium uppercase">Vendidos</p>
            <p className="text-lg font-bold text-gray-800">
              {sym} {Number(cs.vendido).toLocaleString('es-AR')}
            </p>
            <p className="text-xs text-gray-400">{cs.opVendido} ops.</p>
          </div>
          <div className="col-span-2 border-t border-gray-100 pt-2 text-center">
            <p className="text-xs text-gray-500">TOTAL MOVIDO</p>
            <p className="text-xl font-bold text-gray-900">
              {sym} {Number(cs.totalMoved).toLocaleString('es-AR')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DuenoShell() {
  const [period, setPeriod] = useState<Period>('today');
  const { clearAuth, refreshToken } = useAuthStore();
  const navigate = useNavigate();

  const todayLabel = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date());

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

  return (
    <div className="flex flex-col h-viewport bg-gray-50">
      <header className="flex items-center justify-between px-4 py-3 text-white safe-area-pt shrink-0" style={{ backgroundColor: '#26215C' }}>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg" />
          <div>
            <span className="font-bold text-base">CambioApp</span>
            <p className="text-xs opacity-80">{todayLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-1 hover:opacity-80">
            <RefreshCw size={18} />
          </button>
          <button onClick={handleLogout} className="p-1 hover:opacity-80">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* El header queda fijo arriba; este wrapper toma el resto y scrollea
       *  el contenido interno cuando es más largo que la pantalla. */}
      <PullToRefresh className="flex-1 overflow-y-auto" onRefresh={async () => { await refetch(); }}>
      <div className="p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Cubrir un rol hoy
        </p>

        <button
          onClick={() => navigate('/dueno/coord')}
          className="w-full flex items-center gap-4 p-4 bg-white border-2 border-gray-100 rounded-2xl text-left active:opacity-80 transition-opacity"
        >
          <div className="w-14 h-14 rounded-xl bg-coordinador/10 flex items-center justify-center shrink-0">
            <Map size={28} className="text-coordinador" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900">Coordinador</p>
            <p className="text-sm text-gray-500 mt-0.5">Asignar cadetes y seguir las entregas en tiempo real</p>
          </div>
          <ChevronRight size={20} className="text-gray-300 shrink-0" />
        </button>

        <button
          onClick={() => navigate('/dueno/admin')}
          className="w-full flex items-center gap-4 p-4 bg-white border-2 border-gray-100 rounded-2xl text-left active:opacity-80 transition-opacity"
        >
          <div className="w-14 h-14 rounded-xl bg-administrativo/10 flex items-center justify-center shrink-0">
            <ClipboardList size={28} className="text-administrativo" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900">Administrador</p>
            <p className="text-sm text-gray-500 mt-0.5">Cargar y gestionar las operaciones del día</p>
          </div>
          <ChevronRight size={20} className="text-gray-300 shrink-0" />
        </button>
      </div>

      <div className="px-4 pb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Resumen</p>
      </div>

      <div className="px-4 pb-6 space-y-4">
        <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-white">
          {(['today', 'week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                period === p ? 'text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={period === p ? { backgroundColor: '#26215C' } : {}}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {isLoading && <div className="text-center text-gray-500 py-8">Cargando...</div>}

        {data && (
          <>
            <div className="card text-center py-6" style={{ borderLeft: '4px solid #26215C' }}>
              <div className="flex items-center justify-center gap-2 mb-1">
                <RefreshCw size={24} style={{ color: '#26215C' }} />
                <span className="text-5xl font-bold text-gray-900">{data.totalOperations}</span>
              </div>
              <p className="text-gray-500">
                operaciones realizadas {PERIOD_LABELS[period].toLowerCase()}
              </p>
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Dinero movido por moneda
            </p>

            {data.byCurrency.filter((c) => c.totalOps > 0).length === 0 && (
              <p className="text-center text-gray-400 py-4">Sin movimientos en este periodo</p>
            )}

            <div className="space-y-3">
              {data.byCurrency.map((cs) => (
                <CurrencyCard key={cs.currency} cs={cs} />
              ))}
            </div>
          </>
        )}
      </div>
      </PullToRefresh>
    </div>
  );
}
