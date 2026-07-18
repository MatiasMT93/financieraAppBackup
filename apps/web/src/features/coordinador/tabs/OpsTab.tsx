import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, UserCheck, AlertTriangle, Repeat } from 'lucide-react';
import { apiGet } from '../../../shared/api/client.ts';
import type { Operation } from '@cambioapp/shared-types';
import AssignModal from '../components/AssignModal.tsx';
import CoordBadge from '../components/CoordBadge.tsx';
import { OpsIcon, PulseIcon, MoneyIcon, CalendarIcon, PinIcon, TrendPlaceholder } from '../components/CoordIcons.tsx';
import { formatRelativeTime, formatDateTime } from '../../../shared/utils/format-time.ts';

const FILTERS = [
  { label: 'Todas', value: '' },
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'Asignadas', value: 'asignada' },
  // "En curso" agrupa los estados intermedios: el cadete está moviéndose o en
  // el destino. Antes filtraba solo por 'en_camino', dejando afuera a los que
  // ya habían llegado o estaban volviendo.
  { label: 'En curso', value: 'en_camino,en_destino,volviendo' },
  { label: 'Incidencias', value: 'incidencia' },
];

function formatMonto(op: Operation) {
  const sign = op.tipo === 'entrega' ? 'Entregar' : 'Recibir';
  const symbol = op.moneda === 'ARS' ? '$' : op.moneda === 'USD' ? 'U$' : op.moneda === 'EUR' ? '€' : op.moneda === 'BRL' ? 'R$' : '₮';
  return `${sign} ${symbol} ${Number(op.monto).toLocaleString('es-AR')} ${op.moneda}`;
}

export default function OpsTab() {
  const [filter, setFilter] = useState('');
  const [assigningOp, setAssigningOp] = useState<Operation | null>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: ops = [], isLoading } = useQuery({
    queryKey: ['operations', filter],
    queryFn: () => apiGet<Operation[]>('/operations', filter ? { status: filter } : {}),
    refetchInterval: 30_000,
  });

  // Métricas del día: query separada sin filtro de status para que siempre
  // refleje el total del día independientemente del filtro activo en la lista.
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  const { data: todayOps = [] } = useQuery({
    queryKey: ['operations', 'today-metrics', todayStr],
    queryFn: () => apiGet<Operation[]>('/operations', { date: todayStr }),
    refetchInterval: 30_000,
    staleTime: 30_000,
  });

  const cerradas = todayOps.filter((op) => op.status === 'cerrada').length;
  const enCurso = todayOps.filter((op) => !['cerrada', 'cancelada', 'pendiente'].includes(op.status)).length;
  const volumenARS = todayOps.filter((op) => op.moneda === 'ARS').reduce((sum, op) => sum + Number(op.monto), 0);

  if (isLoading) return <div className="coord-empty-panel coord-empty-panel--compact"><p>Cargando operaciones…</p></div>;

  return (
    <>
      <div className="coord-kpis coord-kpis--double">
        <article className="coord-kpi-card">
          <span className="coord-kpi-card__icon"><PulseIcon /></span>
          <div className="coord-kpi-card__content coord-kpi-card__content--centered">
            <strong>{todayOps.length}</strong>
            <p>Hoy</p>
            <small>{cerradas} cerradas · {enCurso} en curso</small>
          </div>
        </article>

        <article className="coord-kpi-card">
          <span className="coord-kpi-card__icon"><MoneyIcon /></span>
          <div className="coord-kpi-card__content coord-kpi-card__content--centered">
            <strong>${(volumenARS / 1_000_000).toFixed(1)}M</strong>
            <p>Volumen ARS</p>
            <small>hoy · solo pesos</small>
          </div>
        </article>
      </div>

      <div className="coord-filter-tabs" role="tablist" aria-label="Filtros de operaciones">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={filter === f.value}
            className={filter === f.value ? 'is-active' : ''}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="coord-stack-list">
        {ops.length === 0 && (
          <div className="coord-empty-panel coord-empty-panel--compact">
            <TrendPlaceholder />
            <h3>Sin operaciones</h3>
            <p>No hay operaciones registradas para este filtro.</p>
          </div>
        )}
        {ops.map((op) => (
          <OperationCard
            key={op.id}
            op={op}
            onAssign={() => setAssigningOp(op)}
            onViewIncident={() => navigate('../alertas')}
          />
        ))}
      </div>

      {assigningOp && (
        <AssignModal
          operation={assigningOp}
          onClose={() => setAssigningOp(null)}
          onAssigned={() => {
            setAssigningOp(null);
            qc.invalidateQueries({ queryKey: ['operations'] });
          }}
        />
      )}
    </>
  );
}

function OperationCard({
  op,
  onAssign,
  onViewIncident,
}: {
  op: Operation;
  onAssign: () => void;
  onViewIncident: () => void;
}) {
  return (
    <article className="coord-operation-card">
      <div className="coord-operation-card__main">
        <span className="coord-operation-card__icon"><OpsIcon /></span>
        <div className="coord-operation-card__body">
          <div className="coord-operation-card__row coord-operation-card__row--top">
            <h3>#{op.id.slice(-3).toUpperCase()}</h3>
            <span className="coord-operation-card__age" title={formatDateTime(op.createdAt)}>{formatRelativeTime(op.createdAt)}</span>
            <CoordBadge status={op.status} />
          </div>

          <div className="coord-operation-card__meta"><CalendarIcon />{formatDateTime(op.createdAt)}</div>
          {op.cadete && <div className="coord-operation-card__meta"><UsersIconInline />{op.cadete.nombre}</div>}
          <div className="coord-operation-card__meta"><PinIcon />{op.direccion}</div>
          <div className="coord-operation-card__amount"><MoneyIcon /><span>{formatMonto(op)}</span></div>

          <div className="coord-operation-card__contact">
            {op.status === 'pendiente' && (
              <button type="button" className="coord-assign-button" onClick={onAssign}>
                <UserCheck size={16} />
                Asignar cadete
              </button>
            )}
            {op.status === 'incidencia' && (
              <button type="button" className="coord-assign-button coord-assign-button--danger" onClick={onViewIncident}>
                <AlertTriangle size={16} />
                Ver incidencia
              </button>
            )}
            {op.status === 'asignada' && (
              <button type="button" className="coord-assign-button coord-assign-button--ghost" onClick={onAssign}>
                <Repeat size={16} />
                Reasignar
              </button>
            )}
          </div>

          {op.cadete?.celular && (
            <div className="coord-operation-card__contact">
              <a href={`tel:${op.cadete.celular}`} className="coord-contact-link coord-contact-link--call">
                <Phone size={15} />
                Llamar
              </a>
              <a
                href={`https://wa.me/${
                  (() => {
                    const n = op.cadete.celular.replace(/\D/g, '');
                    return n.startsWith('0') ? `549${n.slice(1)}` : `549${n}`;
                  })()
                }`}
                target="_blank"
                rel="noopener noreferrer"
                className="coord-contact-link coord-contact-link--wa"
              >
                <MessageCircle size={15} />
                WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function UsersIconInline() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="12" cy="11" r="4.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.5 25c1.5-4 4.4-6 7.5-6s6 2 7.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
