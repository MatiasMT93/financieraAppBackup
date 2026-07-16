import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../shared/api/client.ts';
import StatusBadge from '../../../shared/components/StatusBadge.tsx';
import type { Operation } from '@cambioapp/shared-types';
import { formatDateTime } from '../../../shared/utils/format-time.ts';

export default function HistorialTab() {
  const [date, setDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }),
  );

  // No filtramos por status: el historial muestra todas las operaciones del
  // día (cerradas, canceladas, e incluso las que siguen en curso). Si filtraba
  // solo por 'cerrada', días con operaciones en curso o canceladas aparecían
  // vacíos. El StatusBadge ya muestra el estado de cada una.
  const { data: ops = [], isLoading } = useQuery({
    queryKey: ['operations-historial', date],
    queryFn: () => apiGet<Operation[]>('/operations', { date }),
  });

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      {isLoading && <p className="text-center text-gray-500">Buscando...</p>}

      <div className="space-y-2">
        {ops.length === 0 && !isLoading && (
          <p className="text-center text-gray-400 py-6">Sin operaciones para esta fecha</p>
        )}
        {ops.map((op) => (
          <div key={op.id} className="card space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sm">#{op.id.slice(-3).toUpperCase()}</span>
              <StatusBadge status={op.status} />
            </div>
            <p className="text-xs text-gray-400">{formatDateTime(op.createdAt)}</p>
            <p className="text-sm text-gray-600">📍 {op.direccion}</p>
            <p className="text-sm text-gray-800 font-medium">
              {op.tipo === 'entrega' ? 'Entregar' : 'Recibir'} {op.moneda} {Number(op.monto).toLocaleString('es-AR')}
            </p>
            {op.cadete && <p className="text-xs text-gray-400">Cadete: {op.cadete.nombre}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
