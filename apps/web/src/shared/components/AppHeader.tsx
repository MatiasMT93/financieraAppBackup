import { LogOut, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth-store.ts';
import { apiPost } from '../api/client.ts';
import { disconnectSocket } from '../api/socket.ts';

interface Props {
  title: string;
  color: string;
  subtitle?: string;
  onBack?: () => void;
}

export default function AppHeader({ title, color, subtitle, onBack }: Props) {
  const { clearAuth, refreshToken } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleLogout() {
    try {
      if (refreshToken) await apiPost('/auth/logout', { refreshToken });
    } finally {
      // Cortar el socket (sigue conectado con el token viejo si no), limpiar la
      // cache de datos del usuario anterior y recién ahí borrar la sesión y
      // navegar al login.
      disconnectSocket();
      queryClient.clear();
      clearAuth();
      navigate('/login', { replace: true });
    }
  }

  return (
    <header
      className="flex items-center justify-between px-4 py-3 text-white safe-area-pt"
      style={{ backgroundColor: color }}
    >
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg" />
        <div>
          <span className="font-bold text-base">{title}</span>
          {subtitle && <p className="text-xs opacity-80">{subtitle}</p>}
        </div>
      </div>
      {onBack ? (
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-medium hover:opacity-80 transition-opacity"
        >
          <ArrowLeft size={18} />
          Volver
        </button>
      ) : (
        <button onClick={handleLogout} className="p-1 hover:opacity-80 transition-opacity">
          <LogOut size={20} />
        </button>
      )}
    </header>
  );
}
