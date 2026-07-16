import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { ClipboardList, Plus, Search, LogOut, ArrowLeft } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeSync } from '../../shared/hooks/use-socket.ts';
import { useAuthStore } from '../../shared/store/auth-store.ts';
import { apiPost } from '../../shared/api/client.ts';
import { PullToRefresh } from '../../shared/components/PullToRefresh.tsx';
import OpsAdminTab from './tabs/OpsAdminTab.tsx';
import NuevaOpTab from './tabs/NuevaOpTab.tsx';

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
    <div className="flex flex-col h-viewport bg-gray-100">
      <header className="bg-administrativo px-4 py-3 flex items-center gap-3 safe-area-pt">
        <div className="flex items-center gap-2 shrink-0">
          <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg" />
          <span className="text-white font-bold text-base hidden sm:inline">CambioApp</span>
        </div>

        <div className="flex-1 relative min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
          />
        </div>

        {onBack ? (
          <button
            onClick={onBack}
            className="shrink-0 flex items-center gap-1.5 text-white text-sm font-medium hover:opacity-80 transition-opacity"
          >
            <ArrowLeft size={18} />
            <span>Volver</span>
          </button>
        ) : (
          <button
            onClick={handleLogout}
            className="shrink-0 flex items-center gap-1.5 text-white text-sm font-medium hover:opacity-80 transition-opacity"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        )}
      </header>

      <PullToRefresh
        className="flex-1 overflow-y-auto"
        onRefresh={() => queryClient.refetchQueries()}
      >
        <Routes>
          <Route path="/" element={<Navigate to="ops" replace />} />
          <Route path="ops" element={<OpsAdminTab />} />
          <Route path="nueva" element={<NuevaOpTab />} />
        </Routes>
      </PullToRefresh>

      <nav className="bg-white border-t border-gray-200 safe-area-pb">
        <div className="flex">
          {[
            { path: 'ops', label: 'Ops.', Icon: ClipboardList },
            { path: 'nueva', label: 'Nueva', Icon: Plus },
          ].map(({ path, label, Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                  isActive ? 'text-administrativo' : 'text-gray-500'
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
