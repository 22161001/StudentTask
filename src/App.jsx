import { Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './services/authService';
import { getDefaultPrivateRoute } from './services/settingsService';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Subjects from './pages/Subjects';
import Tasks from './pages/Tasks';
import Agenda from './pages/Agenda';
import AssignedTasks from './pages/AssignedTasks';
import Reports from './pages/Reports';
import AcademicTracking from './pages/AcademicTracking';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import ProtectedRoute from './components/ProtectedRoute';

function HomeRedirect() {
  return <Navigate to={isAuthenticated() ? getDefaultPrivateRoute() : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/materias" element={<Subjects />} />
        <Route path="/tareas" element={<Tasks />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/tareas-asignadas" element={<AssignedTasks />} />
        <Route path="/reportes" element={<Reports />} />
        <Route path="/seguimiento" element={<AcademicTracking />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="/configuracion" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
