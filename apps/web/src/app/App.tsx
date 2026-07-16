import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../shared/store/auth-store.ts';
import LoginPage from '../shared/pages/LoginPage.tsx';
import CoordinadorShell from '../features/coordinador/CoordinadorShell.tsx';
import AdministrativoShell from '../features/administrativo/AdministrativoShell.tsx';
import DuenoShell from '../features/dueno/DuenoShell.tsx';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RoleRouter() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'coordinador':  return <Navigate to="/coordinador" replace />;
    case 'administrativo': return <Navigate to="/administrativo" replace />;
    case 'dueno':        return <Navigate to="/dueno" replace />;
    default:             return <Navigate to="/login" replace />;
  }
}

function DuenoCoordMode() {
  const navigate = useNavigate();
  return <CoordinadorShell onBack={() => navigate('/dueno')} />;
}

function DuenoAdminMode() {
  const navigate = useNavigate();
  return <AdministrativoShell onBack={() => navigate('/dueno')} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RoleRouter />} />

        <Route path="/coordinador/*" element={
          <ProtectedRoute roles={['coordinador']}>
            <CoordinadorShell />
          </ProtectedRoute>
        } />

        <Route path="/administrativo/*" element={
          <ProtectedRoute roles={['administrativo']}>
            <AdministrativoShell />
          </ProtectedRoute>
        } />

        <Route path="/dueno/coord/*" element={
          <ProtectedRoute roles={['dueno']}>
            <DuenoCoordMode />
          </ProtectedRoute>
        } />

        <Route path="/dueno/admin/*" element={
          <ProtectedRoute roles={['dueno']}>
            <DuenoAdminMode />
          </ProtectedRoute>
        } />

        <Route path="/dueno/*" element={
          <ProtectedRoute roles={['dueno']}>
            <DuenoShell />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
