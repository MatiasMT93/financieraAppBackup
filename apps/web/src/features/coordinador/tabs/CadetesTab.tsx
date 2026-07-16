import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../shared/api/client.ts';
import StatusBadge from '../../../shared/components/StatusBadge.tsx';
import type { User, CadeteStatus } from '@cambioapp/shared-types';

export default function CadetesTab() {
  const { data: cadetes = [], isLoading } = useQuery({
    queryKey: ['cadetes'],
    queryFn: () => apiGet<User[]>('/users?role=cadete'),
    refetchInterval: 20_000,
  });

  if (isLoading) return <div className="p-4 text-center text-gray-500">Cargando...</div>;

  return (
    <div className="p-4 space-y-3">
      <p className="text-sm text-gray-500">{cadetes.length} cadetes</p>
      {cadetes.map((c) => (
        <div key={c.id} className="card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-coordinador text-white flex items-center justify-center font-bold">
              {c.nombre[0]}
            </div>
            <div>
              <p className="font-medium text-gray-900">{c.nombre}</p>
              <p className="text-xs text-gray-400">Cadete</p>
            </div>
          </div>
          <StatusBadge status={(c.cadeteStatus ?? 'disponible') as CadeteStatus} />
        </div>
      ))}
    </div>
  );
}
