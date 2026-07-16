import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, UserCheck, AlertTriangle, Repeat } from 'lucide-react';
import { apiGet } from '../../../shared/api/client.ts';
import StatusBadge from '../../../shared/components/StatusBadge.tsx';
import type { Operation } from '@cambioapp/shared-types';
import AssignModal from '../components/AssignModal.tsx';
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
  const symbol = op.moneda === 'ARS' ? '$' : op.moneda === 'USD' ? 'U$' : op.moneda === 'EUR' ? '€' : 'R$';
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

  if (isLoading) return <div className="p-4 text-center text-gray-500">Cargando operaciones...</div>;

  return (
    <div className="p-4 space-y-4">
      {/* Metricas del dia */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-3xl font-bold text-coordinador">{todayOps.length}</p>
          <p className="text-xs text-gray-500 mt-1">Hoy</p>
          <p className="text-xs text-gray-400">{cerradas} cerradas · {enCurso} en curso</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-800">
            ${(volumenARS / 1_000_000).toFixed(1)}M
          </p>
          <p className="text-xs text-gray-500 mt-1">Volumen ARS</p>
          <p className="text-xs text-gray-400">hoy · solo pesos</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-coordinador text-white'
                : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {ops.length === 0 && (
          <p className="text-center text-gray-400 py-8">No hay operaciones</p>
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
    </div>
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
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-900">#{op.id.slice(-3).toUpperCase()}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400" title={formatDateTime(op.createdAt)}>
            {formatRelativeTime(op.createdAt)}
          </span>
          <StatusBadge status={op.status} />
        </div>
      </div>

      <p className="text-xs text-gray-400">{formatDateTime(op.createdAt)}</p>

      {op.cadete && (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-coordinador text-white flex items-center justify-center text-xs font-bold">
            {op.cadete.nombre[0]}
          </div>
          <span className="text-sm text-gray-600">{op.cadete.nombre}</span>
        </div>
      )}

      <div className="text-sm text-gray-600 flex items-start gap-1">
        <span>📍</span>
        <span>{op.direccion}</span>
      </div>
      <div className="text-sm font-medium text-gray-800">{formatMonto(op)}</div>

      <div className="flex gap-2 pt-1 flex-wrap">
        {op.status === 'pendiente' && (
          <button
            onClick={onAssign}
            className="btn-primary text-sm bg-coordinador flex items-center gap-1"
          >
            <UserCheck size={14} />
            Asignar cadete
          </button>
        )}
        {op.status === 'incidencia' && (
          <button
            onClick={onViewIncident}
            className="btn-secondary text-sm border-red-200 text-red-600 flex items-center gap-1"
          >
            <AlertTriangle size={14} />
            Ver incidencia
          </button>
        )}
        {op.status === 'asignada' && (
          <button
            onClick={onAssign}
            className="btn-secondary text-sm border-gray-200 text-gray-600 flex items-center gap-1 ml-auto"
          >
            <Repeat size={14} />
            Reasignar
          </button>
        )}
      </div>

      {op.cadete?.celular && (
        <div className="flex gap-2 pt-1">
          <a
            href={`tel:${op.cadete.celular}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
          >
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
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors"
          >
            <MessageCircle size={15} />
            WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
