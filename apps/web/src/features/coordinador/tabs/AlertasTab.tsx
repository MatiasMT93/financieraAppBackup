import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { apiGet, apiPost } from '../../../shared/api/client.ts';
import type { Incident } from '@cambioapp/shared-types';

type ResolveAction = 'resume' | 'cancel';

export default function AlertasTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => apiGet<{ active: Incident[]; resolved: Incident[] }>('/incidents'),
    refetchInterval: 30_000,
  });

  const resolve = useMutation({
    mutationFn: ({ id, action }: { id: string; action: ResolveAction }) =>
      apiPost(`/incidents/${id}/resolve`, { action }),
    onSuccess: () => {
      // Refrescamos varios queries porque resolver la incidencia también cambia
      // el estado de la operación y del cadete (que se ve en el mapa y en la
      // lista de cadetes).
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['operations'] });
      qc.invalidateQueries({ queryKey: ['cadetes'] });
      qc.invalidateQueries({ queryKey: ['locations'] });
    },
  });

  if (isLoading) return <div className="p-4 text-center text-gray-500">Cargando...</div>;

  const active = data?.active ?? [];
  const resolved = data?.resolved ?? [];

  return (
    <div className="p-4 space-y-4">
      <section>
        <h2 className="font-semibold text-gray-700 mb-2 flex items-center gap-1">
          <AlertTriangle size={16} className="text-red-500" />
          Activas ({active.length})
        </h2>
        {active.length === 0 && <p className="text-sm text-gray-400">Sin incidencias activas</p>}
        {active.map((inc) => (
          <div key={inc.id} className="card border-l-4 border-red-400 space-y-2 mb-2">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-gray-900">{inc.cadete?.nombre}</p>
              <span className="text-xs text-gray-400">
                {new Date(inc.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm text-gray-600">{inc.descripcion}</p>
            <p className="text-xs text-gray-400">📍 {inc.operation?.direccion}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => resolve.mutate({ id: inc.id, action: 'resume' })}
                disabled={resolve.isPending}
                className="btn-primary text-sm bg-coordinador flex items-center gap-1"
              >
                <CheckCircle size={14} />
                Resolver
              </button>
              <button
                onClick={() => {
                  if (confirm('¿Cancelar la operación? El cadete quedará liberado y la operación no se cobrará.')) {
                    resolve.mutate({ id: inc.id, action: 'cancel' });
                  }
                }}
                disabled={resolve.isPending}
                className="text-sm px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-1 disabled:opacity-50"
              >
                <XCircle size={14} />
                Cancelar operación
              </button>
            </div>
          </div>
        ))}
      </section>

      {resolved.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-500 mb-2 text-sm">Resueltas ({resolved.length})</h2>
          {resolved.map((inc) => (
            <div key={inc.id} className="card opacity-60 space-y-1 mb-2">
              <p className="text-sm font-medium">{inc.cadete?.nombre}</p>
              <p className="text-xs text-gray-500">{inc.descripcion}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
