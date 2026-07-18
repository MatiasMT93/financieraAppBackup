import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../shared/api/client.ts';
import CoordBadge from '../components/CoordBadge.tsx';
import { UsersIcon } from '../components/CoordIcons.tsx';
import type { User, CadeteStatus } from '@cambioapp/shared-types';

export default function CadetesTab() {
  const { data: cadetes = [], isLoading } = useQuery({
    queryKey: ['cadetes'],
    queryFn: () => apiGet<User[]>('/users?role=cadete'),
    refetchInterval: 20_000,
  });

  if (isLoading) return <div className="coord-empty-panel coord-empty-panel--compact"><p>Cargando…</p></div>;

  return (
    <>
      <article className="coord-summary-chip">
        <span className="coord-summary-chip__icon"><UsersIcon /></span>
        <span className="coord-summary-chip__value">{cadetes.length}</span>
        <span className="coord-summary-chip__label">cadetes</span>
      </article>

      <div className="coord-stack-list">
        {cadetes.map((c) => (
          <article key={c.id} className="coord-cadet-card">
            <span className="coord-avatar is-gold">{c.nombre[0]}</span>
            <div className="coord-cadet-card__copy">
              <h3>{c.nombre}</h3>
              <p>Cadete</p>
            </div>
            <CoordBadge status={(c.cadeteStatus ?? 'disponible') as CadeteStatus} />
          </article>
        ))}
      </div>
    </>
  );
}
