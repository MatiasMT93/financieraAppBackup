import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeSync } from '../../shared/hooks/use-socket.ts';
import { useAuthStore } from '../../shared/store/auth-store.ts';
import { apiPost } from '../../shared/api/client.ts';
import { PullToRefresh } from '../../shared/components/PullToRefresh.tsx';
import { BrandMark } from '../../shared/components/BrandMark.tsx';
import { BackIcon, ClipboardIcon, PlusIcon } from './components/AdminIcons.tsx';
import OpsAdminTab from './tabs/OpsAdminTab.tsx';
import NuevaOpTab from './tabs/NuevaOpTab.tsx';
import './AdministrativoShell.css';

export default function AdministrativoShell({ onBack }: { onBack?: () => void }) {
  useRealtimeSync();
  const { clearAuth, refreshToken } = useAuthStore();
  const queryClient = useQueryClient();

  async function handleLogout() {
    try {
      if (refreshToken) await apiPost('/auth/logout', { refreshToken });
    } finally {
      clearAuth();
    }
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div className="admin-brand">
          <BrandMark size={48} />
          <span>CambioApp</span>
        </div>

        {onBack ? (
          <button type="button" className="admin-back-button" onClick={onBack}>
            <BackIcon />
            <span>Volver</span>
          </button>
        ) : (
          <button type="button" className="admin-back-button" onClick={handleLogout}>
            <BackIcon />
            <span>Salir</span>
          </button>
        )}
      </header>

      <PullToRefresh
        className="admin-content"
        onRefresh={() => queryClient.refetchQueries()}
      >
        <Routes>
          <Route path="/" element={<Navigate to="ops" replace />} />
          <Route path="ops" element={<OpsAdminTab />} />
          <Route path="nueva" element={<NuevaOpTab />} />
        </Routes>
      </PullToRefresh>

      <nav className="admin-bottom-nav" aria-label="Pestañas de administrador">
        <NavLink to="ops" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          <ClipboardIcon />
          <span>Ops.</span>
        </NavLink>
        <NavLink to="nueva" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          <PlusIcon />
          <span>Nueva</span>
        </NavLink>
      </nav>
    </main>
  );
}
