import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCheck, UserX, Phone, MessageCircle, Clock, Pencil } from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '../../../shared/api/client.ts';
import type { User } from '@cambioapp/shared-types';
import DownloadApkButton from '../components/DownloadApkButton.tsx';
import EditCadeteModal from '../components/EditCadeteModal.tsx';
import { UsersIcon, CalendarIcon, TrashIcon } from '../components/CoordIcons.tsx';

function ConfirmDeleteDialog({
  cadete,
  onConfirm,
  onCancel,
  isPending,
}: {
  cadete: User;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm" style={{ color: '#111827' }}>
        <h2 className="font-semibold text-gray-900 mb-2">Eliminar cadete</h2>
        <p className="text-sm text-gray-600 mb-6">
          ¿Estás seguro que querés eliminar a{' '}
          <strong>
            {cadete.nombre} {cadete.apellido}
          </strong>
          ? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="btn-primary flex-1 bg-red-600 hover:bg-red-700 flex items-center justify-center gap-1"
          >
            <TrashIcon />
            {isPending ? 'Eliminando...' : 'Eliminar'}
          </button>
          <button onClick={onCancel} className="btn-secondary border-gray-300 text-gray-600 px-4">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function waLink(celular: string) {
  const n = celular.replace(/\D/g, '');
  return `https://wa.me/${n.startsWith('0') ? `549${n.slice(1)}` : `549${n}`}`;
}

export default function GestionCadetesTab() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);

  const { data: cadetes = [], isLoading } = useQuery({
    queryKey: ['cadetes-gestion'],
    queryFn: () => apiGet<User[]>('/users', { role: 'cadete' }),
  });

  const { data: pending = [], isLoading: isLoadingPending } = useQuery({
    queryKey: ['cadetes-pending'],
    queryFn: () => apiGet<User[]>('/users/pending'),
  });

  const approve = useMutation({
    mutationFn: (id: string) => apiPost(`/users/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cadetes-pending'] });
      qc.invalidateQueries({ queryKey: ['cadetes-gestion'] });
      qc.invalidateQueries({ queryKey: ['cadetes'] });
    },
  });

  const reject = useMutation({
    mutationFn: (id: string) => apiPost(`/users/${id}/reject`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cadetes-pending'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cadetes-gestion'] });
      qc.invalidateQueries({ queryKey: ['cadetes'] });
      setDeleteTarget(null);
      setSelectedId(null);
    },
  });

  const selected = cadetes.find((c) => c.id === selectedId) ?? cadetes[0] ?? null;

  return (
    <>
      <DownloadApkButton />

      {(isLoadingPending || pending.length > 0) && (
        <section>
          <div className="coord-section-title">
            <Clock size={18} style={{ color: '#f2bc57' }} />
            Solicitudes pendientes
            {pending.length > 0 && <span className="coord-pending-badge">{pending.length}</span>}
          </div>

          <div className="coord-stack-list">
            {isLoadingPending && <p style={{ color: '#c0c6d0', textAlign: 'center' }}>Cargando…</p>}
            {pending.map((cadete) => (
              <article key={cadete.id} className="coord-user-card">
                <div className="coord-user-card__summary" style={{ cursor: 'default' }}>
                  <div>
                    <h3>{cadete.nombre} {cadete.apellido}</h3>
                    {cadete.celular && <p>{cadete.celular}</p>}
                  </div>
                </div>
                <div className="coord-user-card__details" style={{ paddingTop: 0 }}>
                  <div className="coord-approve-row">
                    <button
                      type="button"
                      className="coord-approve-button"
                      onClick={() => approve.mutate(cadete.id)}
                      disabled={approve.isPending || reject.isPending}
                    >
                      <UserCheck size={16} />
                      Aceptar
                    </button>
                    <button
                      type="button"
                      className="coord-reject-button"
                      onClick={() => reject.mutate(cadete.id)}
                      disabled={approve.isPending || reject.isPending}
                    >
                      <UserX size={16} />
                      Rechazar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="coord-section-title"><UsersIcon />Cadetes activos</div>

      {isLoading && <p style={{ color: '#c0c6d0', textAlign: 'center' }}>Cargando…</p>}
      {!isLoading && cadetes.length === 0 && (
        <div className="coord-empty-panel coord-empty-panel--compact">
          <p>No hay cadetes activos</p>
        </div>
      )}

      {!isLoading && cadetes.length > 0 && (
        <div className="coord-split-page">
          <aside className="coord-list-panel">
            <h3><UsersIcon />{cadetes.length} cadetes</h3>
            <div className="coord-list-panel__scroll">
              {cadetes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={selected?.id === c.id ? 'is-selected' : ''}
                  onClick={() => setSelectedId(c.id)}
                >
                  <span className="coord-avatar coord-avatar--small">{c.nombre[0]}{c.apellido?.[0] ?? ''}</span>
                  <span><strong>{c.nombre} {c.apellido}</strong><small>Cadete</small></span>
                </button>
              ))}
            </div>
          </aside>

          {selected && (
            <section className="coord-detail-panel">
              <div className="coord-cadet-hero">
                <span className="coord-avatar">{selected.nombre[0]}{selected.apellido?.[0] ?? ''}</span>
                <div>
                  <h2>{selected.nombre} {selected.apellido}</h2>
                  <p>Cadete</p>
                </div>
                <button type="button" className="coord-assign-button coord-assign-button--ghost" onClick={() => setEditTarget(selected)}>
                  <Pencil size={16} />Editar
                </button>
              </div>

              <div className="coord-user-info-grid">
                <div>
                  <UsersIcon />
                  <span>Nombre completo<strong>{selected.nombre} {selected.apellido}</strong></span>
                </div>
                <div>
                  <Phone size={20} />
                  <span>Teléfono (opcional)<strong>{selected.celular ?? '—'}</strong></span>
                </div>
                <div>
                  <CalendarIcon />
                  <span>Fecha de alta<strong>{new Date(selected.createdAt).toLocaleDateString('es-AR')}</strong></span>
                </div>
              </div>

              {selected.celular && (
                <div className="coord-operation-card__contact" style={{ margin: '16px 0' }}>
                  <a href={`tel:${selected.celular}`} className="coord-contact-link coord-contact-link--call">
                    <Phone size={15} />
                    Llamar
                  </a>
                  <a href={waLink(selected.celular)} target="_blank" rel="noopener noreferrer" className="coord-contact-link coord-contact-link--wa">
                    <MessageCircle size={15} />
                    WhatsApp
                  </a>
                </div>
              )}

              <button type="button" className="coord-delete-button" onClick={() => setDeleteTarget(selected)}>
                <TrashIcon />
                <span>Eliminar cadete</span>
              </button>
            </section>
          )}
        </div>
      )}

      {editTarget && (
        <EditCadeteModal cadete={editTarget} onClose={() => setEditTarget(null)} />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          cadete={deleteTarget}
          onConfirm={() => remove.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isPending={remove.isPending}
        />
      )}
    </>
  );
}
