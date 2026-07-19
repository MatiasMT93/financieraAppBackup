import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../../../shared/api/client.ts';
import { invalidateOperationsQueries } from '../../../shared/utils/invalidate-operations.ts';
import {
  PlusIcon, EyeIcon, ClipboardIcon, TruckIcon, CurrencyIcon,
  PinIcon, UserIcon, PhoneIcon, ChevronDownIcon, BoxIllustration,
  SearchIcon, CounterIcon, CheckCircleIcon, CloseIcon,
} from '../components/AdminIcons.tsx';
import ClientFormModal from '../components/ClientFormModal.tsx';
import type { Client } from '@cambioapp/shared-types';

const TIPOS: Array<{ value: string; label: string }> = [
  { value: 'entrega', label: 'Entrega' },
  { value: 'retiro', label: 'Retiro' },
  { value: 'entrega_retiro', label: 'Entrega y Retiro' },
];
const MONEDAS = ['ARS', 'USD', 'EUR', 'BRL', 'USDT'];

const MODALIDADES: Array<{ value: 'domicilio' | 'ventanilla'; label: string; desc: string; Icon: typeof TruckIcon }> = [
  { value: 'domicilio', label: 'A domicilio', desc: 'Va un cadete a la dirección', Icon: TruckIcon },
  { value: 'ventanilla', label: 'Ventanilla', desc: 'El cliente viene a la oficina', Icon: CounterIcon },
];

interface FormState {
  tipo: string;
  moneda: string;
  monto: string;
  moneda2: string;
  monto2: string;
  modalidad: 'domicilio' | 'ventanilla';
  direccion: string;
  contacto: string;
  telefono: string;
  notas: string;
  clientId: string;
}

