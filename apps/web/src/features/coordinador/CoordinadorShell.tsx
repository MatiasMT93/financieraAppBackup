import { Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../shared/store/auth-store.ts';
import { apiPost } from '../../shared/api/client.ts';
import { disconnectSocket } from '../../shared/api/socket.ts';
import { useRealtimeSync } from '../../shared/hooks/use-socket.ts';
import { PullToRefresh } from '../../shared/components/PullToRefresh.tsx';
import { BrandMark } from '../../shared/components/BrandMark.tsx';
import { BackIcon, OpsIcon, MapIcon, UsersIcon, HistoryIcon, AlertIcon, UserCogIcon, MoneyIcon } from './components/CoordIcons.tsx';
import OpsTab from './tabs/OpsTab.tsx';
import MapaTab from './tabs/MapaTab.tsx';
import CadetesTab from './tabs/CadetesTab.tsx';
import HistorialTab from './tabs/HistorialTab.tsx';
import AlertasTab from './tabs/AlertasTab.tsx';
import GestionCadetesTab from './tabs/GestionCadetesTab.tsx';
import CajaTab from './tabs/CajaTab.tsx';
import './CoordinadorShell.css';

const tabs = [
  { path: 'ops', label: 'Operaciones', Icon: OpsIcon },
  { path: 'mapa', label: 'Mapa', Icon: MapIcon },
  { path: 'usuarios', label: 'Usuarios', Icon: UserCogIcon },
  { path: 'cadetes', label: 'Cadetes', Icon: UsersIcon },
  { path: 'caja', label: 'Caja', Icon: MoneyIcon },
  { path: 'historial', label: 'Historial', Icon: HistoryIcon },
  { path: 'caja', label: 'Caja', Icon: MoneyIcon },
  { path: 'alertas', label: 'Alertas', Icon: AlertIcon },
];

export default function CoordinadorShell({ onBack }: { onBack?: () => void }) {
  useRealtimeSync();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clearAuth, refreshToken } = useAuthStore();

  const todayLabel = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date());

  const currentTab = tabs.find((t) => location.pathname.includes(t.path));

  async function handleLogout() {
    try {
      if (refreshToken) await apiPost('/auth/logout', { refreshToken });
    } finally {
      disconnectSocket();
      queryClient.clear();
      clearAuth();
      navigate('/login', { replace: true });
    }
  }

  return (
    <main className="coordinator-shell">
      <header className="coordinator-header">
        <div className="coordinator-header__brand">
          <BrandMark size={56} />
          <span className="coordinator-header__name">Plaza App</span>
          <span className="coordinator-header__divider" aria-hidden="true" />
          <div className="coordinator-header__title-group">
            <h1>{currentTab?.label ?? 'Operaciones'}</h1>
            <p>{todayLabel}</p>
          </div>
        </div>

        {onBack ? (
          <button type="button" className="coord-back-button" onClick={onBack}>
            <BackIcon />
            <span>Volver</span>
          </button>
        ) : (
          <button type="button" className="coord-back-button" onClick={handleLogout}>
            <BackIcon />
            <span>Salir</span>
          </button>
        )}
      </header>

      <PullToRefresh
        className="coordinator-content"
        onRefresh={() => queryClient.refetchQueries()}
      >
        <Routes>
          <Route path="/" element={<Navigate to="ops" replace />} />
          <Route path="ops" element={<OpsTab />} />
          <Route path="mapa" element={<MapaTab />} />
          <Route path="cadetes" element={<CadetesTab />} />
          <Route path="historial" element={<HistorialTab />} />
          <Route path="caja" element={<CajaTab />} />
          <Route path="alertas" element={<AlertasTab />} />
          <Route path="usuarios" element={<GestionCadetesTab />} />
        </Routes>
      </PullToRefresh>

      <nav className="coordinator-bottom-nav" aria-label="Pestañas de coordinador">
        {tabs.map(({ path, label, Icon }) => (
          <NavLink key={path} to={path} className={({ isActive }) => (isActive ? 'is-active' : '')}>
            <span className="coordinator-bottom-nav__icon"><Icon /></span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </main>
  );
}
