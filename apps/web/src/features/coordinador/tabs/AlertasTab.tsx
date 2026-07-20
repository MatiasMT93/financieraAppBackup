import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle } from 'lucide-react';
import { apiGet, apiPost } from '../../../shared/api/client.ts';
import { invalidateOperationsQueries } from '../../../shared/utils/invalidate-operations.ts';
import type { Incident } from '@cambioapp/shared-types';
import { AlertIcon, BellCheckIcon } from '../components/CoordIcons.tsx';

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
      invalidateOperationsQueries(qc);
      qc.invalidateQueries({ queryKey: ['cadetes'] });
      qc.invalidateQueries({ queryKey: ['locations'] });
    },
  });

  if (isLoading) return <div className="coord-empty-panel coord-empty-panel--compact"><p>Cargando…</p></div>;

  const active = data?.active ?? [];
  const resolved = data?.resolved ?? [];

  return (
    <>
      <article className="coord-summary-chip coord-summary-chip--wide coord-summary-chip--alert">
        <span className="coord-summary-chip__icon coord-summary-chip__icon--warning"><AlertIcon /></span>
        <span className="coord-summary-chip__label coord-summary-chip__label--large">Activas ({active.length})</span>
      </article>

      {active.length === 0 ? (
        <section className="coord-empty-panel coord-empty-panel--tall">
          <div className="coord-empty-panel__icon"><BellCheckIcon /></div>
          <h3>Sin incidencias activas</h3>
          <span className="coord-empty-panel__bar" aria-hidden="true" />
        </section>
      ) : (
        <div className="coord-stack-list">
          {active.map((inc) => (
            <article key={inc.id} className="coord-operation-card">
              <div className="coord-operation-card__main" style={{ gridTemplateColumns: '1fr' }}>
                <div className="coord-operation-card__body">
                  <div className="coord-operation-card__row coord-operation-card__row--top">
                    <h3 style={{ fontSize: 20 }}>{inc.cadete?.nombre}</h3>
                    <span className="coord-operation-card__age">
                      {new Date(inc.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: '#e8edf5', fontSize: 14 }}>{inc.descripcion}</p>
                  <div className="coord-operation-card__meta">📍 {inc.operation?.direccion}</div>
                  <div className="coord-operation-card__contact">
                    <button
                      type="button"
                      className="coord-assign-button"
                      onClick={() => resolve.mutate({ id: inc.id, action: 'resume' })}
                      disabled={resolve.isPending}
                    >
                      <CheckCircle size={16} />
                      Resolver
                    </button>
                    <button
                      type="button"
                      className="coord-assign-button coord-assign-button--danger"
                      onClick={() => {
                        if (confirm('¿Cancelar la operación? El cadete quedará liberado y la operación no se cobrará.')) {
                          resolve.mutate({ id: inc.id, action: 'cancel' });
                        }
                      }}
                      disabled={resolve.isPending}
                    >
                      <XCircle size={16} />
                      Cancelar operación
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <section>
          <div className="coord-section-title">Resueltas ({resolved.length})</div>
          <div className="coord-stack-list">
            {resolved.map((inc) => (
              <article key={inc.id} className="coord-operation-card" style={{ opacity: 0.6 }}>
                <div className="coord-operation-card__main" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="coord-operation-card__body">
                    <h3 style={{ fontSize: 16, margin: 0 }}>{inc.cadete?.nombre}</h3>
                    <p style={{ margin: 0, color: '#bcc3cd', fontSize: 13 }}>{inc.descripcion}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
