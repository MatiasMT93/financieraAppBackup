import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet } from '../../../shared/api/client.ts';
import { formatRelativeTime } from '../../../shared/utils/format-time.ts';
import { normalizeSearch } from '../../../shared/utils/normalize-search.ts';
import {
  UsersIcon, SearchIcon, PlusIcon, PhoneIcon, EditIcon, TrashIcon,
} from '../components/AdminIcons.tsx';
import ClientFormModal from '../components/ClientFormModal.tsx';
import type { Client, ClientsStats } from '@cambioapp/shared-types';

function initials(nombre: string) {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function ClientesTab() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiGet<{ clients: Client[]; stats: ClientsStats }>('/clients'),
    refetchInterval: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/clients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      setDeletingClient(null);
    },
  });

  const clients = data?.clients ?? [];
  const stats = data?.stats;

  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim());
    if (!q) return clients;
    return clients.filter(
      (c) => normalizeSearch(c.nombre).includes(q) || (c.telefono ?? '').includes(q),
    );
  }, [clients, query]);

  return (
    <>
      <section className="admin-page-header">
        <div>
          <h1>Clientes</h1>
        </div>
        <button type="button" className="admin-primary-button" onClick={() => setShowNewModal(true)}>
          <PlusIcon />Nuevo cliente
        </button>
      </section>

      <div className="admin-client-kpis">
        <div className="admin-client-kpi-card">
          <span className="admin-client-kpi-card__icon"><UsersIcon /></span>
          <strong>{stats?.total ?? 0}</strong>
          <span>Total de clientes</span>
        </div>
        <div className="admin-client-kpi-card">
          <span className="admin-client-kpi-card__icon is-blue"><PhoneIcon /></span>
          <strong>{stats?.operaronHoy ?? 0}</strong>
          <span>Operaron hoy</span>
        </div>
        <div className="admin-client-kpi-card">
          <span className="admin-client-kpi-card__icon is-gold"><PlusIcon /></span>
          <strong>{stats?.nuevosEsteMes ?? 0}</strong>
          <span>Nuevos este mes</span>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-searchbar">
          <SearchIcon />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o teléfono..." />
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: '#c0c6d0' }}>Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className="admin-detail-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#c0c6d0' }}>
            {query ? 'Sin resultados para esa búsqueda' : 'Todavía no hay clientes cargados'}
          </p>
        </div>
      ) : (
        <>
          <div className="admin-ops-count">{filtered.length} {filtered.length === 1 ? 'cliente registrado' : 'clientes registrados'}</div>
          <div className="admin-clients-table">
            <div className="admin-clients-table__head">
              <span>Cliente</span>
              <span>Contacto</span>
              <span>Dirección</span>
              <span>Operaciones</span>
              <span>Última op</span>
              <span />
            </div>
            <div className="admin-clients-table__body">
              {filtered.map((c) => (
                <div className="admin-clients-table__row" key={c.id}>
                  <span className="admin-clients-table__name">
                    <span className="admin-clients-table__avatar">{initials(c.nombre)}</span>
                    {c.nombre}
                  </span>
                  <span>{c.telefono ?? '—'}</span>
                  <span>{c.direccion ?? '—'}</span>
                  <span>{c.operationsCount ?? 0} {c.operationsCount === 1 ? 'total' : 'totales'}</span>
                  <span>{c.lastOperationAt ? formatRelativeTime(c.lastOperationAt) : '—'}</span>
                  <span className="admin-clients-table__actions">
                    <button
                      type="button"
                      className="admin-secondary-button"
                      onClick={() => navigate('../nueva', { state: { clientId: c.id } })}
                    >
                      <PlusIcon />Nueva op
                    </button>
                    <button type="button" onClick={() => setEditingClient(c)} aria-label="Editar cliente">
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="admin-clients-table__delete-btn"
                      onClick={() => setDeletingClient(c)}
                      aria-label="Eliminar cliente"
                    >
                      <TrashIcon />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showNewModal && (
        <ClientFormModal onClose={() => setShowNewModal(false)} onSaved={() => setShowNewModal(false)} />
      )}
      {editingClient && (
        <ClientFormModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSaved={() => setEditingClient(null)}
        />
      )}

      {deletingClient && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="admin-modal-card">
            <div className="admin-modal-card__header">
              <h2>Eliminar cliente</h2>
            </div>
            <p style={{ margin: '0 0 16px', color: '#c1c7d0', fontSize: 14 }}>
              ¿Seguro que querés eliminar a <strong>{deletingClient.nombre}</strong>? Esta acción no se puede deshacer.
            </p>
            {deleteMutation.isError && (
              <p style={{ color: '#ff8a7a', fontSize: 13, textAlign: 'center', margin: '0 0 8px' }}>
                {(deleteMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error
                  ?? 'No se pudo eliminar el cliente. Intentá de nuevo.'}
              </p>
            )}
            <div className="admin-modal-card__actions">
              <button
                type="button"
                className="admin-cancel-button"
                onClick={() => { setDeletingClient(null); deleteMutation.reset(); }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="admin-danger-button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingClient.id)}
              >
                <TrashIcon />{deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
