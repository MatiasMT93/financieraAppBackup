import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '../../../shared/api/client.ts';
import {
  SearchIcon, PlusIcon, EyeIcon, ClipboardIcon, TruckIcon, CurrencyIcon,
  PinIcon, UserIcon, PhoneIcon, ChevronDownIcon, BoxIllustration,
} from '../components/AdminIcons.tsx';

const TIPOS = ['Entrega', 'Retiro'];
const MONEDAS = ['ARS', 'USD', 'EUR', 'BRL', 'USDT'];

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

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-searchbar">
          <SearchIcon />
          <input placeholder="Buscar operaciones..." disabled />
        </div>
      </div>

      <section className="admin-page-header admin-page-header--new">
        <span className="admin-page-header__icon"><PlusIcon /></span>
        <div>
          <h1>Nueva operación</h1>
          <p>Completá los datos para cargar</p>
        </div>
      </section>

      <section className="admin-new-layout">
        <form
          className="admin-form-card"
          onSubmit={(e) => {
            e.preventDefault();
            if (isValid) mutation.mutate();
          }}
        >
          <div className="admin-form-card__title"><ClipboardIcon />Datos de la operación</div>

          <div className="admin-form-grid admin-form-grid--two">
            <label className="admin-field">
              <span>Tipo</span>
              <div className="admin-input-shell">
                <TruckIcon />
                <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
                  {TIPOS.map((t) => <option key={t} value={t.toLowerCase()}>{t}</option>)}
                </select>
                <ChevronDownIcon />
              </div>
            </label>

            <label className="admin-field">
              <span>Moneda</span>
              <div className="admin-input-shell">
                <CurrencyIcon />
                <select value={form.moneda} onChange={(e) => set('moneda', e.target.value)}>
                  {MONEDAS.map((m) => <option key={m}>{m}</option>)}
                </select>
                <ChevronDownIcon />
              </div>
            </label>
          </div>

          <label className="admin-field">
            <span>Monto</span>
            <div className="admin-input-shell admin-input-shell--with-suffix">
              <CurrencyIcon />
              <input type="number" value={form.monto} onChange={(e) => set('monto', e.target.value)} placeholder="0" />
              <span className="admin-suffix">{form.moneda}</span>
            </div>
          </label>

          <label className="admin-field">
            <span>Dirección</span>
            <div className="admin-input-shell">
              <PinIcon />
              <input value={form.direccion} onChange={(e) => set('direccion', e.target.value)} placeholder="Calle y número" />
            </div>
          </label>

          <div className="admin-form-grid admin-form-grid--two">
            <label className="admin-field">
              <span>Contacto</span>
              <div className="admin-input-shell">
                <UserIcon />
                <input value={form.contacto} onChange={(e) => set('contacto', e.target.value)} placeholder="Nombre de la persona" />
              </div>
            </label>

            <label className="admin-field">
              <span>Teléfono (opcional)</span>
              <div className="admin-input-shell">
                <PhoneIcon />
                <input value={form.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="+54 11 ..." />
              </div>
            </label>
          </div>

          <label className="admin-field">
            <span>Notas (opcional)</span>
            <div className="admin-input-shell admin-input-shell--textarea">
              <ClipboardIcon />
              <textarea value={form.notas} onChange={(e) => set('notas', e.target.value)} rows={3} placeholder="Piso, referencia, etc." />
            </div>
          </label>

          {mutation.isError && (
            <p style={{ color: '#ff8a7a', fontSize: 13, textAlign: 'center', marginBottom: 8 }}>
              Error al cargar la operación. Intentá de nuevo.
            </p>
          )}

          <div className="admin-form-actions">
            <button type="button" className="admin-cancel-button" onClick={() => navigate('../ops')}>Cancelar</button>
            <button type="submit" className="admin-primary-button" disabled={!isValid || mutation.isPending}>
              <PlusIcon />{mutation.isPending ? 'Cargando…' : 'Cargar operación'}
            </button>
          </div>
        </form>

        <aside className="admin-preview-card">
          <div className="admin-preview-card__title"><EyeIcon />Vista previa</div>
          <div className="admin-preview-card__illustration"><BoxIllustration /></div>
          <p>Revisá los datos antes de cargar la operación.</p>
          <div className="admin-preview-list">
            <div><span><TruckIcon />Tipo</span><strong>{form.tipo === 'entrega' ? 'Entrega' : 'Retiro'}</strong></div>
            <div><span><CurrencyIcon />Moneda</span><strong>{form.moneda}</strong></div>
            <div><span><CurrencyIcon />Monto</span><strong>{form.monto || '—'}</strong></div>
            <div><span><PinIcon />Dirección</span><strong>{form.direccion || '—'}</strong></div>
            <div><span><UserIcon />Contacto</span><strong>{form.contacto || '—'}</strong></div>
          </div>
        </aside>
      </section>
    </>
  );
}
