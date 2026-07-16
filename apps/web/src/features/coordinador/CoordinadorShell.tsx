import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { ClipboardList, Map, Users, Clock, AlertTriangle, UserCog } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import AppHeader from '../../shared/components/AppHeader.tsx';
import { useRealtimeSync } from '../../shared/hooks/use-socket.ts';
import { PullToRefresh } from '../../shared/components/PullToRefresh.tsx';
import OpsTab from './tabs/OpsTab.tsx';
import MapaTab from './tabs/MapaTab.tsx';
import CadetesTab from './tabs/CadetesTab.tsx';
import HistorialTab from './tabs/HistorialTab.tsx';
import AlertasTab from './tabs/AlertasTab.tsx';
import GestionCadetesTab from './tabs/GestionCadetesTab.tsx';

const tabs = [
  { path: 'ops', label: 'Ops.', Icon: ClipboardList },
  { path: 'mapa', label: 'Mapa', Icon: Map },
  { path: 'cadetes', label: 'Cadetes', Icon: Users },
  { path: 'historial', label: 'Historial', Icon: Clock },
  { path: 'alertas', label: 'Alertas', Icon: AlertTriangle },
  { path: 'usuarios', label: 'Usuarios', Icon: UserCog },
];

export default function CoordinadorShell({ onBack }: { onBack?: () => void }) {
  useRealtimeSync();
  const location = useLocation();
  const queryClient = useQueryClient();

  const todayLabel = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date());

  const currentTab = tabs.find((t) => location.pathname.includes(t.path));

  return (
    <div className="flex flex-col h-viewport bg-gray-50">
      <AppHeader title={currentTab?.label ?? 'CambioApp'} color="#185FA5" subtitle={todayLabel} onBack={onBack} />

      <PullToRefresh
        className="flex-1 overflow-y-auto"
        onRefresh={() => queryClient.refetchQueries()}
      >
        <Routes>
          <Route path="/" element={<Navigate to="ops" replace />} />
          <Route path="ops" element={<OpsTab />} />
          <Route path="mapa" element={<MapaTab />} />
          <Route path="cadetes" element={<CadetesTab />} />
          <Route path="historial" element={<HistorialTab />} />
          <Route path="alertas" element={<AlertasTab />} />
          <Route path="usuarios" element={<GestionCadetesTab />} />
        </Routes>
      </PullToRefresh>

      <nav className="bg-white border-t border-gray-200 safe-area-pb">
        <div className="flex">
          {tabs.map(({ path, label, Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                  isActive ? 'text-coordinador' : 'text-gray-500'
                }`
              }
            >
              <Icon size={22} />
              <span className="mt-0.5">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
