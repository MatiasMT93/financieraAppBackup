import { STATUS_BADGE_COLORS } from '@cambioapp/shared-constants';
import type { OperationStatus } from '@cambioapp/shared-types';

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  asignada: 'Asignada',
  en_camino: 'En camino',
  en_destino: 'En destino',
  volviendo: 'Volviendo',
  cerrada: 'Cerrada',
  cancelada: 'Cancelada',
  incidencia: 'Incidencia',
  disponible: 'Disponible',
};

interface Props {
  status: OperationStatus | 'disponible';
  className?: string;
}

export default function StatusBadge({ status, className = '' }: Props) {
  const colors = STATUS_BADGE_COLORS[status as keyof typeof STATUS_BADGE_COLORS] ?? {
    bg: '#f3f4f6',
    text: '#374151',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
