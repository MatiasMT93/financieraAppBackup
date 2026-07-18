import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../shared/api/client.ts';
import type { CashInStreet } from '@cambioapp/shared-types';

const CURRENCY_SYMBOLS: Record<string, string> = {
  ARS: '$', USD: 'U$', EUR: '€', BRL: 'R$', USDT: '₮',
};

const CURRENCY_FLAGS: Record<string, string> = {
  ARS: '🇦🇷', USD: '🇺🇸', EUR: '🇪🇺', BRL: '🇧🇷', USDT: '🟢',
};

export default function CajaTab() {
  const { data: cash = [], isLoading } = useQuery({
    queryKey: ['cash-in-street'],
    queryFn: () => apiGet<CashInStreet[]>('/owner/cash-in-street'),
    refetchInterval: 60_000,
  });

  if (isLoading) return <div className="p-4 text-center text-gray-500">Cargando...</div>;

  const hasAnything = cash.some((c) => c.total > 0);

  return (
    <div className="p-4 space-y-3">
      <p className="text-sm text-gray-500 font-medium">Dinero en calle ahora</p>
      {!hasAnything && (
        <p className="text-center text-gray-400 py-8">No hay operaciones activas</p>
      )}
      {cash.filter((c) => c.total > 0).map((c) => (
        <div key={c.currency} className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">
                {CURRENCY_SYMBOLS[c.currency]} {Number(c.total).toLocaleString('es-AR')} {c.currency}
              </p>
              <p className="text-xs text-gray-400">{c.operationCount} operaciones activas</p>
            </div>
            <div className="text-2xl">{CURRENCY_FLAGS[c.currency] ?? '💱'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
