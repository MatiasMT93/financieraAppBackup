import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, X, Check, RefreshCw } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '../../../shared/api/client.ts';
import StatusBadge from '../../../shared/components/StatusBadge.tsx';
import type { Operation } from '@cambioapp/shared-types';
import { CANCELLABLE_STATUSES, EDITABLE_STATUSES } from '@cambioapp/shared-constants';

const FILTERS = [
  { label: 'Todas', value: '' },
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'En curso', value: 'en_camino,en_destino,volviendo' },
  { label: 'Cerradas', value: 'cerrada' },
];

const TIPOS = ['entrega', 'retiro'] as const;
const MONEDAS = ['ARS', 'USD', 'EUR', 'BRL'] as const;

interface EditForm {
  tipo: string;
  moneda: string;
  monto: string;
  direccion: string;
  contacto: string;
  telefono: string;
  notas: string;
}

function EmptyIllustration() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="15" width="68" height="52" rx="5" fill="#E8F5F0" stroke="#0F6E56" strokeWidth="1.5" />
      <rect x="5" y="15" width="68" height="12" rx="5" fill="#C5E3DA" stroke="#0F6E56" strokeWidth="1.5" />
      <rect x="28" y="67" width="22" height="5" fill="#C5E3DA" />
      <rect x="21" y="72" width="36" height="3" rx="1.5" fill="#C5E3DA" />
      <polyline points="15,52 28,40 42,48 55,30 67,40" stroke="#0F6E56" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="56" y="52" width="50" height="50" rx="7" fill="white" stroke="#0F6E56" strokeWidth="1.5" />
      <rect x="56" y="52" width="50" height="17" rx="7" fill="#C5E3DA" stroke="#0F6E56" strokeWidth="1.5" />
      <rect x="62" y="75" width="8" height="8" rx="2" fill="#E8F5F0" />
      <rect x="75" y="75" width="8" height="8" rx="2" fill="#E8F5F0" />
      <rect x="88" y="75" width="8" height="8" rx="2" fill="#E8F5F0" />
      <rect x="62" y="88" width="8" height="8" rx="2" fill="#E8F5F0" />
      <rect x="75" y="88" width="8" height="8" rx="2" fill="#0F6E56" opacity="0.25" />
      <rect x="88" y="88" width="8" height="8" rx="2" fill="#E8F5F0" />
    </svg>
  );
}

