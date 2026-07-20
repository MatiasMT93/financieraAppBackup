import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPatch, apiPost } from '../../../shared/api/client.ts';
import { PlusIcon, UserIcon, PhoneIcon, PinIcon, ClipboardIcon, CloseIcon } from './AdminIcons.tsx';
import type { Client } from '@cambioapp/shared-types';

interface Props {
  client?: Client | null;
  onClose: () => void;
  onSaved: (client: Client) => void;
}

export default function ClientFormModal({ client, onClose, onSaved }: Props) {
  const isEdit = !!client;
  const [nombre, setNombre] = useState(client?.nombre ?? '');
  const [telefono, setTelefono] = useState(client?.telefono ?? '');
  const [direccion, setDireccion] = useState(client?.direccion ?? '');
  const [notas, setNotas] = useState(client?.notas ?? '');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        nombre,
        telefono: telefono || undefined,
        direccion: direccion || undefined,
        notas: notas || undefined,
      };
      return isEdit
        ? apiPatch<Client>(`/clients/${client.id}`, body)
        : apiPost<Client>('/clients', body);
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      onSaved(saved);
    },
  });

  const isValid = nombre.trim().length >= 2;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="admin-modal-card">
        <div className="admin-modal-card__header">
          <h2>{isEdit ? 'Editar cliente' : 'Nuevo cliente'}</h2>
          <button type="button" onClick={onClose}><CloseIcon /></button>
        </div>

        <label className="admin-field">
          <span>Nombre o razón social</span>
          <div className="admin-input-shell">
            <UserIcon />
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del cliente" autoFocus />
          </div>
        </label>

        <label className="admin-field">
          <span>Teléfono (opcional)</span>
          <div className="admin-input-shell">
            <PhoneIcon />
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+54 11 ..." />
          </div>
        </label>

        <label className="admin-field">
          <span>Dirección (opcional)</span>
          <div className="admin-input-shell">
            <PinIcon />
            <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle y número" />
          </div>
        </label>

        <label className="admin-field">
          <span>Notas (opcional)</span>
          <div className="admin-input-shell admin-input-shell--textarea">
            <ClipboardIcon />
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} placeholder="Referencias, preferencias, etc." />
          </div>
        </label>

        {mutation.isError && (
          <p style={{ color: '#ff8a7a', fontSize: 13, textAlign: 'center', margin: '0 0 8px' }}>
            Error al guardar el cliente. Intentá de nuevo.
          </p>
        )}

        <div className="admin-modal-card__actions">
          <button type="button" className="admin-cancel-button" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="admin-primary-button"
            disabled={!isValid || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <PlusIcon />{mutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}
