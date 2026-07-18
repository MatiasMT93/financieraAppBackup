import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCheck, UserX, Phone, MessageCircle, Trash2, Clock } from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '../../../shared/api/client.ts';
import type { User } from '@cambioapp/shared-types';
import DownloadApkButton from '../components/DownloadApkButton.tsx';
import { UsersIcon, TrashIcon } from '../components/CoordIcons.tsx';

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
            <Trash2 size={15} />
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

function CadeteDetail({ cadete, onDelete }: { cadete: User; onDelete: () => void }) {
  const celular = cadete.celular?.replace(/\D/g, '') ?? '';
  const waNumber = celular.startsWith('0') ? `549${celular.slice(1)}` : `549${celular}`;

  return (
    <div className="coord-user-card__details">
      <div className="coord-user-card__field">
        <span>Nombre completo</span>
        <strong>{cadete.nombre} {cadete.apellido}</strong>
      </div>
      {cadete.celular && (
        <div className="coord-user-card__field">
          <span>Celular</span>
          <strong>{cadete.celular}</strong>
        </div>
      )}

      {cadete.celular && (
        <div className="coord-operation-card__contact" style={{ marginBottom: 14 }}>
          <a href={`tel:${cadete.celular}`} className="coord-contact-link coord-contact-link--call">
            <Phone size={15} />
            Llamar
          </a>
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="coord-contact-link coord-contact-link--wa"
          >
            <MessageCircle size={15} />
            WhatsApp
          </a>
        </div>
      )}

      <button type="button" className="coord-delete-button" onClick={onDelete}>
        <TrashIcon />
        <span>Eliminar cadete</span>
      </button>
    </div>
  );
}

export default function GestionCadetesTab() {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

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
      setExpandedId(null);
    },
  });

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

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

      <section>
        <div className="coord-section-title">
          <UsersIcon />
          Cadetes activos
        </div>

        {isLoading && <p style={{ color: '#c0c6d0', textAlign: 'center' }}>Cargando…</p>}
        {!isLoading && cadetes.length === 0 && (
          <div className="coord-empty-panel coord-empty-panel--compact">
            <p>No hay cadetes activos</p>
          </div>
        )}

        <div className="coord-stack-list">
          {cadetes.map((cadete) => {
            const expanded = expandedId === cadete.id;
            return (
              <article key={cadete.id} className="coord-user-card">
                <button type="button" className="coord-user-card__summary" onClick={() => toggleExpand(cadete.id)}>
                  <div>
                    <h3>{cadete.nombre} {cadete.apellido}</h3>
                    <p>Cadete</p>
                  </div>
                  <span className="coord-user-card__chevron">{expanded ? '⌃' : '⌄'}</span>
                </button>
                {expanded && <CadeteDetail cadete={cadete} onDelete={() => setDeleteTarget(cadete)} />}
              </article>
            );
          })}
        </div>
      </section>

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