export default function NuevaOpTab() {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  // Al venir del botón "Nueva op" de un cliente en la pestaña Clientes.
  const prefillClientId = (location.state as { clientId?: string } | null)?.clientId;

  const [form, setForm] = useState<FormState>({
    tipo: 'entrega',
    moneda: 'ARS',
    monto: '',
    moneda2: 'ARS',
    monto2: '',
    modalidad: 'domicilio',
    direccion: '',
    contacto: '',
    telefono: '',
    notas: '',
    clientId: '',
  });
  const [clientQuery, setClientQuery] = useState('');
  const [showClientResults, setShowClientResults] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  const isCombined = form.tipo === 'entrega_retiro';
  const isVentanilla = form.modalidad === 'ventanilla';

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiGet<{ clients: Client[] }>('/clients'),
  });
  const clients = clientsData?.clients ?? [];

  const clientResults = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients.slice(0, 4);
    return clients
      .filter((c) => c.nombre.toLowerCase().includes(q) || (c.telefono ?? '').includes(q))
      .slice(0, 8);
  }, [clients, clientQuery]);

  const quickAccessClients = clients.slice(0, 4);
  const selectedClient = clients.find((c) => c.id === form.clientId) ?? null;

  function selectClient(client: Client) {
    setForm((prev) => ({
      ...prev,
      clientId: client.id,
      contacto: client.nombre,
      telefono: client.telefono ?? prev.telefono,
      direccion: client.direccion ?? prev.direccion,
    }));
    setClientQuery('');
    setShowClientResults(false);
  }

  function clearClient() {
    setForm((prev) => ({ ...prev, clientId: '', contacto: '', telefono: '', direccion: '' }));
  }

  useEffect(() => {
    if (!prefillClientId || form.clientId) return;
    const client = clients.find((c) => c.id === prefillClientId);
    if (client) selectClient(client);
  }, [prefillClientId, clients]);

  const mutation = useMutation({
    mutationFn: () =>
      apiPost('/operations', {
        tipo: form.tipo,
        moneda: form.moneda,
        monto: parseFloat(form.monto),
        ...(isCombined ? { moneda2: form.moneda2, monto2: parseFloat(form.monto2) } : {}),
        modalidad: form.modalidad,
        direccion: isVentanilla ? undefined : form.direccion,
        contacto: form.contacto,
        telefono: form.telefono || undefined,
        notas: form.notas || undefined,
        clientId: form.clientId || undefined,
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
    (isVentanilla || form.direccion.length >= 5) &&
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

          <div className="admin-field">
            <span>Modalidad de entrega</span>
            <div className="admin-modalidad-grid">
              {MODALIDADES.map(({ value, label, desc, Icon }) => (
                <button
                  key={value}
                  type="button"
                  className={`admin-modalidad-card ${form.modalidad === value ? 'is-selected' : ''}`}
                  onClick={() => set('modalidad', value)}
                >
                  <span className="admin-modalidad-card__icon"><Icon /></span>
                  <span className="admin-modalidad-card__copy">
                    <strong>{label}</strong>
                    <small>{desc}</small>
                  </span>
                  {form.modalidad === value && <CheckCircleIcon />}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-field">
            <span>Cliente</span>
            {selectedClient ? (
              <div className="admin-selected-client">
                <UserIcon />
                <div>
                  <strong>{selectedClient.nombre}</strong>
                  {selectedClient.telefono && <small>{selectedClient.telefono}</small>}
                </div>
                <button type="button" onClick={clearClient}><CloseIcon /></button>
              </div>
            ) : (
              <>
                <div className="admin-client-search">
                  <div className="admin-input-shell">
                    <SearchIcon />
                    <input
                      value={clientQuery}
                      onChange={(e) => { setClientQuery(e.target.value); setShowClientResults(true); }}
                      onFocus={() => setShowClientResults(true)}
                      onBlur={() => setTimeout(() => setShowClientResults(false), 150)}
                      placeholder="Buscar cliente por nombre o teléfono..."
                    />
                  </div>
                  <button type="button" className="admin-secondary-button" onClick={() => setShowNewClientModal(true)}>
                    <PlusIcon />Nuevo cliente
                  </button>
                </div>

                {showClientResults && clientResults.length > 0 && (
                  <div className="admin-client-results">
                    {clientResults.map((c) => (
                      <button key={c.id} type="button" onClick={() => selectClient(c)}>
                        <UserIcon />
                        <span>
                          <strong>{c.nombre}</strong>
                          {c.telefono && <small>{c.telefono}</small>}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {!clientQuery && quickAccessClients.length > 0 && (
                  <div className="admin-client-quick">
                    <span>Acceso rápido</span>
                    <div className="admin-client-quick__chips">
                      {quickAccessClients.map((c) => (
                        <button key={c.id} type="button" onClick={() => selectClient(c)}>
                          <UserIcon />{c.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {!isVentanilla && (
            <label className="admin-field">
              <span>Dirección</span>
              <div className="admin-input-shell">
                <PinIcon />
                <input value={form.direccion} onChange={(e) => set('direccion', e.target.value)} placeholder="Calle y número" />
              </div>
            </label>
          )}

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
            <div><span><CounterIcon />Modalidad</span><strong>{isVentanilla ? 'Ventanilla' : 'A domicilio'}</strong></div>
            {!isVentanilla && (
              <div><span><PinIcon />Dirección</span><strong>{form.direccion || '—'}</strong></div>
            )}
            <div><span><UserIcon />Contacto</span><strong>{form.contacto || '—'}</strong></div>
            <div><span><PhoneIcon />Teléfono</span><strong>{form.telefono || '—'}</strong></div>
            <div><span><ClipboardIcon />Notas</span><strong>{form.notas || '—'}</strong></div>
          </div>
        </aside>
      </section>

      {showNewClientModal && (
        <ClientFormModal
          onClose={() => setShowNewClientModal(false)}
          onSaved={(client) => {
            selectClient(client);
            setShowNewClientModal(false);
          }}
        />
      )}
    </>
  );
}
