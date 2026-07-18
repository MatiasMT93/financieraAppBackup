import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone } from 'lucide-react';
import { apiGet } from '../../../shared/api/client.ts';
import CoordBadge from '../components/CoordBadge.tsx';
import CoordDatePicker from '../components/CoordDatePicker.tsx';
import { CalendarIcon, PinIcon, SearchIcon, SearchDocIcon, UsersIcon } from '../components/CoordIcons.tsx';
import type { Operation } from '@cambioapp/shared-types';
import { formatDateTime } from '../../../shared/utils/format-time.ts';

const FILTERS = [
  { label: 'Todas', value: '' },
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'Asignadas', value: 'asignada' },
  { label: 'En curso', value: 'en_camino,en_destino,volviendo' },
  { label: 'Cerradas', value: 'cerrada' },
  { label: 'Canceladas', value: 'cancelada' },
  { label: 'Incidencias', value: 'incidencia' },
];

function currencySymbol(moneda: string) {
  return moneda === 'ARS' ? '$' : moneda === 'USD' ? 'U$' : moneda === 'EUR' ? '€' : moneda === 'BRL' ? 'R$' : '₮';
}

export default function HistorialTab() {
  const [date, setDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }),
  );
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // No filtramos por status en el pedido al backend: el historial muestra
  // todas las operaciones del día (cerradas, canceladas, en curso). El badge
  // ya muestra el estado de cada una; el filtro de tipo/estado es local.
  const { data: ops = [], isLoading } = useQuery({
    queryKey: ['operations-historial', date],
    queryFn: () => apiGet<Operation[]>('/operations', { date }),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ops.filter((op) => {
      if (filter && !filter.split(',').includes(op.status)) return false;
      if (!q) return true;
      return (
        op.id.toLowerCase().includes(q) ||
        op.direccion.toLowerCase().includes(q) ||
        op.contacto.toLowerCase().includes(q)
      );
    });
  }, [ops, query, filter]);

  const selected = filtered.find((op) => op.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="coord-history-layout">
      <section className="coord-history-list">
        <label className="coord-date-box">
          Fecha
          <CoordDatePicker id="history-date" value={date} onChange={setDate} />
        </label>

        <div className="coord-history-search">
          <label>
            <SearchIcon />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por ID, dirección, contacto…" />
          </label>
          <div>
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={filter === f.value ? 'is-active' : ''}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="coord-history-rows">
          {isLoading && <p style={{ textAlign: 'center', color: '#c0c6d0' }}>Buscando…</p>}
          {!isLoading && <h3>{filtered.length} operaciones encontradas</h3>}
          {!isLoading && filtered.length === 0 && (
            <section className="coord-empty-panel coord-empty-panel--compact">
              <div className="coord-empty-panel__icon"><SearchDocIcon /></div>
              <h3>Sin operaciones</h3>
              <p>No se encontraron operaciones para el {date}.</p>
            </section>
          )}
          {filtered.map((op) => (
            <button
              key={op.id}
              type="button"
              className={selected?.id === op.id ? 'is-selected' : ''}
              onClick={() => setSelectedId(op.id)}
            >
              <span className="coord-history-icon"><CalendarIcon /></span>
              <span><strong>#{op.id.slice(-3).toUpperCase()}</strong><small>{op.tipo === 'entrega' ? 'Entrega' : 'Retiro'}</small></span>
              <span><strong>{currencySymbol(op.moneda)} {Number(op.monto).toLocaleString('es-AR')}</strong><small>{op.moneda}</small></span>
              <span>{formatDateTime(op.createdAt)}</span>
              <CoordBadge status={op.status} />
            </button>
          ))}
        </div>
      </section>

      <aside className="coord-history-detail">
        {selected ? (
          <>
            <div className="coord-history-detail__head">
              <span className="coord-history-icon coord-history-icon--lg"><CalendarIcon /></span>
              <div>
                <h2>#{selected.id.slice(-3).toUpperCase()}</h2>
                <p>{selected.tipo === 'entrega' ? 'Entrega' : 'Retiro'}</p>
              </div>
              <CoordBadge status={selected.status} />
            </div>

            <div className="coord-history-detail__grid">
              <div><span>Monto</span><strong>{currencySymbol(selected.moneda)} {Number(selected.monto).toLocaleString('es-AR')}</strong></div>
              <div><span>Moneda</span><strong>{selected.moneda}</strong></div>
              <div><span>Fecha y hora</span><strong>{formatDateTime(selected.createdAt)}</strong></div>
              <div>
                <span>Contacto</span>
                <strong>{selected.contacto}</strong>
                {selected.telefono && <small><Phone size={13} /> {selected.telefono}</small>}
              </div>
              <div>
                <span>Dirección</span>
                <strong>{selected.direccion}</strong>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.direccion)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <PinIcon />Ver en Google Maps ↗
                </a>
              </div>
              <div>
                <span>Cadete</span>
                <strong>{selected.cadete?.nombre ?? 'Sin asignar'}</strong>
              </div>
            </div>

            {selected.notas && (
              <div className="coord-history-note">
                <span>Notas</span>
                <p>{selected.notas}</p>
              </div>
            )}
          </>
        ) : (
          <div className="coord-empty-panel coord-empty-panel--compact">
            <div className="coord-empty-panel__icon"><UsersIcon /></div>
            <p>Elegí una operación para ver el detalle</p>
          </div>
        )}
      </aside>
    </div>
  );
}
