import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Check } from 'lucide-react';
import { apiPatch } from '../../../shared/api/client.ts';
import type { User } from '@cambioapp/shared-types';

interface Props {
  cadete: User;
  onClose: () => void;
}

export default function EditCadeteModal({ cadete, onClose }: Props) {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState(cadete.nombre);
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      apiPatch(`/users/${cadete.id}`, {
        nombre: nombre !== cadete.nombre ? nombre : undefined,
        password: password || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cadetes-gestion'] });
      qc.invalidateQueries({ queryKey: ['cadetes'] });
      onClose();
    },
  });

  const isValid = nombre.trim().length >= 2 && (password === '' || password.length >= 6);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="coord-edit-modal">
        <div className="coord-edit-modal__header">
          <h2>Editar cadete</h2>
          <button type="button" onClick={onClose} disabled={mutation.isPending} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isValid) mutation.mutate();
          }}
        >
          <label className="coord-edit-modal__field">
            <span>Nombre completo</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>

          <label className="coord-edit-modal__field">
            <span>Nueva contraseña (opcional)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Dejar en blanco para no cambiarla"
            />
          </label>

          {mutation.isError && (
            <p className="coord-edit-modal__error">Error al guardar. Intentá de nuevo.</p>
          )}

          <button type="submit" className="coord-assign-button" style={{ width: '100%', justifyContent: 'center' }} disabled={!isValid || mutation.isPending}>
            <Check size={16} />
            {mutation.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}
