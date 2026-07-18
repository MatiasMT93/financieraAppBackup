import type { OperationStatus, CadeteStatus } from '@cambioapp/shared-types';

type Status = OperationStatus | CadeteStatus;
type Variant = 'pending' | 'assigned' | 'onWay' | 'incident' | 'closed' | 'cancelled' | 'available';

const STATUS_META: Record<Status, { label: string; variant: Variant }> = {
  pendiente: { label: 'Pendiente', variant: 'pending' },
  asignada: { label: 'Asignada', variant: 'assigned' },
  en_camino: { label: 'En camino', variant: 'onWay' },
  en_destino: { label: 'En destino', variant: 'onWay' },
  volviendo: { label: 'Volviendo', variant: 'onWay' },
  cerrada: { label: 'Cerrada', variant: 'closed' },
  cancelada: { label: 'Cancelada', variant: 'cancelled' },
  incidencia: { label: 'Incidencia', variant: 'incident' },
  disponible: { label: 'Disponible', variant: 'available' },
};

const DOT_CLASS: Record<Variant, string> = {
  pending: 'status-dot--pending',
  assigned: 'status-dot--assigned',
  onWay: 'status-dot--onWay',
  incident: 'status-dot--incident',
  closed: 'status-dot--closed',
  cancelled: 'status-dot--empty',
  available: 'status-dot--available',
};

const BADGE_CLASS: Record<Variant, string> = {
  pending: 'is-pending',
  assigned: 'is-assigned',
  onWay: 'is-onway',
  incident: 'is-incident',
  closed: 'is-closed',
  cancelled: 'is-cancelled',
  available: 'is-available',
};

export default function CoordBadge({ status }: { status: Status | string }) {
  const meta = STATUS_META[status as Status] ?? { label: status, variant: 'pending' as Variant };
  return (
    <span className={`coord-badge ${BADGE_CLASS[meta.variant]}`}>
      <span className={`status-dot ${DOT_CLASS[meta.variant]}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
