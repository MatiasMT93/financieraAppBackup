import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  Phone,
  MessageCircle,
  Trash2,
  Clock,
  Users,
} from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '../../../shared/api/client.ts';
import type { User } from '@cambioapp/shared-types';
import DownloadApkButton from '../components/DownloadApkButton.tsx';

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
      <div className="card w-full max-w-sm">
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
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-gray-400">Nombre completo</p>
          <p className="font-medium text-gray-800">
            {cadete.nombre} {cadete.apellido}
          </p>
        </div>
        {cadete.celular && (
          <div>
            <p className="text-xs text-gray-400">Celular</p>
            <p className="font-medium text-gray-800">{cadete.celular}</p>
          </div>
        )}
      </div>

      {cadete.celular && (
        <div className="flex gap-2">
          <a
            href={`tel:${cadete.celular}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            <Phone size={15} />
            Llamar
          </a>
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors"
          >
            <MessageCircle size={15} />
            WhatsApp
          </a>
        </div>
      )}

      <button
        onClick={onDelete}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
      >
        <Trash2 size={15} />
        Eliminar cadete
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
    <div className="p-4 space-y-5">
      <DownloadApkButton />

      {/* Solicitudes pendientes */}
      {(isLoadingPending || pending.length > 0) && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={15} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-700">
              Solicitudes pendientes
              {pending.length > 0 && (
                <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {pending.length}
                </span>
              )}
            </h3>
          </div>

          <div className="space-y-2">
            {isLoadingPending && (
              <p className="text-sm text-gray-400 text-center py-2">Cargando...</p>
            )}
            {pending.map((cadete) => (
              <div key={cadete.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {cadete.nombre} {cadete.apellido}
                    </p>
                    {cadete.celular && (
                      <p className="text-xs text-gray-400">{cadete.celular}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approve.mutate(cadete.id)}
                      disabled={approve.isPending || reject.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      <UserCheck size={15} />
                      Aceptar
                    </button>
                    <button
                      onClick={() => reject.mutate(cadete.id)}
                      disabled={approve.isPending || reject.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <UserX size={15} />
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cadetes activos */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Users size={15} className="text-coordinador" />
          <h3 className="text-sm font-semibold text-gray-700">Cadetes activos</h3>
        </div>

        {isLoading && (
          <p className="text-sm text-gray-400 text-center py-4">Cargando...</p>
        )}

        {!isLoading && cadetes.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">No hay cadetes activos</p>
        )}

        <div className="space-y-2">
          {cadetes.map((cadete) => {
            const expanded = expandedId === cadete.id;
            return (
              <div key={cadete.id} className="card">
                <button
                  className="w-full flex items-center justify-between"
                  onClick={() => toggleExpand(cadete.id)}
                >
                  <div className="text-left">
                    <p className="font-medium text-gray-900 text-sm">
                      {cadete.nombre} {cadete.apellido}
                    </p>
                    <p className="text-xs text-gray-400">Cadete</p>
                  </div>
                  {expanded ? (
                    <ChevronUp size={18} className="text-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-400 shrink-0" />
                  )}
                </button>

                {expanded && (
                  <CadeteDetail
                    cadete={cadete}
                    onDelete={() => setDeleteTarget(cadete)}
                  />
                )}
              </div>
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
    </div>
  );
}
