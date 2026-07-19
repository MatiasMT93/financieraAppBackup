import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '../../../shared/api/client.ts';
import { invalidateOperationsQueries } from '../../../shared/utils/invalidate-operations.ts';
import {
  PlusIcon, EyeIcon, ClipboardIcon, TruckIcon, CurrencyIcon,
  PinIcon, UserIcon, PhoneIcon, ChevronDownIcon, BoxIllustration,
} from '../components/AdminIcons.tsx';

const TIPOS: Array<{ value: string; label: string }> = [
  { value: 'entrega', label: 'Entrega' },
  { value: 'retiro', label: 'Retiro' },
  { value: 'entrega_retiro', label: 'Entrega y Retiro' },
];
const MONEDAS = ['ARS', 'USD', 'EUR', 'BRL', 'USDT'];

interface FormState {
  tipo: string;
  moneda: string;
  monto: string;
  moneda2: string;
  monto2: string;
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
    moneda2: 'ARS',
    monto2: '',
    direccion: '',
    contacto: '',
    telefono: '',
    notas: '',
  });

  const isCombined = form.tipo === 'entrega_retiro';

  const mutation = useMutation({
    mutationFn: () =>
      apiPost('/operations', {
        tipo: form.tipo,
        moneda: form.moneda,
        monto: parseFloat(form.monto),
        ...(isCombined ? { moneda2: form.moneda2, monto2: parseFloat(form.monto2) } : {}),
        direccion: form.direccion,
        contacto: form.contacto,
        telefono: form.telefono || undefined,
        notas: form.notas || undefined,
      }),
    onSuccess: () => {
      invalidateOperationsQueries(qc);
      navigate('../ops');
    },
  });

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const isValid =
    form.monto !== '' &&
    parseFloat(form.monto) > 0 &&
    (!isCombined || (form.monto2 !== '' && parseFloat(form.monto2) > 0)) &&
    form.direccion.length >= 5 &&
    form.contacto.length >= 2;

  const tipoLabel = TIPOS.find((t) => t.value === form.tipo)?.label ?? form.tipo;

  return (
    <>
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

          {isCombined ? (
            <label className="admin-field">
              <span>Tipo</span>
              <div className="admin-input-shell">
                <TruckIcon />
                <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
                  {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <ChevronDownIcon />
              </div>
            </label>
          ) : (
            <div className="admin-form-grid admin-form-grid--two">
              <label className="admin-field">
                <span>Tipo</span>
                <div className="admin-input-shell">
                  <TruckIcon />
                  <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
                    {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
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
          )}

          {isCombined ? (
            <>
              <div className="admin-form-grid admin-form-grid--two">
                <label className="admin-field">
                  <span>Monto de entrega</span>
                  <div className="admin-input-shell admin-input-shell--with-suffix">
                    <CurrencyIcon />
                    <input type="number" value={form.monto} onChange={(e) => set('monto', e.target.value)} placeholder="0" />
                    <span className="admin-suffix">{form.moneda}</span>
                  </div>
                </label>
                <label className="admin-field">
                  <span>Moneda de entrega</span>
                  <div className="admin-input-shell">
                    <CurrencyIcon />
                    <select value={form.moneda} onChange={(e) => set('moneda', e.target.value)}>
                      {MONEDAS.map((m) => <option key={m}>{m}</option>)}
                    </select>
                    <ChevronDownIcon />
                  </div>
                </label>
              </div>

              <div className="admin-form-grid admin-form-grid--two">
                <label className="admin-field">
                  <span>Monto de retiro</span>
                  <div className="admin-input-shell admin-input-shell--with-suffix">
                    <CurrencyIcon />
                    <input type="number" value={form.monto2} onChange={(e) => set('monto2', e.target.value)} placeholder="0" />
                    <span className="admin-suffix">{form.moneda2}</span>
                  </div>
                </label>
                <label className="admin-field">
                  <span>Moneda de retiro</span>
                  <div className="admin-input-shell">
                    <CurrencyIcon />
                    <select value={form.moneda2} onChange={(e) => set('moneda2', e.target.value)}>
                      {MONEDAS.map((m) => <option key={m}>{m}</option>)}
                    </select>
                    <ChevronDownIcon />
                  </div>
                </label>
              </div>
            </>
          ) : (
            <label className="admin-field">
              <span>Monto</span>
              <div className="admin-input-shell admin-input-shell--with-suffix">
                <CurrencyIcon />
                <input type="number" value={form.monto} onChange={(e) => set('monto', e.target.value)} placeholder="0" />
                <span className="admin-suffix">{form.moneda}</span>
              </div>
            </label>
          )}

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
            <div><span><TruckIcon />Tipo</span><strong>{tipoLabel}</strong></div>
            {isCombined ? (
              <>
                <div><span><CurrencyIcon />Monto de entrega</span><strong>{form.monto ? `${form.monto} ${form.moneda}` : '—'}</strong></div>
                <div><span><CurrencyIcon />Monto de retiro</span><strong>{form.monto2 ? `${form.monto2} ${form.moneda2}` : '—'}</strong></div>
              </>
            ) : (
              <>
                <div><span><CurrencyIcon />Moneda</span><strong>{form.moneda}</strong></div>
                <div><span><CurrencyIcon />Monto</span><strong>{form.monto || '—'}</strong></div>
              </>
            )}
            <div><span><PinIcon />Dirección</span><strong>{form.direccion || '—'}</strong></div>
            <div><span><UserIcon />Contacto</span><strong>{form.contacto || '—'}</strong></div>
            <div><span><PhoneIcon />Teléfono</span><strong>{form.telefono || '—'}</strong></div>
            <div><span><ClipboardIcon />Notas</span><strong>{form.notas || '—'}</strong></div>
          </div>
        </aside>
      </section>
    </>
  );
}
