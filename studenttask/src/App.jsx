import { Routes, Route, Navigate } from 'react-router-dom';
import { getSession, isAuthenticated } from './services/authService';
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
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminModulePage from './pages/admin/AdminModulePage';
import AdminProfile from './pages/admin/AdminProfile';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminUserForm from './pages/admin/AdminUserForm';
import AdminUsers from './pages/admin/AdminUsers';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherGroupDetail from './pages/teacher/TeacherGroupDetail';
import TeacherGroups from './pages/teacher/TeacherGroups';
import TeacherProfile from './pages/teacher/TeacherProfile';
import TeacherReports from './pages/teacher/TeacherReports';
import TeacherSubjects from './pages/teacher/TeacherSubjects';
import TeacherTaskCreate from './pages/teacher/TeacherTaskCreate';
import TeacherTaskDetail from './pages/teacher/TeacherTaskDetail';
import TeacherTaskEdit from './pages/teacher/TeacherTaskEdit';
import TeacherTaskTracking from './pages/teacher/TeacherTaskTracking';
import TeacherTasks from './pages/teacher/TeacherTasks';
import TeacherTracking from './pages/teacher/TeacherTracking';
import ProtectedRoute from './components/ProtectedRoute';

const adminModules = {
  usuarios: {
    title: 'Gestión de usuarios',
    description: 'Administra las cuentas registradas en el sistema.',
  },
  alumnos: {
    title: 'Gestión de alumnos',
    description: 'Consulta y prepara la administración de perfiles estudiantiles.',
  },
  docentes: {
    title: 'Gestión de docentes',
    description: 'Consulta y prepara la administración del personal docente.',
  },
  grupos: {
    title: 'Gestión de grupos',
    description: 'Organiza la base para administrar grupos académicos.',
  },
  materias: {
    title: 'Gestión de materias',
    description: 'Prepara el catálogo administrativo de materias.',
  },
  asignaciones: {
    title: 'Asignaciones',
    description: 'Prepara la gestión docente-grupo-materia.',
  },
};

function HomeRedirect() {
  return <Navigate to={isAuthenticated() ? getDefaultPrivateRoute(getSession()?.rol) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />

      <Route element={<ProtectedRoute allowedRoles={['alumno', 'estudiante']} />}>
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

      <Route element={<ProtectedRoute allowedRoles={['docente']} />}>
        <Route path="/docente/dashboard" element={<TeacherDashboard />} />
        <Route path="/docente/grupos" element={<TeacherGroups />} />
        <Route path="/docente/grupos/:id" element={<TeacherGroupDetail />} />
        <Route path="/docente/materias" element={<TeacherSubjects />} />
        <Route path="/docente/tareas" element={<TeacherTasks />} />
        <Route path="/docente/tareas/nueva" element={<TeacherTaskCreate />} />
        <Route path="/docente/seguimiento" element={<TeacherTracking />} />
        <Route path="/docente/reportes" element={<TeacherReports />} />
        <Route path="/docente/reportes/grupos" element={<TeacherReports />} />
        <Route path="/docente/reportes/materias" element={<TeacherReports />} />
        <Route path="/docente/reportes/alumnos" element={<TeacherReports />} />
        <Route path="/docente/reportes/tareas" element={<TeacherReports />} />
        <Route path="/docente/tareas/:id" element={<TeacherTaskDetail />} />
        <Route path="/docente/tareas/:id/editar" element={<TeacherTaskEdit />} />
        <Route path="/docente/tareas/:id/seguimiento" element={<TeacherTaskTracking />} />
        <Route path="/docente/perfil" element={<TeacherProfile />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['administrador', 'admin']} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/usuarios" element={<AdminUsers />} />
        <Route path="/admin/usuarios/nuevo" element={<AdminUserForm mode="create" />} />
        <Route path="/admin/usuarios/:id" element={<AdminUserDetail />} />
        <Route path="/admin/usuarios/:id/editar" element={<AdminUserForm mode="edit" />} />
        <Route
          path="/admin/alumnos"
          element={<AdminModulePage {...adminModules.alumnos} route="/admin/alumnos" />}
        />
        <Route
          path="/admin/docentes"
          element={<AdminModulePage {...adminModules.docentes} route="/admin/docentes" />}
        />
        <Route
          path="/admin/grupos"
          element={<AdminModulePage {...adminModules.grupos} route="/admin/grupos" />}
        />
        <Route
          path="/admin/materias"
          element={<AdminModulePage {...adminModules.materias} route="/admin/materias" />}
        />
        <Route
          path="/admin/asignaciones"
          element={<AdminModulePage {...adminModules.asignaciones} route="/admin/asignaciones" />}
        />
        <Route path="/admin/perfil" element={<AdminProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
