import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPatch } from '../../../shared/api/client.ts';
import { invalidateOperationsQueries } from '../../../shared/utils/invalidate-operations.ts';
import { normalizeSearch } from '../../../shared/utils/normalize-search.ts';
import type { Operation, OperationStatus } from '@cambioapp/shared-types';
import { CANCELLABLE_STATUSES, EDITABLE_STATUSES, DELIVERY_MODE_LABELS } from '@cambioapp/shared-constants';
import {
  SearchIcon, CalendarIcon, ClipboardIcon, GridIcon, TruckIcon, CurrencyIcon,
  PinIcon, UserIcon, PhoneIcon, PlusIcon, ExternalLinkIcon, EditIcon, TrashIcon, BankIcon,
} from '../components/AdminIcons.tsx';

const FILTERS = [
  { label: 'Todas', value: '', icon: true as const },
  { label: 'Pendientes', value: 'pendiente', dot: 'gold' as const },
  { label: 'En curso', value: 'en_camino,en_destino,volviendo', dot: 'blue' as const },
  { label: 'Cerradas', value: 'cerrada', dot: 'green' as const },
];

const TIPOS: Array<{ value: string; label: string }> = [
  { value: 'entrega', label: 'Entrega' },
  { value: 'retiro', label: 'Retiro' },
  { value: 'entrega_retiro', label: 'Entrega y Retiro' },
];
const MONEDAS = ['ARS', 'USD', 'EUR', 'BRL', 'USDT'] as const;

function tipoLabel(tipo: string) {
  return TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
}

const STATUS_META: Record<OperationStatus, { label: string; badge: string; dot: string }> = {
  pendiente: { label: 'Pendiente', badge: 'is-pending', dot: 'gold' },
  asignada: { label: 'Asignada', badge: 'is-pending', dot: 'gold' },
  en_camino: { label: 'En camino', badge: 'is-blue', dot: 'blue' },
  en_destino: { label: 'En destino', badge: 'is-blue', dot: 'blue' },
  volviendo: { label: 'Volviendo', badge: 'is-blue', dot: 'blue' },
  cerrada: { label: 'Cerrada', badge: 'is-green', dot: 'green' },
  cancelada: { label: 'Cancelada', badge: 'is-grey', dot: 'grey' },
  incidencia: { label: 'Incidencia', badge: 'is-red', dot: 'red' },
};

function AdminStatusBadge({ status }: { status: OperationStatus }) {
  const meta = STATUS_META[status];
  return <span className={`admin-status-badge ${meta.badge}`}>{meta.label}</span>;
}

function currencySymbol(moneda: string) {
  return moneda === 'ARS' ? '$' : moneda === 'USD' ? 'U$' : moneda === 'EUR' ? '€' : moneda === 'BRL' ? 'R$' : '₮';
}

function formatMonto(op: Operation) {
  return `${currencySymbol(op.moneda)} ${Number(op.monto).toLocaleString('es-AR')}`;
}

function formatMonto2(op: Operation) {
  if (op.monto2 == null || !op.moneda2) return '—';
  return `${currencySymbol(op.moneda2)} ${Number(op.monto2).toLocaleString('es-AR')}`;
}

interface EditForm {
  tipo: string;
  moneda: string;
  monto: string;
  moneda2: string;
  monto2: string;
  direccion: string;
  banco: string;
  contacto: string;
  telefono: string;
  notas: string;
}

