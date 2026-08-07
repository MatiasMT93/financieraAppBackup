import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../shared/api/client.ts';
import type { Operation } from '@cambioapp/shared-types';

const CURRENCY_SYMBOLS: Record<string, string> = {
  ARS: '$', USD: 'U$', EUR: '€', BRL: 'R$', USDT: '₮',
};

const CURRENCY_FLAGS: Record<string, string> = {
  ARS: '🇦🇷', USD: '🇺🇸', EUR: '🇪🇺', BRL: '🇧🇷', USDT: '🟢',
};

const ACTIVE_STATUSES = new Set(['asignada', 'en_camino', 'en_destino', 'volviendo', 'incidencia', 'pendiente']);

export default function CajaTab() {
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });

  const { data: ops = [], isLoading } = useQuery({
    queryKey: ['operations-caja', todayStr],
    queryFn: () => apiGet<Operation[]>('/operations', { date: todayStr }),
    refetchInterval: 30_000,
  });

  const byCurrency = useMemo(() => {
    const map: Record<string, { total: number; activeCount: number; closedCount: number }> = {};

    const addLeg = (currency: string, amount: number, isClosed: boolean) => {
      if (!map[currency]) map[currency] = { total: 0, activeCount: 0, closedCount: 0 };
      map[currency].total += amount;
      if (isClosed) map[currency].closedCount++;
      else map[currency].activeCount++;
    };

    for (const op of ops) {
      if (op.status === 'cancelada') continue;
      const isClosed = op.status === 'cerrada';
      addLeg(op.moneda, Number(op.monto), isClosed);
      if (op.tipo === 'entrega_retiro' && op.moneda2 && op.monto2 != null) {
        addLeg(op.moneda2, Number(op.monto2), isClosed);
      }
    }

    return Object.entries(map)
      .filter(([, d]) => d.total > 0)
      .map(([currency, data]) => ({ currency, ...data }));
  }, [ops]);

  if (isLoading) return <div className="p-4 text-center text-gray-500">Cargando...</div>;

  const hasAnything = byCurrency.length > 0;

  return (
    <div className="p-4 space-y-3">
      <p className="text-sm text-gray-500 font-medium">Caja del día</p>
      {!hasAnything && (
        <p className="text-center text-gray-400 py-8">No hay operaciones registradas hoy</p>
      )}
      {byCurrency.map((c) => {
        const activeParts: string[] = [];
        if (c.activeCount > 0) activeParts.push(`${c.activeCount} en curso`);
        if (c.closedCount > 0) activeParts.push(`${c.closedCount} cerrada${c.closedCount !== 1 ? 's' : ''}`);
        return (
          <div key={c.currency} className="coord-cash-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="cash-amount">
                  {CURRENCY_SYMBOLS[c.currency]} {Number(c.total).toLocaleString('es-AR')} {c.currency}
                </p>
                <p className="cash-label">{activeParts.join(' · ')}</p>
              </div>
              <div className="text-2xl">{CURRENCY_FLAGS[c.currency] ?? '💱'}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
