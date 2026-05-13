import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { clearSession, getSession, isAuthenticated } from '../services/authService';
import { getDefaultPrivateRoute } from '../services/settingsService';
import { isKnownRole, roleMatches } from '../utils/roles';

export default function ProtectedRoute({ allowedRoles = [] }) {
  const location = useLocation();
  const session = getSession();

  if (!session || !isAuthenticated()) {
    if (session && !isKnownRole(session?.rol)) {
      clearSession();
      return (
        <Navigate
          to="/login"
          replace
          state={{ message: 'Tu sesión no tiene un rol válido. Inicia sesión nuevamente.' }}
        />
      );
    }

    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isKnownRole(session?.rol)) {
    clearSession();
    return (
      <Navigate
        to="/login"
        replace
        state={{ message: 'Tu sesión no tiene un rol válido. Inicia sesión nuevamente.' }}
      />
    );
  }

  if (!roleMatches(session?.rol, allowedRoles)) {
    return (
      <Navigate
        to={getDefaultPrivateRoute(session?.rol)}
        replace
        state={{ message: 'No tienes permiso para acceder a esta sección.' }}
      />
    );
  }

  return <Outlet />;
}
