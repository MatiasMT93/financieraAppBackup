import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '../../../shared/api/client.ts';

const TIPOS = ['Entrega', 'Retiro'];
const MONEDAS = ['ARS', 'USD', 'EUR', 'BRL'];

interface FormState {
  tipo: string;
  moneda: string;
  monto: string;
  direccion: string;
  contacto: string;
  telefono: string;
  notas: string;
}

export default function NuevaOpTab() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState<FormState>({
    tipo: 'entrega',
    moneda: 'ARS',
    monto: '',
    direccion: '',
    contacto: '',
    telefono: '',
    notas: '',
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiPost('/operations', {
        tipo: form.tipo,
        moneda: form.moneda,
        monto: parseFloat(form.monto),
        direccion: form.direccion,
        contacto: form.contacto,
        telefono: form.telefono || undefined,
        notas: form.notas || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations'] });
      navigate('../ops');
    },
  });

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const isValid =
    form.monto !== '' &&
    parseFloat(form.monto) > 0 &&
    form.direccion.length >= 5 &&
    form.contacto.length >= 2;

  const fields: Array<{ field: keyof FormState; label: string; type: string; placeholder: string }> = [
    { field: 'monto', label: 'Monto', type: 'number', placeholder: '0' },
    { field: 'direccion', label: 'Dirección', type: 'text', placeholder: 'Calle y número' },
    { field: 'contacto', label: 'Contacto', type: 'text', placeholder: 'Nombre de la persona' },
    { field: 'telefono', label: 'Teléfono (opcional)', type: 'tel', placeholder: '+54 11 ...' },
    { field: 'notas', label: 'Notas (opcional)', type: 'text', placeholder: 'Piso, referencia, etc.' },
  ];

  return (
    <div>
      <div className="bg-white px-4 pt-5 pb-4 shadow-sm mb-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-administrativo">Nueva operación</h1>
        <p className="text-sm text-gray-500 mt-1">Completá los datos para cargar</p>
      </div>

      <div className="px-4 pt-4 pb-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={form.tipo}
              onChange={(e) => set('tipo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {TIPOS.map((t) => <option key={t} value={t.toLowerCase()}>{t}</option>)}
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

        {fields.map(({ field, label, type, placeholder }) => (
          <div key={field}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            <input
              type={type}
              value={form[field]}
              onChange={(e) => set(field, e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-administrativo"
            />
          </div>
        ))}

        <button
          onClick={() => mutation.mutate()}
          disabled={!isValid || mutation.isPending}
          className="btn-primary w-full bg-administrativo"
        >
          {mutation.isPending ? 'Cargando...' : 'Cargar operación'}
        </button>

        {mutation.isError && (
          <p className="text-sm text-red-600 text-center">Error al cargar la operación. Intentá de nuevo.</p>
        )}

        <button
          onClick={() => navigate('../ops')}
          className="btn-secondary w-full border-gray-300 text-gray-600"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
