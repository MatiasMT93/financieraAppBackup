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
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm" style={{ color: '#111827' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Editar cadete</h2>
          <button onClick={onClose} disabled={mutation.isPending}><X size={20} /></button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isValid) mutation.mutate();
          }}
        >
          <label className="block mb-3">
            <span className="text-sm text-gray-600 mb-1 block">Nombre completo</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm text-gray-600 mb-1 block">Nueva contraseña (opcional)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Dejar en blanco para no cambiarla"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          {mutation.isError && (
            <p className="text-sm text-red-600 mb-3 text-center">Error al guardar. Intentá de nuevo.</p>
          )}

          <button
            type="submit"
            disabled={!isValid || mutation.isPending}
            className="btn-primary w-full bg-coordinador flex items-center justify-center gap-1"
          >
            <Check size={16} />
            {mutation.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}