function EditModal({ op, onClose, onSaved }: { op: Operation; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<EditForm>({
    tipo: op.tipo,
    moneda: op.moneda,
    monto: String(op.monto),
    direccion: op.direccion,
    contacto: op.contacto,
    telefono: op.telefono ?? '',
    notas: op.notas ?? '',
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiPatch(`/operations/${op.id}`, {
        tipo: form.tipo,
        moneda: form.moneda,
        monto: parseFloat(form.monto),
        direccion: form.direccion,
        contacto: form.contacto,
        telefono: form.telefono || undefined,
        notas: form.notas || undefined,
      }),
    onSuccess: onSaved,
  });

  function set(field: keyof EditForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const isValid = parseFloat(form.monto) > 0 && form.direccion.length >= 3 && form.contacto.length >= 2;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Editar operación #{op.id.slice(-3).toUpperCase()}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => set('tipo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {TIPOS.map((t) => <option key={t} value={t}>{t === 'entrega' ? 'Entrega' : 'Retiro'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Moneda</label>
              <select
                value={form.moneda}
                onChange={(e) => set('moneda', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {MONEDAS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {([
            { field: 'monto', label: 'Monto', type: 'number' },
            { field: 'direccion', label: 'Dirección', type: 'text' },
            { field: 'contacto', label: 'Contacto', type: 'text' },
            { field: 'telefono', label: 'Teléfono (opcional)', type: 'tel' },
            { field: 'notas', label: 'Notas (opcional)', type: 'text' },
          ] as const).map(({ field, label, type }) => (
            <div key={field}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type}
                value={form[field]}
                onChange={(e) => set(field, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-administrativo"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
            className="btn-primary flex-1 bg-administrativo flex items-center justify-center gap-1"
          >
            <Check size={16} />
            {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button onClick={onClose} className="btn-secondary border-gray-300 text-gray-600 px-4">
            Cancelar
          </button>
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-600 mt-2 text-center">Error al guardar. Intentá de nuevo.</p>
        )}
      </div>
    </div>
  );
}

export default function OpsAdminTab() {
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingOp, setEditingOp] = useState<Operation | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const todayLabel = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date());

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

  // Las cerradas se limitan a hoy para no traer todo el historial.
  // El resto (activas) no tienen filtro de fecha: una operación de ayer que
  // sigue en_destino debe aparecer para que el admin pueda gestionarla.
  const isClosedFilter = filter === 'cerrada';

  const { data: ops = [], isLoading } = useQuery({
    queryKey: ['operations-admin', filter, isClosedFilter ? today : 'all'],
    queryFn: () =>
      apiGet<Operation[]>('/operations', {
        ...(filter ? { status: filter } : {}),
        ...(isClosedFilter ? { date: today } : {}),
      }),
    refetchInterval: 30_000,
  });

  const [cancelingOpId, setCancelingOpId] = useState<string | null>(null);

  const cancel = useMutation({
    mutationFn: (id: string) => apiPost(`/operations/${id}/cancel`),
    onMutate: (id: string) => {
      setCancelingOpId(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations-admin', filter, isClosedFilter ? today : 'all'] });
      qc.invalidateQueries({ queryKey: ['operations'] });
    },
    onError: () => {
      setCancelingOpId(null);
    },
    onSettled: () => {
      setCancelingOpId(null);
    },
  });

  return (
    <div>
      {cancelingOpId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white px-6 py-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-administrativo text-white">
              <RefreshCw className="animate-spin" size={20} />
            </div>
            <p className="text-base font-semibold text-gray-900">Cancelando operación...</p>
            <p className="mt-2 text-sm text-gray-500">Esperá un momento mientras actualizamos el estado.</p>
          </div>
        </div>
      )}
      {/* Title card */}
      <div className="bg-white px-4 pt-5 pb-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-administrativo">Operaciones</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <p className="text-sm text-gray-500 capitalize">{todayLabel}</p>
              <button
                onClick={() => qc.invalidateQueries({ queryKey: ['operations'] })}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>
          <button
            onClick={() => navigate('../nueva')}
            className="btn-primary bg-administrativo flex items-center justify-center gap-1.5 text-sm w-full sm:w-auto whitespace-nowrap"
          >
            <Plus size={16} />
            Cargar nueva operación
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-administrativo text-white'
                : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 pb-4 space-y-2">
        {isLoading ? (
          <div className="bg-white rounded-2xl py-12 flex items-center justify-center shadow-sm">
            <p className="text-gray-400">Cargando...</p>
          </div>
        ) : ops.length === 0 ? (
          <div className="bg-white rounded-2xl py-12 flex flex-col items-center shadow-sm">
            <EmptyIllustration />
            <p className="text-gray-500 mt-4 text-base">Sin operaciones para hoy</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 font-medium px-1">{ops.length} OPERACIONES</p>
            {ops.map((op) => {
              const isExpanded = expanded === op.id;
              const canEdit = EDITABLE_STATUSES.includes(op.status);
              const canCancel = CANCELLABLE_STATUSES.includes(op.status);

              return (
                <div key={op.id} className="card">
                  <button
                    className="w-full flex items-center justify-between"
                    onClick={() => setExpanded(isExpanded ? null : op.id)}
                  >
                    <span className="font-semibold text-sm">#{op.id.slice(-3).toUpperCase()}</span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={op.status} />
                      <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                      <div>
                        <p className="text-xs text-gray-500 font-medium">📍 DIRECCION</p>
                        <p className="text-sm text-gray-800">{op.direccion}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">👤 CONTACTO</p>
                        <p className="text-sm text-gray-800">{op.contacto}</p>
                        {op.telefono && <p className="text-sm text-gray-600">{op.telefono}</p>}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">💵 OPERACION</p>
                        <p className="text-sm font-medium text-gray-800">
                          {op.tipo === 'entrega' ? 'Entregar' : 'Recibir'}{' '}
                          {op.moneda} {Number(op.monto).toLocaleString('es-AR')}
                        </p>
                      </div>
                      {op.cadete && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium">🚴 CADETE</p>
                          <p className="text-sm text-gray-800">{op.cadete.nombre}</p>
                        </div>
                      )}
                      {op.notas && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium">NOTAS</p>
                          <p className="text-sm text-gray-600">{op.notas}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-1 flex-wrap items-center">
                        {canEdit && (
                          <button
                            onClick={() => setEditingOp(op)}
                            className="btn-secondary text-sm border-gray-300 text-gray-700 flex items-center gap-1"
                          >
                            <Edit size={14} />
                            Editar
                          </button>
                        )}
                        {canCancel && (
                          <button
                            onClick={() => cancel.mutate(op.id)}
                            disabled={cancel.isPending}
                            className="btn-secondary text-sm border-red-200 text-red-600 flex items-center gap-1"
                          >
                            <X size={14} />
                            Cancelar
                          </button>
                        )}
                        {cancelingOpId === op.id && (
                          <p className="text-xs text-white bg-red-600 px-2 py-1 rounded">
                            Cancelando operación...
                          </p>
                        )}
                        {!canCancel && !['cerrada', 'cancelada'].includes(op.status) && (
                          <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            No se puede cancelar — cadete ya en camino
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {editingOp && (
        <EditModal
          op={editingOp}
          onClose={() => setEditingOp(null)}
          onSaved={() => {
            setEditingOp(null);
            qc.invalidateQueries({ queryKey: ['operations'] });
          }}
        />
      )}
    </div>
  );
}