function EditModal({ op, onClose, onSaved }: { op: Operation; onClose: () => void; onSaved: () => void }) {
  const isDeposito = op.modalidad === 'deposito';
  const [form, setForm] = useState<EditForm>({
    tipo: op.tipo,
    moneda: op.moneda,
    monto: String(op.monto),
    moneda2: op.moneda2 ?? 'ARS',
    monto2: op.monto2 != null ? String(op.monto2) : '',
    direccion: op.direccion ?? '',
    banco: op.banco ?? '',
    contacto: op.contacto,
    telefono: op.telefono ?? '',
    notas: op.notas ?? '',
  });

  const isCombined = form.tipo === 'entrega_retiro';

  const mutation = useMutation({
    mutationFn: () =>
      apiPatch(`/operations/${op.id}`, {
        tipo: form.tipo,
        moneda: form.moneda,
        monto: parseFloat(form.monto),
        ...(isCombined ? { moneda2: form.moneda2, monto2: parseFloat(form.monto2) } : {}),
        direccion: form.direccion,
        banco: isDeposito ? form.banco : undefined,
        contacto: form.contacto,
        telefono: form.telefono || undefined,
        notas: form.notas || undefined,
      }),
    onSuccess: onSaved,
  });

  function set(field: keyof EditForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const isValid =
    parseFloat(form.monto) > 0 &&
    (!isCombined || (form.monto2 !== '' && parseFloat(form.monto2) > 0)) &&
    form.direccion.length >= 3 &&
    (!isDeposito || form.banco.trim().length >= 2) &&
    form.contacto.length >= 2;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto" style={{ color: '#111827' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Editar operación #{op.id.slice(-3).toUpperCase()}</h2>
          <button onClick={onClose}>×</button>
        </div>

        <div className="space-y-3">
          <div className={isCombined ? '' : 'grid grid-cols-2 gap-3'}>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => set('tipo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {!isCombined && (
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
            )}
          </div>

          {isCombined ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Monto de entrega</label>
                  <input
                    type="number"
                    value={form.monto}
                    onChange={(e) => set('monto', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-administrativo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Moneda de entrega</label>
                  <select
                    value={form.moneda}
                    onChange={(e) => set('moneda', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {MONEDAS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Monto de retiro</label>
                  <input
                    type="number"
                    value={form.monto2}
                    onChange={(e) => set('monto2', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-administrativo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Moneda de retiro</label>
                  <select
                    value={form.moneda2}
                    onChange={(e) => set('moneda2', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {MONEDAS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Monto</label>
              <input
                type="number"
                value={form.monto}
                onChange={(e) => set('monto', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-administrativo"
              />
            </div>
          )}

          {([
            { field: 'direccion', label: 'Dirección', type: 'text' },
            ...(isDeposito ? [{ field: 'banco', label: 'Banco', type: 'text' }] as const : []),
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
            className="btn-primary flex-1 bg-administrativo"
          >
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
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingOp, setEditingOp] = useState<Operation | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const todayLabel = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date());

  // Sin filtro de fecha: el filtro de Cerradas tiene que mostrar todas las
  // operaciones cerradas, no solo las de hoy (para eso está el Historial).
  const { data: ops = [], isLoading } = useQuery({
    queryKey: ['operations-admin', filter],
    queryFn: () => apiGet<Operation[]>('/operations', filter ? { status: filter } : {}),
    refetchInterval: 30_000,
  });

  const filtered = useMemo(() => {
    if (!query.trim()) return ops;
    const q = normalizeSearch(query);
    return ops.filter((op) => {
      const searchable = normalizeSearch(`${op.id} ${op.direccion ?? ''} ${op.contacto} ${op.tipo}`);
      return searchable.includes(q);
    });
  }, [ops, query]);

  const selected = filtered.find((op) => op.id === selectedId) ?? filtered[0] ?? null;

  const cancel = useMutation({
    mutationFn: (id: string) => apiPost(`/operations/${id}/cancel`),
    onSuccess: () => invalidateOperationsQueries(qc),
  });

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-searchbar">
          <SearchIcon />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar operaciones..." />
        </div>
      </div>

      <section className="admin-page-header">
        <div>
          <h1>Operaciones</h1>
          <p><CalendarIcon />{todayLabel}</p>
        </div>
      </section>

      <section className="admin-filter-row" role="tablist" aria-label="Filtros de operaciones">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={filter === f.value}
            className={filter === f.value ? 'is-active' : ''}
            onClick={() => setFilter(f.value)}
          >
            {f.icon ? <GridIcon /> : <span className={`admin-filter-dot is-${f.dot}`} aria-hidden="true" />}
            <span>{f.label}</span>
          </button>
        ))}
      </section>

      {isLoading ? (
        <p style={{ color: '#c0c6d0' }}>Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className="admin-detail-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#c0c6d0' }}>Sin operaciones para este filtro</p>
        </div>
      ) : (
        <>
          <div className="admin-ops-count">{filtered.length} operaciones</div>

          <section className="admin-ops-layout">
            <div className="admin-ops-list">
              {filtered.map((op) => {
                const meta = STATUS_META[op.status];
                return (
                  <button
                    key={op.id}
                    type="button"
                    className={`admin-operation-item ${selected?.id === op.id ? 'is-selected' : ''} ${op.status === 'cerrada' ? 'is-closed' : ''}`}
                    onClick={() => setSelectedId(op.id)}
                  >
                    <span className="admin-operation-item__icon"><ClipboardIcon /></span>
                    <span className="admin-operation-item__id-group">
                      <strong>#{op.id.slice(-3).toUpperCase()}</strong>
                      <small>{op.createdAt.slice(0, 10)}</small>
                    </span>
                    <span className="admin-operation-item__kind">
                      <span className={`admin-mini-dot is-${meta.dot}`} />
                      {tipoLabel(op.tipo)}
                    </span>
                    <span className="admin-operation-item__amount">
                      <strong>{formatMonto(op)}</strong>
                      <small>{op.tipo === 'entrega_retiro' && op.monto2 != null && op.moneda2 ? `+ ${formatMonto2(op)}` : op.moneda}</small>
                    </span>
                    <span className="admin-operation-item__address">
                      <strong>{op.direccion ?? 'Ventanilla'}</strong>
                      <small>{op.contacto}</small>
                    </span>
                    <span className="admin-operation-item__status-column">
                      <AdminStatusBadge status={op.status} />
                      {op.cadete && <small><UserIcon />{op.cadete.nombre}</small>}
                    </span>
                    <span className="admin-operation-item__chevron">›</span>
                  </button>
                );
              })}
            </div>

            {selected && (
              <OperationDetail
                key={selected.id}
                op={selected}
                onGoNew={() => navigate('../nueva')}
                onEdit={() => setEditingOp(selected)}
                onCancel={() => cancel.mutate(selected.id)}
                cancelPending={cancel.isPending}
              />
            )}
          </section>
        </>
      )}

      {editingOp && (
        <EditModal
          op={editingOp}
          onClose={() => setEditingOp(null)}
          onSaved={() => {
            setEditingOp(null);
            invalidateOperationsQueries(qc);
          }}
        />
      )}
    </>
  );
}

function OperationDetail({
  op,
  onGoNew,
  onEdit,
  onCancel,
  cancelPending,
}: {
  op: Operation;
  onGoNew: () => void;
  onEdit: () => void;
  onCancel: () => void;
  cancelPending: boolean;
}) {
  const canEdit = EDITABLE_STATUSES.includes(op.status);
  const canCancel = CANCELLABLE_STATUSES.includes(op.status);
  const isVentanilla = op.modalidad === 'ventanilla';
  const mapsHref = op.direccion
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(op.direccion)}`
    : null;

  return (
    <aside className="admin-detail-card">
      <div className="admin-detail-card__header-row">
        <div className="admin-detail-card__title-row">
          <span className="admin-detail-card__icon"><ClipboardIcon /></span>
          <div>
            <small>Detalle de operación</small>
            <h2>#{op.id.slice(-3).toUpperCase()}</h2>
          </div>
        </div>
        <button type="button" className="admin-primary-button" onClick={onGoNew}><PlusIcon />Cargar nueva</button>
      </div>

      <div className="admin-detail-card__status-row">
        <AdminStatusBadge status={op.status} />
      </div>

      <div className="admin-detail-grid">
        <div className="admin-detail-col">
          <div className="admin-detail-field"><TruckIcon /><div><span>Tipo</span><strong>{tipoLabel(op.tipo)}</strong></div></div>
          {op.tipo === 'entrega_retiro' ? (
            <>
              <div className="admin-detail-field"><CurrencyIcon /><div><span>Monto de entrega</span><strong>{formatMonto(op)}</strong></div></div>
              <div className="admin-detail-field"><CurrencyIcon /><div><span>Monto de retiro</span><strong>{formatMonto2(op)}</strong></div></div>
            </>
          ) : (
            <>
              <div className="admin-detail-field"><CurrencyIcon /><div><span>Monto</span><strong>{formatMonto(op)}</strong></div></div>
              <div className="admin-detail-field"><CurrencyIcon /><div><span>Moneda</span><strong>{op.moneda}</strong></div></div>
            </>
          )}
          <div className="admin-detail-field">
            <PinIcon />
            <div>
              <span>Modalidad</span>
              <strong>{DELIVERY_MODE_LABELS[op.modalidad]}</strong>
              {mapsHref && op.direccion && (
                <>
                  <em className="admin-detail-field__inline">{op.direccion}</em>
                  <a className="admin-detail-field__link" href={mapsHref} target="_blank" rel="noopener noreferrer">
                    Ver en Google Maps <ExternalLinkIcon />
                  </a>
                </>
              )}
            </div>
          </div>
          {op.modalidad === 'deposito' && op.banco && (
            <div className="admin-detail-field"><BankIcon /><div><span>Banco</span><strong>{op.banco}</strong></div></div>
          )}
        </div>
        <div className="admin-detail-col admin-detail-col--divider">
          <div className="admin-detail-field"><CalendarIcon /><div><span>Fecha / Hora</span><strong>{new Date(op.createdAt).toLocaleString('es-AR')}</strong></div></div>
          <div className="admin-detail-field"><UserIcon /><div><span>Contacto</span><strong>{op.contacto}</strong></div></div>
          {op.telefono && <div className="admin-detail-field"><PhoneIcon /><div><span>Teléfono</span><strong>{op.telefono}</strong></div></div>}
          {!isVentanilla && (
            <div className="admin-detail-field"><UserIcon /><div><span>Cadete</span><strong>{op.cadete?.nombre ?? 'Sin asignar'}</strong></div></div>
          )}
        </div>
      </div>

      {op.notas && (
        <div className="admin-notes-block">
          <span>Notas</span>
          <div className="admin-notes-content">{op.notas}</div>
        </div>
      )}

      <div className="admin-detail-actions">
        {canEdit && (
          <button type="button" className="admin-secondary-button" onClick={onEdit}>
            <EditIcon />Editar
          </button>
        )}
        {canCancel ? (
          <button type="button" className="admin-danger-button" onClick={onCancel} disabled={cancelPending}>
            <TrashIcon />{cancelPending ? 'Cancelando…' : 'Cancelar operación'}
          </button>
        ) : !['cerrada', 'cancelada'].includes(op.status) ? (
          <p className="admin-uncancellable-note">No se puede cancelar — cadete ya en camino</p>
        ) : null}
      </div>
    </aside>
  );
}
