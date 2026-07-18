import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../shared/api/client.ts';
import CoordBadge from '../components/CoordBadge.tsx';
import { CalendarIcon, PinIcon, SearchDocIcon } from '../components/CoordIcons.tsx';
import type { Operation } from '@cambioapp/shared-types';
import { formatDateTime } from '../../../shared/utils/format-time.ts';

export default function HistorialTab() {
  const [date, setDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }),
  );

  // No filtramos por status: el historial muestra todas las operaciones del
  // día (cerradas, canceladas, e incluso las que siguen en curso). Si filtraba
  // solo por 'cerrada', días con operaciones en curso o canceladas aparecían
  // vacíos. El badge ya muestra el estado de cada una.
  const { data: ops = [], isLoading } = useQuery({
    queryKey: ['operations-historial', date],
    queryFn: () => apiGet<Operation[]>('/operations', { date }),
  });

  return (
    <>
      <section className="coord-date-filter">
        <label htmlFor="history-date">Fecha</label>
        <div className="coord-date-input">
          <input id="history-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <CalendarIcon />
        </div>
      </section>

      {isLoading && <p style={{ textAlign: 'center', color: '#c0c6d0' }}>Buscando…</p>}

      <div className="coord-stack-list">
        {ops.length === 0 && !isLoading && (
          <section className="coord-empty-panel">
            <div className="coord-empty-panel__icon"><SearchDocIcon /></div>
            <h3>Sin operaciones para esta fecha</h3>
            <p>No se encontraron operaciones registradas para el {date}.</p>
            <span className="coord-empty-panel__ornament" aria-hidden="true" />
          </section>
        )}
        {ops.map((op) => (
          <article key={op.id} className="coord-operation-card">
            <div className="coord-operation-card__main" style={{ gridTemplateColumns: '1fr' }}>
              <div className="coord-operation-card__body">
                <div className="coord-operation-card__row coord-operation-card__row--top">
                  <h3>#{op.id.slice(-3).toUpperCase()}</h3>
                  <CoordBadge status={op.status} />
                </div>
                <div className="coord-operation-card__meta"><CalendarIcon />{formatDateTime(op.createdAt)}</div>
                <div className="coord-operation-card__meta"><PinIcon />{op.direccion}</div>
                <div className="coord-operation-card__amount">
                  <span>{op.tipo === 'entrega' ? 'Entregar' : 'Recibir'} {op.moneda} {Number(op.monto).toLocaleString('es-AR')}</span>
                </div>
                {op.cadete && <div className="coord-operation-card__meta">Cadete: {op.cadete.nombre}</div>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
