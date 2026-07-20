import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Check } from 'lucide-react';
import { apiGet, apiPost } from '../../../shared/api/client.ts';
import { invalidateOperationsQueries } from '../../../shared/utils/invalidate-operations.ts';
import type { Operation, User } from '@cambioapp/shared-types';
import { useState } from 'react';

interface Props {
  operation: Operation;
  onClose: () => void;
  onAssigned: () => void;
}

export default function AssignModal({ operation, onClose, onAssigned }: Props) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState('');

  const isAssigned = operation.status === 'asignada';

  const { data: cadetes = [] } = useQuery({
    queryKey: ['cadetes'],
    queryFn: () => apiGet<User[]>('/users?role=cadete'),
  });

  const invalidate = () => invalidateOperationsQueries(qc);

  const assign = useMutation({
    mutationFn: (cadeteId: string) =>
      apiPost(`/operations/${operation.id}/assign`, { cadeteId }),
    onSuccess: () => { invalidate(); onAssigned(); },
  });

  const unassign = useMutation({
    mutationFn: () => apiPost(`/operations/${operation.id}/unassign`),
    onSuccess: () => { invalidate(); onAssigned(); },
  });

  const anyPending = assign.isPending || unassign.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md" style={{ color: '#111827' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">
            {isAssigned ? 'Reasignar cadete' : 'Asignar cadete'}
          </h2>
          <button onClick={onClose} disabled={anyPending}><X size={20} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">📍 {operation.direccion}</p>

        {/* Cadete actual + desasignar */}
        {isAssigned && operation.cadete && (
          <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-coordinador text-white flex items-center justify-center text-sm font-bold shrink-0">
                {operation.cadete.nombre[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{operation.cadete.nombre}</p>
                <p className="text-xs text-gray-400">Asignado actualmente</p>
              </div>
            </div>
            <button
              onClick={() => unassign.mutate()}
              disabled={anyPending}
              className="btn-secondary text-xs border-orange-200 text-orange-600 px-3 py-1.5"
            >
              {unassign.isPending ? 'Quitando...' : 'Desasignar'}
            </button>
          </div>
        )}

        <div className="space-y-2 mb-4">
          {isAssigned && (
            <p className="text-xs font-medium text-gray-500">Elegí otro cadete para reasignar:</p>
          )}
          {cadetes
            .filter((u: User) => u.role === 'cadete' && u.id !== operation.cadeteId)
            .map((c: User) => {
              // Un cadete con otra operación activa no está disponible: no se
              // le puede asignar una segunda hasta que termine/lo desasignen.
              const isBusy = (c.cadeteStatus ?? 'disponible') !== 'disponible';
              return (
                <button
                  key={c.id}
                  onClick={() => !isBusy && setSelectedId(c.id)}
                  disabled={isBusy}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    isBusy
                      ? 'border-gray-100 opacity-50 cursor-not-allowed'
                      : selectedId === c.id
                      ? 'border-coordinador bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-coordinador text-white flex items-center justify-center text-sm font-bold">
                        {c.nombre[0]}
                      </div>
                      <span className="font-medium">{c.nombre}</span>
                    </div>
                    {isBusy && <span className="text-xs text-gray-400">Ocupado</span>}
                  </div>
                </button>
              );
            })}
        </div>

        <button
          onClick={() => selectedId && assign.mutate(selectedId)}
          disabled={!selectedId || anyPending}
          className="btn-primary w-full bg-coordinador flex items-center justify-center gap-1"
        >
          <Check size={16} />
          {assign.isPending
            ? 'Guardando...'
            : isAssigned
            ? 'Confirmar reasignación'
            : 'Confirmar asignación'}
        </button>
        {(assign.isError || unassign.isError) && (
          <p className="text-sm text-red-600 mt-2 text-center">
            {((assign.error ?? unassign.error) as any)?.response?.data?.error ??
              'Error. Intentá de nuevo.'}
          </p>
        )}
      </div>
    </div>
  );
}
