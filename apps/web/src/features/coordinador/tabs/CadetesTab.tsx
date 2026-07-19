import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, MessageCircle, Send, Repeat } from 'lucide-react';
import { apiGet } from '../../../shared/api/client.ts';
import { invalidateOperationsQueries } from '../../../shared/utils/invalidate-operations.ts';
import CoordBadge from '../components/CoordBadge.tsx';
import AssignModal from '../components/AssignModal.tsx';
import { UsersIcon, PinIcon, PulseIcon } from '../components/CoordIcons.tsx';
import type { User, Operation, CadeteStatus } from '@cambioapp/shared-types';

const ACTIVE_STATUSES = 'asignada,en_camino,en_destino,volviendo';

function waLink(celular: string) {
  const n = celular.replace(/\D/g, '');
  return `https://wa.me/${n.startsWith('0') ? `549${n.slice(1)}` : `549${n}`}`;
}

export default function CadetesTab() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState(false);

  const { data: cadetes = [], isLoading } = useQuery({
    queryKey: ['cadetes'],
    queryFn: () => apiGet<User[]>('/users?role=cadete'),
    refetchInterval: 20_000,
  });

  const selected = cadetes.find((c) => c.id === selectedId) ?? cadetes[0] ?? null;

  const { data: activeOps = [] } = useQuery({
    queryKey: ['cadete-active-op', selected?.id],
    queryFn: () => apiGet<Operation[]>('/operations', { cadeteId: selected!.id, status: ACTIVE_STATUSES }),
    enabled: !!selected,
  });
  const activeOp = activeOps[0] ?? null;

  if (isLoading) return <div className="coord-empty-panel coord-empty-panel--compact"><p>Cargando…</p></div>;

  return (
    <div className="coord-split-page">
      <aside className="coord-list-panel">
        <h3><UsersIcon />{cadetes.length} cadetes</h3>
        <div className="coord-list-panel__scroll">
          {cadetes.length === 0 && <p className="coord-map-empty">No hay cadetes activos</p>}
          {cadetes.map((c) => (
            <button
              key={c.id}
              type="button"
              className={selected?.id === c.id ? 'is-selected' : ''}
              onClick={() => setSelectedId(c.id)}
            >
              <span className="coord-avatar coord-avatar--small is-gold">{c.nombre[0]}</span>
              <span><strong>{c.nombre}</strong><small>Cadete</small></span>
              <CoordBadge status={(c.cadeteStatus ?? 'disponible') as CadeteStatus} />
            </button>
          ))}
        </div>
      </aside>

      {selected && (
        <section className="coord-detail-panel">
          <div className="coord-cadet-hero">
            <span className="coord-avatar is-gold">{selected.nombre[0]}</span>
            <div><h2>{selected.nombre}</h2><p>Cadete</p></div>
            <CoordBadge status={(selected.cadeteStatus ?? 'disponible') as CadeteStatus} />
          </div>

          <div className="coord-contact-strip">
            <div>
              <Phone size={20} />
              <span>Teléfono<strong>{selected.celular ?? '—'}</strong></span>
            </div>
            <div>
              <PinIcon />
              <span>Destino actual<strong>{activeOp?.direccion ?? 'Sin operación activa'}</strong></span>
            </div>
            <div>
              <PulseIcon />
              <span>Estado<strong>{activeOp ? 'En operación' : 'Libre'}</strong></span>
            </div>
          </div>

          {activeOp && (
            <>
              <h3 className="coord-section-title"><PinIcon />Información y ruta</h3>
              <div className="coord-route-box">
                <div>
                  <PinIcon />
                  <span>Destino asignado<strong>{activeOp.direccion}</strong></span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeOp.direccion ?? '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver en mapa ↗
                  </a>
                </div>
                <div>
                  <PulseIcon />
                  <span>Operación<strong>#{activeOp.id.slice(-3).toUpperCase()} · {activeOp.tipo === 'entrega' ? 'Entrega' : activeOp.tipo === 'retiro' ? 'Retiro' : 'Entrega y Retiro'}</strong></span>
                </div>
                {activeOp.notas && (
                  <div>
                    <span>Notas<strong>{activeOp.notas}</strong></span>
                  </div>
                )}
              </div>
            </>
          )}

          <h3 className="coord-section-title">Acciones rápidas</h3>
          <div className="coord-quick-actions">
            {selected.celular ? (
              <>
                <a href={`tel:${selected.celular}`}><Phone size={18} />Llamar</a>
                <a href={waLink(selected.celular)} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} />WhatsApp</a>
              </>
            ) : (
              <span className="coord-quick-actions__empty">Sin teléfono cargado</span>
            )}
            <button type="button" onClick={() => navigate('../mapa')}><Send size={18} />Ver en mapa</button>
            {activeOp && (
              <button type="button" className="gold" onClick={() => setReassigning(true)}><Repeat size={18} />Reasignar</button>
            )}
          </div>
        </section>
      )}

      {reassigning && activeOp && (
        <AssignModal
          operation={activeOp}
          onClose={() => setReassigning(false)}
          onAssigned={() => {
            setReassigning(false);
            invalidateOperationsQueries(qc);
            qc.invalidateQueries({ queryKey: ['cadete-active-op'] });
          }}
        />
      )}
    </div>
  );
}
